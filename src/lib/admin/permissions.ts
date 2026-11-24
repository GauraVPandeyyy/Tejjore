/**
 * Admin roles and permissions. Pure data (no secrets): the server enforces these through
 * src/lib/admin/authz.ts; the dashboard imports them only to hide controls a role cannot use.
 * Hiding a control is never the authorization.
 */
export const ADMIN_ROLES = ["owner", "manager", "front_desk", "kitchen"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_PERMISSIONS = [
  "dashboard.view",
  "reservations.view",
  "reservations.manage",
  "payments.view",
  "payments.refund",
  "availability.view",
  "availability.manage",
  "rooms.view",
  "rooms.manage",
  "media.view",
  "media.manage",
  "offers.view",
  "offers.manage",
  "restaurant.menu.view",
  "restaurant.menu.manage",
  "restaurant.menu.availability",
  "restaurant.orders.view",
  "restaurant.orders.manage",
  "content.view",
  "content.manage",
  "seo.view",
  "seo.manage",
  "tour.view",
  "tour.manage",
  "ai_knowledge.view",
  "ai_knowledge.manage",
  "audit.view",
  "staff.view",
  "staff.manage",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

/** Owner-only: staff accounts and their sessions. */
const OWNER_ONLY: readonly AdminPermission[] = ["staff.view", "staff.manage"];

const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  owner: ADMIN_PERMISSIONS,
  // Every operational and content permission, including refunds and the audit trail,
  // but not staff accounts or other people's sessions.
  manager: ADMIN_PERMISSIONS.filter((permission) => !OWNER_ONLY.includes(permission)),
  // Guest-facing desk work. Rates, inventory and blocks are viewed, not changed (pricing is a
  // manager decision); restaurant orders are visible so the desk can answer guests.
  front_desk: ["dashboard.view", "reservations.view", "reservations.manage", "payments.view", "availability.view", "restaurant.orders.view"],
  // Restaurant orders and item availability only: no guest records, rates or full menu edits.
  kitchen: ["restaurant.orders.view", "restaurant.orders.manage", "restaurant.menu.view", "restaurant.menu.availability"],
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner",
  manager: "Manager",
  front_desk: "Front desk",
  kitchen: "Kitchen",
};

export const isAdminRole = (value: unknown): value is AdminRole => typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);

export function permissionsForRole(role: AdminRole): AdminPermission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function roleHasPermission(role: AdminRole, permission: AdminPermission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Admin modules, in navigation order. A module is shown when the role has its permission; inside
 * a module, controls are further limited by finer permissions (e.g. the kitchen sees Restaurant
 * orders and availability toggles, not prices). All modules are implemented (Phase 3C).
 */
export type AdminModuleId =
  | "today" | "reservations" | "availability" | "payments"
  | "rooms" | "media" | "offers" | "restaurant" | "content" | "seo" | "tour" | "ai_knowledge"
  | "audit" | "staff";

export type AdminModule = { id: AdminModuleId; label: string; permission: AdminPermission; group: "operations" | "content" | "system" };

export const ADMIN_MODULES: AdminModule[] = [
  { id: "today", label: "Today", permission: "dashboard.view", group: "operations" },
  { id: "reservations", label: "Reservations", permission: "reservations.view", group: "operations" },
  { id: "availability", label: "Availability & Rates", permission: "availability.view", group: "operations" },
  { id: "payments", label: "Payments", permission: "payments.view", group: "operations" },
  { id: "restaurant", label: "Restaurant", permission: "restaurant.orders.view", group: "operations" },
  { id: "rooms", label: "Rooms", permission: "rooms.view", group: "content" },
  { id: "offers", label: "Offers", permission: "offers.view", group: "content" },
  { id: "content", label: "Content", permission: "content.view", group: "content" },
  { id: "media", label: "Media", permission: "media.view", group: "content" },
  { id: "tour", label: "Virtual Tour", permission: "tour.view", group: "content" },
  { id: "ai_knowledge", label: "AI Knowledge", permission: "ai_knowledge.view", group: "content" },
  { id: "seo", label: "SEO", permission: "seo.view", group: "content" },
  { id: "audit", label: "Audit", permission: "audit.view", group: "system" },
  { id: "staff", label: "Staff & Sessions", permission: "staff.view", group: "system" },
];
