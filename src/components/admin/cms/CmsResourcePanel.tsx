"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CMS_RESOURCES, type CmsResourceDef, type CmsResourceId, type FieldDef } from "@/lib/admin/cms/schema";
import type { AdminPermission } from "@/lib/admin/permissions";
import { adminRequest, jsonInit, useAdminData } from "@/components/admin/adminClient";

type Row = Record<string, unknown>;
type Draft = Record<string, unknown>;
type SaveResult = { row: Row; notices?: string[] };
type FieldErrors = Record<string, string>;

const keyOf = (def: CmsResourceDef, row: Row) => String(row[def.key] ?? "");
const titleOf = (def: CmsResourceDef, row: Row) => String(row[def.title] ?? "") || (def.id === "restaurant-settings" ? "Restaurant settings" : keyOf(def, row));

/** Row value → form state. */
function toDraft(field: FieldDef, value: unknown): unknown {
  if (field.kind === "bool" || field.kind === "approval") return value === true;
  if (field.kind === "triBool") return value === true ? "true" : value === false ? "false" : "";
  if (field.kind === "list") return field.options ? (Array.isArray(value) ? value : []) : (Array.isArray(value) ? value.join("\n") : "");
  if (field.kind === "json") return value === undefined ? "" : JSON.stringify(value, null, 2);
  return value === null || value === undefined ? "" : String(value);
}

/** Form state → API value (the server validates everything again). */
function toPayload(field: FieldDef, value: unknown): unknown {
  if (field.kind === "bool" || field.kind === "approval") return value === true;
  if (field.kind === "triBool") return value === "true" ? true : value === "false" ? false : null;
  if (field.kind === "list") return field.options ? value : String(value ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
  if (field.kind === "int" || field.kind === "number") return value === "" || value === null ? null : Number(value);
  if (field.kind === "json") return String(value ?? "");
  const text = String(value ?? "");
  return text.trim() === "" ? null : text;
}

function labelValue(field: FieldDef | undefined, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "object") return JSON.stringify(value);
  if (field?.kind === "datetime") return String(value).replace("T", " ");
  return String(value);
}

/** Loads the rows behind every `optionsFrom` field (media, categories, scenes) once. */
function useLinkedOptions(def: CmsResourceDef) {
  const sources = useMemo(() => [...new Set(def.fields.flatMap((field) => (field.optionsFrom ? [field.optionsFrom] : [])))], [def]);
  const [options, setOptions] = useState<Partial<Record<CmsResourceId, Array<{ value: string; label: string }>>>>({});
  useEffect(() => {
    let alive = true;
    void Promise.all(
      sources.map(async (source) => {
        const result = await adminRequest<{ items: Row[] }>(`/api/admin/cms/${source}`);
        const sourceDef = CMS_RESOURCES[source];
        const items = (result.data?.items ?? []).map((row) => {
          const extra = source === "media" ? ` (${String(row.provenance)})` : "";
          return { value: keyOf(sourceDef, row), label: `${titleOf(sourceDef, row) || keyOf(sourceDef, row)}${extra}`.slice(0, 90) };
        });
        return [source, items] as const;
      }),
    ).then((entries) => alive && setOptions(Object.fromEntries(entries)));
    return () => {
      alive = false;
    };
  }, [sources]);
  return options;
}

type PanelProps = {
  resource: CmsResourceId;
  permissions: AdminPermission[];
  /** Boolean field toggled straight from the list (e.g. menu item availability). */
  quickToggle?: string;
  /** Extra editor content for the selected row (e.g. a room's photos). */
  renderExtra?: (row: Row) => ReactNode;
  /** Bumped by a parent to force a reload (e.g. after an upload). */
  reloadKey?: number;
};

