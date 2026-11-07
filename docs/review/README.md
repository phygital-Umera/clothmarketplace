# Review: Issues and Feature Ideas

Found by reading the code (nothing was run, no `npm audit`). Items the reviewers could not confirm are marked "unverified" in each file.

| File | Content | Count |
|------|---------|-------|
| [01-backend-security-reliability.md](01-backend-security-reliability.md) | Security and reliability | 0 critical, 5 high, 10 medium, 8 low |
| [02-backend-logic-bugs.md](02-backend-logic-bugs.md) | Business-logic and data bugs | 9 high, 16 medium, 9 low |
| [03-frontend-storefront-issues.md](03-frontend-storefront-issues.md) | Admin app and storefront | 6 high, 13 medium, 6 low |
| [04-feature-roadmap.md](04-feature-roadmap.md) | Extra features and tech health | 11 quick wins, 11 medium, 6 big bets |

## Fix first (top 10)
1. `POST /users/orders/checkout` (old order path): customer can mark an order PAID with any transaction id, send negative quantities, pick any branch/company. Remove or lock it down.
2. Online payments: add a Razorpay webhook, expire unpaid orders (release stock), block PAID on cancelled orders.
3. Stock adjustments (3 duplicate implementations): read-then-write without transactions can overwrite sales; adjustment ids collide across branches. Merge into one safe path.
4. Purchase returns: no returnable-quantity check, client-supplied cost/tax, no stock movement.
5. Password rules, `/refresh` rate limit, hash `posPin` (and stop returning it), hash refresh tokens.
6. CORS `*`, XSS middleware disabled.
7. `mustChangePassword` never enforced in the admin app.
8. Day close: no cash count, and bills can still be edited, cancelled or paid after close.
9. Bill/POS double-submit guard, money as Float (move to Decimal), count-based numbering without unique indexes.
10. No tests, CI or monitoring. Start with tests for billing, stock and credit.

## Feature order
Phase 1: CI, tests, cleanup of legacy code, backups, GST (GSTR-1/HSN) exports, loyalty points, thermal receipts, scanner mode.
Phase 2: WhatsApp/SMS, courier tracking, exchanges, demand forecasting, merge duplicate flows.
Phase 3: offline POS, PWA, e-invoice, Tally export, multi-warehouse.
