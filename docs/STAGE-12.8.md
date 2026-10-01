# Stage 12.8 — Hotel Admin / Operational Panel

## Scope
A compact protected operations interface for 1–2 Tejjora staff members. This is not a developer dashboard.

## Modules
- **Today:** arrivals, departures, in-house count, pending payments and occupancy.
- **Reservations:** searchable reservation list, full guest/stay/pricing/payment detail, internal staff notes and controlled status changes.
- **Availability & Rates:** category base rates, category inventory, date-specific inventory/rate overrides, room blocks and a 7-day sellable-stock view.
- **Payments:** paid/pending/failed counts, amount paid/outstanding and reservation drill-through.

## Security
- `/admin` is server-side protected.
- Admin API endpoints require the signed HttpOnly staff session.
- Session cookies are SameSite=Lax and Secure in production.
- Staff passwords are stored only as scrypt hashes in server environment configuration.
- `ADMIN_SESSION_SECRET` signs sessions; it is never exposed to browser code.
- Mutating admin APIs reject cross-origin requests when an Origin header is present.
- No hard-coded staff credentials exist in source code.

## Operational configuration
Base room rates and category inventory are no longer UI-only constants for booking. The booking store contains an operational configuration with:
- category base rate
- category total inventory
- optional date-specific rate override
- optional date-specific inventory override
- room blocks for maintenance/out-of-order inventory

New public availability searches and new reservation pricing read this operational state. Existing confirmed reservations keep their recorded booking price.

## Reservation status controls
Staff can update internal notes and operational status. Manual confirmation without verified payment is blocked by default. It can only be enabled deliberately with `ADMIN_ALLOW_MANUAL_CONFIRM=true`.

## Future PMS boundary
The current JSON store is a temporary internal repository. Public booking, reservation operations and payment providers remain separated so PMS/channel-manager persistence can replace it later.

## Validation status
- Stage 12.8 structural/security validator: PASS.
- Stage 12.8 booking/admin core TypeScript check: PASS.
- Full source syntax transpile: PASS (114 TS/TSX files).
- Stage 9 → Stage 12.7 regression validators: PASS after adapting the Stage 12.6 validator to the newer operational inventory function.
- `npm run lint` and `npm run build` remain blocked in this runtime because project dependencies are not installed (`eslint` / `next` commands unavailable) and npm registry access is unavailable. No production-build PASS is claimed.
- Rendered 1366/1280/390/360 admin viewport verification therefore remains pending the dependency-backed runtime gate; responsive CSS for desktop/tablet/mobile is implemented but not presented as browser-verified.
