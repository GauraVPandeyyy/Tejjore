import "server-only";
import { recordAudit } from "@/lib/admin/audit";
import { CmsInputError, CmsNotFound, cmsDatabase, mapCmsDbError } from "@/lib/admin/cms/engine";
import type { AdminContext } from "@/lib/admin/session";

/**
 * Kitchen queue over `menu_orders` (db/migrations/004). Guests place orders through
 * /api/orders (src/lib/restaurant/orders.ts); this module is the staff side. The statuses and
 * transitions follow masterplan §8. Lists show the phone's last 4 digits only, and audit entries
 * never carry the guest's name or phone.
 */
export const ORDER_STATUSES = ["requested", "accepted", "preparing", "out_for_delivery", "ready", "delivered", "declined", "cancelled_by_staff"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = ["requested", "accepted", "preparing", "out_for_delivery", "ready"];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  requested: ["accepted", "declined"],
  accepted: ["preparing", "cancelled_by_staff"],
  preparing: ["out_for_delivery", "ready", "cancelled_by_staff"],
  out_for_delivery: ["delivered"],
  ready: ["delivered"],
  delivered: [],
  declined: [],
  cancelled_by_staff: [],
};

export const nextOrderStatuses = (status: OrderStatus) => TRANSITIONS[status];

type OrderRow = {
  id: string;
  reference: string;
  room_number: string | null;
  guest_name: string;
  phone_e164: string;
  status: OrderStatus;
  decline_reason: string | null;
  subtotal: number;
  service_charge: number;
  total_excl_tax: number;
  notes: string | null;
  accepted_by: string | null;
  created_at: string;
  updated_at: string;
};

const ORDER_COLUMNS = `id, reference, room_number, guest_name, phone_e164, status, decline_reason, subtotal::float8 AS subtotal,
  service_charge::float8 AS service_charge, total_excl_tax::float8 AS total_excl_tax, notes, accepted_by,
  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
  to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at`;

export async function listOrders({ scope, page, pageSize }: { scope: "active" | "all"; page: number; pageSize: number }) {
  const db = cmsDatabase();
  const filter = scope === "active" ? "WHERE status = ANY($1::text[])" : "WHERE $1::text[] IS NOT NULL";
  try {
    const [orders, counts] = await Promise.all([
      db.query<OrderRow>(`SELECT ${ORDER_COLUMNS} FROM menu_orders ${filter} ORDER BY created_at ${scope === "active" ? "ASC" : "DESC"} LIMIT $2 OFFSET $3`, [
        ACTIVE_ORDER_STATUSES,
        pageSize,
        (page - 1) * pageSize,
      ]),
      db.query<{ total: number; waiting: number }>(
        `SELECT (SELECT count(*)::int FROM menu_orders ${filter}) AS total, (SELECT count(*)::int FROM menu_orders WHERE status = 'requested') AS waiting`,
        [ACTIVE_ORDER_STATUSES],
      ),
    ]);
    const ids = orders.rows.map((order) => order.id);
    const items = ids.length
      ? (
          await db.query<{ order_id: string; name_snapshot: string; variant: string | null; qty: number; unit_price_snapshot: number }>(
            "SELECT order_id, name_snapshot, variant, qty, unit_price_snapshot::float8 AS unit_price_snapshot FROM menu_order_items WHERE order_id = ANY($1::text[]) ORDER BY created_at, id",
            [ids],
          )
        ).rows
      : [];
    return {
      items: orders.rows.map(({ phone_e164: phone, ...order }) => ({
        ...order,
        phoneLast4: phone.slice(-4),
        lines: items.filter((item) => item.order_id === order.id).map((item) => ({ name_snapshot: item.name_snapshot, variant: item.variant, qty: item.qty, unit_price_snapshot: item.unit_price_snapshot })),
        nextStatuses: TRANSITIONS[order.status] ?? [],
      })),
      total: counts.rows[0]?.total ?? 0,
      waiting: counts.rows[0]?.waiting ?? 0,
      page,
      pageSize,
    };
  } catch (error) {
    mapCmsDbError(error);
  }
}

export async function updateOrderStatus(
  reference: string,
  input: { status?: unknown; reason?: unknown },
  { admin, request }: { admin: Pick<AdminContext, "userId" | "role">; request?: Request },
) {
  const db = cmsDatabase();
  const status = input.status as OrderStatus;
  if (!(ORDER_STATUSES as readonly string[]).includes(String(status))) throw new CmsInputError({ status: "Unknown status." });
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if ((status === "declined" || status === "cancelled_by_staff") && !reason) throw new CmsInputError({ reason: "Give the guest a short reason." });
  if (reason.length > 300) throw new CmsInputError({ reason: "At most 300 characters." });

  const current = (await db.query<{ status: OrderStatus }>("SELECT status FROM menu_orders WHERE reference = $1", [reference])).rows[0];
  if (!current) throw new CmsNotFound("Order not found.");
  if (!TRANSITIONS[current.status].includes(status)) {
    throw new CmsInputError({ status: `An order that is ${current.status.replaceAll("_", " ")} cannot move to ${status.replaceAll("_", " ")}.` });
  }
  const entry = JSON.stringify([{ status, at: new Date().toISOString(), by: admin.userId, ...(reason ? { reason } : {}) }]);
  try {
    // The WHERE status guard makes concurrent staff updates safe: only one transition wins.
    const result = await db.query(
      `UPDATE menu_orders
          SET status = $2,
              decline_reason = CASE WHEN $3::text <> '' THEN $3 ELSE decline_reason END,
              accepted_by = CASE WHEN $2 = 'accepted' THEN $4 ELSE accepted_by END,
              status_history = status_history || $5::jsonb
        WHERE reference = $1 AND status = $6
        RETURNING id`,
      [reference, status, reason, admin.userId, entry, current.status],
    );
    if (!result.rows.length) throw new CmsInputError({ status: "The order changed meanwhile. Refresh and try again." });
  } catch (error) {
    if (error instanceof CmsInputError) throw error;
    mapCmsDbError(error);
  }
  await recordAudit(admin, { action: "menu_order.status_changed", entity: "menu_order", entityId: reference, diff: { from: current.status, to: status, reasonGiven: Boolean(reason) }, request });
  return { ok: true, status };
}
