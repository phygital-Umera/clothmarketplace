# Security Audit — Summary

Method: code reading plus `npm audit` on copies of the three package manifests. Nothing was run against a live system, no exploit was attempted, no secret values were read. Details, file:line and fixes are in the four reports:

- [05-authz-audit.md](review/05-authz-audit.md) — every route, tenant scope, privilege escalation
- [06-authn-payments-audit.md](review/06-authn-payments-audit.md) — login, sessions, tokens, Razorpay
- [07-input-files-infra-audit.md](review/07-input-files-infra-audit.md) — uploads, SQL, SSRF, config, git history
- [08-dependencies-client-audit.md](review/08-dependencies-client-audit.md) — vulnerable packages, browser-side security

Earlier review: [01-backend-security-reliability.md](review/01-backend-security-reliability.md).

## Totals
| Area | Critical | High | Medium | Low |
|------|---------:|-----:|-------:|----:|
| Authorization | 2 | 1 | 9 | 7 |
| Authentication / payments | 0 | 2 | 10 | 8 |
| Input / files / infra | 0 | 2 | 8+ | 4+ |
| Dependencies / client | see report | | | |

## Fix order

### Status (2026-11-07)
All five P0 items below are fixed in the working tree (not yet committed or deployed):
1. Legacy checkout removed: route, controller, `order.service.createCustomerOrder`, and the unused admin-app API call and hook.
2. `inventory.service` `adjustStock`, `batchAdjust`, `updateThreshold` now reject variants and branches outside the caller's company.
3. Barcode print window escapes every value it writes.
4. Rate limits split: `authLimiter` counts every request; login uses `loginLimiter` (failures per IP + account) and `loginIpLimiter` (all attempts per IP); `/users/change-password` is now limited too.
5. `seedDemo` refuses to create demo data when `NODE_ENV=production` (`--remove` still works).

P1 and P2 are still open.

### P0 — fix before any real traffic
1. **Legacy checkout `POST /users/orders/checkout`** — no role check, trusts the body: caller can mark an order PAID with any `transactionId`, choose company/shop/branch, use negative quantities. Delete the route or make it call the current checkout service.
2. **Cross-tenant stock write** — `inventory.service.ts` `batchAdjust`, `updateThreshold`, `adjustStock` never check the variant/branch belongs to the caller's company. Variant ids are public via `/store/products`. Add a scope check to every stock function.
3. **Stored XSS in barcode print window** (`BarcodeLabelsPage.tsx:282-330`) — product names are written unescaped into a same-origin window; tokens live in `localStorage`. Escape the values.
4. **Rate limiter** — `skipSuccessfulRequests` means forgot-password/register/support are never limited, and successful logins reset the brute-force counter. Use a separate limiter per route; do not skip successes on those.
5. **`seedDemo`** creates logins with the fixed password `Demo@1234` and no production guard. Refuse to run when `NODE_ENV=production`.

### P1 — this sprint
6. `PATCH /branch-admin/returns/:id` falls back to company scope (any branch's return) — `order.service.ts:791-800`.
7. Update packages: `jspdf` → 4.2.1 (critical), `nodemailer` → 10.3.1, `axios`, `zod`; run `npm audit fix`; add a `package-lock.json` to backend and commit it.
8. Refresh tokens: add rotation with reuse detection, rate limit `/refresh`; revoke sessions on logout and on any password change (including admin resets).
9. Require the password to change email/phone; validate and enforce uniqueness (add DB unique constraints on `email`, `username`).
10. Razorpay: add a webhook, expire unpaid orders, block PAID on cancelled orders; idempotency key on checkout.
11. CORS: allow only `CORS_ORIGINS`; enable the commented-out XSS middleware or remove it; add a CSP and `frame-ancestors` at the host.
12. Do not trust client MIME on uploads: check magic bytes, reject SVG, add per-user caps and a rate limit on `/store/uploads`.
13. Staff rights (`sales.discount`, `sales.credit`…) are never enforced server-side; shop users can set `creditLimit` and create employees without branch approval. Enforce them in services.
14. Shop users can read branch/company-wide stock, cost and purchase data — scope to their shop.

### P2 — hardening
15. Hash `posPin` and stop returning it at login; hash refresh tokens at rest.
16. Replace string-built SQL in `getAdjustmentHistory` with parameters.
17. Hide Swagger and `public/backup-test.html` in production; return a generic 500 message; lower the 16 MB body limit on public routes; remove `[Email Debug]` logs.
18. Coupons: `GET /store/coupons` lists all active coupons and ignores branch scope; coupon limits are checked outside the transaction.
19. Add `iss`/`aud`/algorithm to JWTs; strong-password rule and higher bcrypt cost.
20. Delete `frontend/my-three-app` and unused packages (`jspdf`, `html2canvas`, `or` in `user/`).
21. Consider moving tokens to httpOnly cookies (then add CSRF protection).

## Verified as sound
Reset-token entropy, hashing, expiry and single use; login dummy-hash against enumeration; access/refresh type separation; per-request status and `sessionsRevokedAt` checks; role forced to USER at signup; Razorpay amounts computed server-side and HMAC checked with `timingSafeEqual`; IDOR closed on bills, credit notes, customers, orders, transfers, cash book; no mass assignment of role/permission fields; employee module guard fails closed against case/slash/encoding tricks; no `eval`/shell exec; random upload filenames; no secrets in git history (only the two `.env.example` files were ever added); no `dangerouslySetInnerHTML`; no committed `.env`.

## Limits of this audit
- Unverified items are marked in each report (e.g. access-token life after password change, timing difference in forgot-password, `seedOrg` placeholder password, review/return photo URL validation, CSP at the host).
- Dashboard, branch overview, branch expense, branch approval and day-close internals were only skimmed.
- The backend dependency results come from a throwaway lockfile, so they show current resolution, not what is deployed.
- No live testing, no infrastructure review (hosting, S3 bucket policy, database access, backups).