export function CmsResourcePanel({ resource, permissions, quickToggle, renderExtra, reloadKey = 0 }: PanelProps) {
  const def = CMS_RESOURCES[resource];
  const router = useRouter();
  const can = (permission: AdminPermission) => permissions.includes(permission);
  const canManage = can(def.manage);
  const canEdit = (field: FieldDef) => canManage || (field.permission ? can(field.permission) : false);
  const { data, error, loading, reload } = useAdminData<{ items: Row[] }>(`/api/admin/cms/${resource}?v=${reloadKey}`);
  const linked = useLinkedOptions(def);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  // Optimistic quick toggles (e.g. availability), reverted if the server refuses the change.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const items = data?.items ?? [];
  const filterField = def.fields.find((field) => field.name === def.filterField);
  const filterValues = filterField ? [...new Set(items.map((row) => String(row[filterField.name] ?? "")))].filter(Boolean).sort() : [];
  const visible = items.filter((row) => {
    if (filter && String(row[def.filterField ?? ""] ?? "") !== filter) return false;
    if (!query.trim()) return true;
    const haystack = `${titleOf(def, row)} ${keyOf(def, row)}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  const current = creating ? null : items.find((row) => keyOf(def, row) === selected) ?? null;
  const optionLabel = (field: FieldDef, value: unknown) => linked[field.optionsFrom as CmsResourceId]?.find((option) => option.value === value)?.label ?? labelValue(field, value);

  async function quickSave(row: Row, field: string, value: boolean) {
    const key = keyOf(def, row);
    setMessage(null);
    setToggled((current) => ({ ...current, [key]: value }));
    const result = await adminRequest<SaveResult>(`/api/admin/cms/${resource}/${encodeURIComponent(keyOf(def, row))}`, jsonInit("PATCH", { [field]: value }), "The change could not be saved.");
    if (result.redirect) return router.replace(result.redirect);
    if (result.error) {
      setToggled((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
    setMessage(result.error ? { text: result.error, error: true } : { text: `${titleOf(def, row)}: ${value ? "available" : "not available today"}.`, error: false });
    reload();
  }

  return <div className="admin-cms">
    {def.intro && <p className="admin-muted admin-cms__intro">{def.intro}</p>}
    <div className="admin-cms__toolbar">
      <input aria-label={`Search ${def.label.toLowerCase()}`} placeholder={`Search ${def.label.toLowerCase()}`} value={query} onChange={(event) => setQuery(event.target.value)} />
      {filterField && <select aria-label={`Filter by ${filterField.label.toLowerCase()}`} value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option value="">All {filterField.label.toLowerCase()}</option>
        {filterValues.map((value) => <option key={value} value={value}>{filterField.optionsFrom ? optionLabel(filterField, value) : value}</option>)}
      </select>}
      <button type="button" onClick={reload} disabled={loading}>Refresh</button>
      {def.create && canManage && <button type="button" className="admin-primary" onClick={() => { setCreating(true); setSelected(null); setMessage(null); }}>New {def.singular}</button>}
    </div>
    {message && <div className={message.error ? "admin-alert" : "admin-notice"} role={message.error ? "alert" : "status"}>{message.text}</div>}
    {error && <div className="admin-alert" role="alert">{error}</div>}
    <div className="admin-cms__layout">
      <div className="admin-card admin-cms__list" aria-busy={loading}>
        <div className="admin-cms__row admin-cms__row--head" style={{ gridTemplateColumns: `repeat(${def.columns.length}, minmax(0, 1fr))` }}>
          {def.columns.map((column) => <span key={column}>{def.fields.find((field) => field.name === column)?.label ?? column}</span>)}
        </div>
        {!data && loading && <p className="admin-empty">Loading…</p>}
        {data && visible.length === 0 && <p className="admin-empty">{items.length ? "Nothing matches this search." : `No ${def.label.toLowerCase()} yet.`}</p>}
        {visible.map((row) => {
          const key = keyOf(def, row);
          return <div key={key} className="admin-cms__item" data-active={!creating && selected === key}>
            <button type="button" className="admin-cms__row" style={{ gridTemplateColumns: `repeat(${def.columns.length}, minmax(0, 1fr))` }} onClick={() => { setSelected(key); setCreating(false); setMessage(null); }}>
              {def.columns.map((column, index) => {
                const field = def.fields.find((item) => item.name === column);
                const value = row[column];
                if (typeof value === "boolean") return <span key={column}><span className="admin-badge" data-on={value}>{value ? "Yes" : "No"}</span></span>;
                return <span key={column}>{index === 0 ? titleOf(def, row) : field?.optionsFrom ? optionLabel(field, value) : labelValue(field, value)}</span>;
              })}
            </button>
            {quickToggle && canEdit(def.fields.find((field) => field.name === quickToggle)!) && <label className="admin-cms__toggle">
              <input type="checkbox" checked={toggled[key] ?? row[quickToggle] === true} onChange={(event) => void quickSave(row, quickToggle, event.target.checked)} />
              <span>Available</span>
            </label>}
          </div>;
        })}
      </div>
      {(current || creating) && <CmsEditor
        key={creating ? "new" : selected}
        def={def}
        row={current}
        canEdit={canEdit}
        canDelete={def.remove && canManage}
        linked={linked}
        extra={current && renderExtra ? renderExtra(current) : null}
        onClose={() => { setSelected(null); setCreating(false); }}
        onSaved={(row, notices) => {
          setCreating(false);
          setSelected(keyOf(def, row));
          setMessage({ text: ["Saved.", ...notices].join(" "), error: false });
          reload();
        }}
        onDeleted={() => {
          setSelected(null);
          setMessage({ text: "Deleted.", error: false });
          reload();
        }}
      />}
    </div>
  </div>;
}

type EditorProps = {
  def: CmsResourceDef;
  row: Row | null;
  canEdit: (field: FieldDef) => boolean;
  canDelete: boolean;
  linked: Partial<Record<CmsResourceId, Array<{ value: string; label: string }>>>;
  extra: ReactNode;
  onClose: () => void;
  onSaved: (row: Row, notices: string[]) => void;
  onDeleted: () => void;
};

function CmsEditor({ def, row, canEdit, canDelete, linked, extra, onClose, onSaved, onDeleted }: EditorProps) {
  const router = useRouter();
  const creating = row === null;
  const initial = useMemo(() => Object.fromEntries(def.fields.map((field) => [field.name, toDraft(field, row?.[field.name])])), [def, row]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const fields = def.fields.filter((field) => !(creating && field.readOnly));
  const editable = (field: FieldDef) => !field.readOnly && !(field.createOnly && !creating) && canEdit(field);
  const changed = fields.filter((field) => editable(field) && JSON.stringify(toPayload(field, draft[field.name])) !== JSON.stringify(toPayload(field, initial[field.name])));

  async function save() {
    setBusy(true);
    setErrors({});
    setFormError("");
    const body = Object.fromEntries((creating ? fields.filter((field) => editable(field) && toPayload(field, draft[field.name]) !== null) : changed).map((field) => [field.name, toPayload(field, draft[field.name])]));
    const url = creating ? `/api/admin/cms/${def.id}` : `/api/admin/cms/${def.id}/${encodeURIComponent(keyOf(def, row!))}`;
    const response = await fetch(url, { ...jsonInit(creating ? "POST" : "PATCH", body), cache: "no-store" }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as (SaveResult & { error?: { message?: string; fields?: FieldErrors } }) | null;
    setBusy(false);
    if (response?.status === 401) return router.replace("/admin/login?reason=ended");
    if (!response?.ok || !payload?.row) {
      setErrors(payload?.error?.fields ?? {});
      setFormError(payload?.error?.message ?? "The change could not be saved.");
      return;
    }
    onSaved(payload.row, payload.notices ?? []);
  }

  async function remove() {
    if (!window.confirm(`Delete this ${def.singular}? This cannot be undone.`)) return;
    setBusy(true);
    const result = await adminRequest(`/api/admin/cms/${def.id}/${encodeURIComponent(keyOf(def, row!))}`, { method: "DELETE" }, "The item could not be deleted.");
    setBusy(false);
    if (result.redirect) return router.replace(result.redirect);
    if (result.error) return setFormError(result.error);
    onDeleted();
  }

  const set = (name: string, value: unknown) => setDraft((current) => ({ ...current, [name]: value }));

  return <aside className="admin-card admin-editor" aria-label={creating ? `New ${def.singular}` : `Edit ${titleOf(def, row!)}`}>
    <div className="admin-editor__top">
      <div><span className="admin-eyebrow">{creating ? `New ${def.singular}` : def.singular}</span><h2>{creating ? `New ${def.singular}` : titleOf(def, row!)}</h2></div>
      <button type="button" onClick={onClose} aria-label="Close editor">×</button>
    </div>
    {formError && <div className="admin-alert" role="alert">{formError}</div>}
    <form className="admin-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      {fields.map((field) => <FieldInput key={field.name} field={field} value={draft[field.name]} raw={row?.[field.name]} editable={editable(field)} error={errors[field.name]} options={field.optionsFrom ? linked[field.optionsFrom] : undefined} onChange={(value) => set(field.name, value)} />)}
      {Object.entries(errors).filter(([name]) => !fields.some((field) => field.name === name)).map(([name, text]) => <p key={name} className="admin-field-error">{name}: {text}</p>)}
      <div className="admin-editor__actions">
        {fields.some(editable) && <button type="submit" className="admin-primary" disabled={busy || (!creating && changed.length === 0)}>{busy ? "Saving…" : creating ? `Create ${def.singular}` : "Save changes"}</button>}
        {!creating && canDelete && <button type="button" className="admin-danger" onClick={() => void remove()} disabled={busy}>Delete</button>}
      </div>
    </form>
    {extra}
  </aside>;
}

type FieldProps = {
  field: FieldDef;
  value: unknown;
  raw: unknown;
  editable: boolean;
  error?: string;
  options?: Array<{ value: string; label: string }>;
  onChange: (value: unknown) => void;
};

function FieldInput({ field, value, raw, editable, error, options, onChange }: FieldProps) {
  const id = `cms-${field.name}`;
  const describedBy = error ? `${id}-error` : field.help ? `${id}-help` : undefined;
  const common = { id, disabled: !editable, "aria-invalid": Boolean(error) || undefined, "aria-describedby": describedBy };
  let control: ReactNode;
  if (field.readOnly || (!editable && field.kind !== "bool" && field.kind !== "approval")) {
    control = field.name === "url" && typeof raw === "string"
      // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded or seeded asset
      ? <img className="admin-thumb admin-thumb--large" src={raw} alt="" />
      : <output id={id} className="admin-readonly">{field.optionsFrom ? options?.find((option) => option.value === raw)?.label ?? labelValue(field, raw) : labelValue(field, raw)}</output>;
  } else if (field.kind === "bool" || field.kind === "approval") {
    control = <input type="checkbox" {...common} checked={value === true} onChange={(event) => onChange(event.target.checked)} />;
  } else if (field.kind === "triBool") {
    control = <select {...common} value={String(value)} onChange={(event) => onChange(event.target.value)}><option value="">Not confirmed</option><option value="true">Yes</option><option value="false">No</option></select>;
  } else if (field.kind === "select") {
    const choices = options ?? (field.options ?? []).map((option) => ({ value: option, label: option.replaceAll("_", " ") }));
    control = <select {...common} value={String(value)} onChange={(event) => onChange(event.target.value)}>
      <option value="">{field.required ? "Choose…" : "—"}</option>
      {choices.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>;
  } else if (field.kind === "list" && field.options) {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    control = <div className="admin-checks" id={id}>{field.options.map((option) => <label key={option}><input type="checkbox" checked={selected.includes(option)} disabled={!editable} onChange={(event) => onChange(event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} /> {option}</label>)}</div>;
  } else if (field.kind === "textarea" || field.kind === "json" || field.kind === "list") {
    control = <textarea {...common} rows={field.kind === "textarea" && (field.max ?? 0) > 1000 ? 7 : 4} value={String(value ?? "")} maxLength={field.kind === "textarea" ? field.max : undefined} onChange={(event) => onChange(event.target.value)} />;
  } else {
    const type = field.kind === "int" || field.kind === "number" ? "number" : field.kind === "date" ? "date" : field.kind === "time" ? "time" : field.kind === "datetime" ? "datetime-local" : field.kind === "url" ? "url" : "text";
    control = <input type={type} {...common} value={String(value ?? "")} step={field.kind === "int" ? 1 : field.step} min={field.min} max={type === "number" ? field.max : undefined} maxLength={type === "text" ? field.max : undefined} required={field.required} onChange={(event) => onChange(event.target.value)} />;
  }
  const inline = field.kind === "bool" || field.kind === "approval";
  return <div className="admin-field" data-inline={inline || undefined}>
    {inline ? <label htmlFor={id} className="admin-field__inline">{control}<span>{field.label}</span></label> : <><label htmlFor={id}><span>{field.label}{field.required ? " *" : ""}</span></label>{control}</>}
    {error ? <small id={`${id}-error`} className="admin-field-error">{error}</small> : field.help ? <small id={`${id}-help`} className="admin-muted">{field.help}</small> : null}
  </div>;
}
