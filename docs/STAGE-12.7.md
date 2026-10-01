# Stage 12.7 — Payment Integration

## Provider
Razorpay is the initial production payment provider. Integration uses Razorpay's Orders API from the server; the secret key never enters browser code.

## Flow
1. Reservation creates a temporary room-category hold.
2. Server creates a Razorpay order for the persisted amount due.
3. Browser opens Razorpay Checkout with only the public key/order data.
4. Payment callback is verified server-side with HMAC against the stored order id.
5. Verified payment marks the reservation `confirmed`, payment `paid`, clears hold expiry, and sets amount due to zero.
6. Signed webhooks reconcile captured/failed payment events and are idempotent by webhook event id.

## Test mode
If no gateway credentials exist, the system does not fake a real payment. Development can explicitly set `PAYMENT_TEST_MODE=true` (non-production only) to exercise reservation → payment → confirmation state changes. Production ignores this test path.

## Refund readiness
A server-side `PaymentProvider` interface includes a refund capability. No public refund endpoint is exposed yet because hotel cancellation/refund policy and staff authorization belong in the operational/admin stage.

## Required production configuration
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `BOOKING_PRODUCTION_READY=true` only after official tax, cancellation, inventory and charge rules are approved.
