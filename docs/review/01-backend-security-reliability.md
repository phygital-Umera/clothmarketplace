# Backend security and reliability review

Scope: `backend/` (Express 5, Prisma 5, TypeScript). Read-only review of the code as of commit f1d448e. Everything listed was checked in the code unless marked "unverified". Paths are relative to `backend/src` unless they start with `backend/`.

What looked good (checked): `.env` is git-ignored and only `.env.example` files are tracked (no secrets found by name); JWT access and refresh tokens are type-checked; `verifyJWT` reloads the user on every request and checks blocked/inactive/suspended company and `sessionsRevokedAt`; login uses a dummy hash to avoid user enumeration; reset tokens are random, hashed, expiring, single use, and invalidate sessions; Razorpay signature uses HMAC with `timingSafeEqual` and amounts are computed on the server; company/branch/shop scope is taken from `req.user`, not the request, in the services I sampled (`master.service`, `stock.service`, `creditNote.service`, `bill.service` via `lock(... scope ...)`, `product.service`); raw SQL uses bind parameters (no user text concatenated).

## Critical

None found.

## High

### H1. No password strength rules at all
- File: `validations/custom.validation.ts:114-115`, `:200`
- Wrong: the `password` field kind accepts any non-empty string. A one-character password is valid for sign-up, reset, change-password, and for admin-created accounts that use the same schema.
- Exploit: customers and staff set "1" or "abc"; combined with only 20 failed attempts per IP per 15 min (see M3), accounts can be guessed, and distributed guessing is trivial. Shop/branch admin accounts hold financial data.
- Fix: minimum 8-10 characters, block common passwords, apply in `field({kind:'password'})`.

### H2. Online payment is confirmed only by the browser; no webhook, no expiry of unpaid orders
- File: `services/store/checkout.service.ts:246` (`verify`), `:143`; no webhook route or timer exists (grep for webhook/cron/setInterval over `src` and `workers` found nothing).
- Wrong: an ONLINE order is created PENDING and stock is deducted immediately. It becomes PAID only if the customer's browser calls `/store/payments/verify`. If the customer closes the tab after paying, or the network drops, money is taken but the order stays PENDING/FAILED. If the customer abandons payment, the stock stays deducted forever.
- Exploit/break: lost sales and "paid but not confirmed" support cases; an attacker can lock all stock of a popular item by repeatedly checking out with ONLINE and never paying (needs only a free account, see M5).
- Fix: add a Razorpay webhook (`payment.captured`, verify `X-Razorpay-Signature` over the raw body) that marks orders paid idempotently; add a scheduled job that cancels unpaid ONLINE orders after about 30 min and restocks.

### H3. A cancelled order can still be marked PAID, and an already-paid order can be switched to COD
- File: `services/store/checkout.service.ts:246-283` (`verify` never checks order status) and `:317-333` (`switchToCod` only checks `paymentStatus` in the DB).
- Wrong: `verify` filters only on `paymentStatus !== PAID`. After the customer cancels an unpaid order (cancel restocks, `services/store/orders.service.ts:309-326`), a late payment/verify flips it to PAID while status stays CANCELLED, with stock already released and no refund trigger. `switchToCod` works on an order whose Razorpay payment has succeeded but whose verify call has not arrived yet (see H2), so the customer can pay online and also end up on COD, or have the shop ship while money sits in Razorpay.
- Fix: reject verify/failed/retry/switchToCod when `status` is CANCELLED; do status transitions with `updateMany({where:{id, paymentStatus:{not:'PAID'}, status:{not:'CANCELLED'}}})` and check `count`; ideally fetch the payment from Razorpay before switching to COD.

### H4. Any unhandled promise rejection kills the whole server
- File: `index.ts:43-47` (also `index.ts:10`)
- Wrong: `unexpectedErrorHandler` runs on every `unhandledRejection` and calls `process.exit(1)` (after `server.close`, which waits for open connections). `prisma.$connect().then(...)` at `index.ts:10` has no `.catch`, so a DB hiccup at boot is an unhandled rejection too. `SIGTERM` closes the server but never exits or disconnects Prisma (`index.ts:49-54`).
- Break: one stray rejected promise in a fire-and-forget call (email, notification, AI preview) takes the POS down for every shop until a process manager restarts it. Graceful deploys hang.
- Fix: log and continue for `unhandledRejection` (or ensure every async handler is wrapped), add `.catch` on connect, and on SIGTERM call `server.close`, then `prisma.$disconnect`, then exit. Run under pm2/systemd with restart.

### H5. Stock adjustments are read-modify-write without a transaction (raw SQL)
- File: `services/stock.service.ts:361-455` (`adjustStock`), `:457-505` (`recordPhysicalStockCount`)
- Wrong: current quantity is read, a new absolute `physicalQty` is computed in JS and written with `ON CONFLICT ... SET "physicalQty" = $4`. Damage handling does a separate `UPDATE damagedQty` before. None of this is in `prisma.$transaction`, and a physical count loops `adjustStock` per item, then inserts the audit row separately. The audit number and id are `count(*)+1` and `audit-${Date.now()}`.
- Exploit/break: a POS sale during an adjustment is overwritten (lost sale, stock goes wrong); two parallel counts get the same audit number; a failure halfway leaves some variants adjusted and no audit record.
- Fix: use `inventoryService.applyStockChanges` (already atomic, used by checkout) inside one transaction; use a DB sequence or advisory lock (as in `counter.service.ts`) for audit numbers.

## Medium

### M1. CORS allows every origin although the code comment says it is restricted
- File: `app.ts:34-38`; `config/config.ts` parses `CORS_ORIGINS` but it is never used.
- Wrong: `cors({origin:'*', credentials:true})`. With `*`, browsers refuse credentialed requests, but the config suggests a whitelist that does not exist. If someone "fixes" it by reflecting the origin, cookie auth (`verifyJWT` accepts an `accessToken` cookie) becomes CSRF-exposed. Today tokens travel in the `Authorization` header, so the real risk is low.
- Fix: use `config.cors.origins` as an allow-list; in production fail startup if empty.

### M2. Refresh tokens: one session per user, stored in plaintext, endpoint not rate limited
- File: `services/token.service.ts:51-59`, `services/user.service.ts:178-196`, `routes/user.routes.ts:23`
- Wrong: every login overwrites `user.refreshToken`, so logging in on a second device silently logs out the first (cashier at a counter vs. phone). The refresh token is stored as-is in the DB (a DB leak gives live sessions). `/users/refresh` has no `authLimiter`. `refreshAccessToken` does not check `sessionsRevokedAt` (it relies on `refreshToken` being nulled, which `revokeSessions` and `resetPassword` do).
- Fix: store hashed refresh tokens in a per-device table; rate limit refresh; also compare `sessionsRevokedAt` with the token `iat` in refresh.

### M3. Rate limiting is thin
- File: `middlewares/rateLimiter.ts`, `app.ts:46` (comment only)
- Wrong: only `authLimiter` exists, per IP, with `skipSuccessfulRequests`. No global limiter, none on `/users/refresh`, `/store/products`, search suggest, `/store/payments/*`, `/users/change-password`, or checkout. No per-account lockout. Behind a proxy without `TRUST_PROXY` set, all users share one IP and 20 failures lock everyone out (default is `false`, meaning the socket IP is used).
- Break: password guessing from many IPs, scraping, or checkout/stock-locking floods.
- Fix: global limiter plus per-identifier (phone/email) counters; make `TRUST_PROXY` mandatory in production docs.

### M4. Upload validation trusts the client MIME type; SVG allowed; hosted upload gets files first
- File: `middlewares/multer.middleware.ts:151-197`, `utils/fileStore.ts:21-34`, `utils/s3upload.ts:7-33`
- Wrong: `imageUpload` and `customerPhotoUpload` decide by `file.mimetype` only (client supplied) and never inspect file bytes. `imageUpload` allows `image/svg+xml`, which can hold script; local files are served from the API origin by `express.static('public')` (`app.ts:23`). Helmet's default CSP blocks inline script in SVG in modern browsers, so risk is reduced but not zero if CSP is relaxed. The generic `upload` (32 MB, documents, videos) appears unused by routes (unverified: grep of `routes` found only `imageUpload`). Uploaded files are first sent to a hardcoded third-party default URL (`https://upload.phygitaltech.in/`) with no auth header, and axios has no timeout, so a slow hosted server hangs the upload request. Temp files in `public/temp` (served statically) are not deleted when later validation fails (unverified for all paths).
- Fix: sniff magic bytes (`file-type`) or re-encode with `sharp` (already a dependency); drop SVG or sanitise it; add an axios `timeout`; clean `public/temp` on error and on a schedule; do not serve `public/temp`.

### M5. Public sign-up is instantly verified; no email or phone verification
- File: `services/user.service.ts:222-239`
- Wrong: `isVerified: true` with a comment that SMTP is not set up. Anyone can create unlimited accounts with fake phone numbers/emails. Phone is unique, so an attacker can also squat a real person's phone or email first.
- Fix: verify email or OTP before activation, at least before checkout; combine with the H2 stock-lock fix.

### M6. Money stored as floating point
- File: `backend/prisma/schema.prisma` (86 `Float` fields, e.g. SalesBill and Order totals); `services/store/checkout.service.ts:23` rounds with `Math.round(v*100)/100`
- Wrong: floating totals, tax and balances accumulate rounding errors; the Razorpay amount is `Math.round(grandTotal*100)` from a float sum.
- Break: bills that differ by a paisa from the sum of lines, ledgers that never balance exactly, payment amount mismatches.
- Fix: use `Decimal` (or integer paise) for money columns in a staged migration.

### M7. Debug logging in email and upload code
- File: `services/email.service.ts:43-49`, `utils/s3upload.ts` (`console.error('UPLOAD ERROR:', error)` dumps the axios error including request config), `services/user.service.ts:306`
- Wrong: recipient addresses and subjects are logged with `console.log`; the dev password-reset link with a live token is written to the log when SMTP is missing and `NODE_ENV=development` (fine locally, dangerous if a staging box runs as development). Production morgan logs the full URL including query strings (search terms, coupon codes; no tokens seen in URLs).
- Fix: remove the `[Email Debug]` lines; never log tokens; scrub axios errors.

### M8. Reset and verification emails build HTML with unescaped values
- File: `services/email.service.ts:79`, `:113-118`
- Wrong: `${username}` and the URL are placed straight into HTML. Customer `username` is a validated phone number, so exploitable only if a free-text username is ever allowed. If no URL is passed the link falls back to `http://link-to-app/reset-password` (a dead host). Unverified whether the verification mail is still used.
- Fix: HTML-escape values, require `FRONTEND_URL` in production.

### M9. Coupon limits are checked outside the transaction
- File: `services/store/customer.service.ts:145-148`, `services/store/checkout.service.ts:192-196`
- Wrong: `usedCount >= usageLimit` and `perCustomerLimit` are checked before the order transaction, and the transaction does a blind `increment`. Two simultaneous checkouts both pass.
- Break: a coupon with 1 use, or per-customer limit 1, can be redeemed several times with parallel requests.
- Fix: inside the transaction do `updateMany({where:{id, usedCount:{lt: usageLimit}}, data:{usedCount:{increment:1}}})` and check `count`; re-count the customer's usages inside the transaction.

### M10. `posPin` stored as typed and returned in every login/profile response
- File: `validations/user.validation.ts:79`, `services/user.service.ts:42`, `:342-349`
- Wrong: the POS PIN is stored without hashing (any string up to 10 chars) and is part of `SAFE_USER`, so it is sent back on login and profile reads. Anyone with a token, or an XSS in a panel, can read it. Where the PIN is verified was not found in this pass (unverified).
- Fix: hash it, never return it, add attempt limits wherever it is checked.

## Low

### L1. Error handler returns raw internal messages for 500s
- File: `middlewares/error.middleware.ts:30-33`, `:12-15`
- Wrong: unknown errors become `ApiError(500, err.message)`, so driver/Node error text reaches the client. `notFoundHandler` echoes the full URL and host.
- Fix: in production send a generic message for status >= 500 and log the original.

### L2. JWT secret has no minimum length; no algorithm pin; one secret for all token types
- File: `config/config.ts:7`, `services/token.service.ts:37-47`, `:63-65`
- Wrong: any string is accepted as `JWT_SECRET`; `jwt.verify` has no `algorithms: ['HS256']`; access and refresh tokens share one secret, separated only by the `type` claim. Access tokens embed name, email and role (role is re-read from the DB, so no privilege issue).
- Fix: require at least 32 chars, pin the algorithm, use separate secrets per token type.

### L3. Large unauthenticated body limits on every route
- File: `app.ts:21-22`
- Wrong: JSON and urlencoded bodies up to 16 MB are accepted before auth on all routes (login, forgot-password, contact form).
- Fix: default of about 100 KB, raise only where needed.

### L4. Dependencies look dated; `multer` 1.x has known advisories
- File: `backend/package.json`
- Wrong: `multer ^1.4.5-lts.1` has published DoS advisories fixed in 2.x; `helmet ^7`, `nodemailer ^6`; `@types/express ^4` against `express ^5` (type mismatch); `xss-filters` is unmaintained and unused (`xss()` is commented out at `app.ts:10,26`); `moment` is in maintenance mode; `name` is still "restaurant" and `main` points to a nonexistent `src/index.js`. `npm audit` was not run (nothing installed), so treat the versions as "looks vulnerable".
- Fix: upgrade multer to 2.x, run `npm audit`, remove unused packages (`xss-filters`, and `cloudinary` or the AWS SDK if unused).

### L5. Missing indexes for hot list and report queries
- File: `backend/prisma/schema.prisma` (SalesBill around line 753, Order 1192, StockMovement 659)
- Wrong: `SalesBill` has `companyId` and `branchId` columns used by branch-level lists and reports (`/branch-admin/sales-bills`) but indexes only on `shopId`, `status`, `billDate`, `createdById`. No composite indexes such as `SalesBill(shopId, billDate)`, `SalesBill(branchId, billDate)`, `Order(shopId, status, createdAt)`, `StockMovement(branchId, createdAt)`. The raw stock-ledger query (`services/stock.service.ts:113`) scans movements by branch and date.
- Break: list and report endpoints slow down as bills and movements reach hundreds of thousands of rows.
- Fix: add the composites after checking `EXPLAIN` on realistic data.

### L6. Raw SQL via `$queryRawUnsafe` is safe today but fragile
- File: `services/barcodeLabel.service.ts:112-123`, `services/stock.service.ts` (several)
- Wrong: values are bound correctly (checked), but a `${whereClause}` string is interpolated into the SQL; one future edit that concatenates user text would be SQL injection. `controllers/barcodeLabel.controller.ts:11-34` falls back to "first branch of the company" when the user has no branch.
- Fix: switch to tagged `$queryRaw` with `Prisma.sql` fragments.

### L7. Stray test page is served publicly
- File: `backend/public/backup-test.html` (tracked, served by `express.static('public')`)
- Wrong: a "Database Backup & Restore Testing Client" page is reachable on the API origin. No matching backup/restore routes were found in `src`, so it is probably harmless, but it should not ship.
- Fix: delete it or move it out of `public/`.

### L8. Server-side fetch of stored image URLs (exploitability unverified)
- File: `utils/fileStore.ts:75-84`
- Wrong: `readStoredImage` calls `fetch(url)` for any non-local URL taken from stored product image records. If an admin can save an arbitrary image URL on a product (not verified), the AI preview feature would fetch internal addresses from the server.
- Fix: allow-list hosts (your own uploads domain) before fetching.

## Top 5 to fix first
1. H2 + H3: add a Razorpay webhook, expire unpaid online orders, and block verify/switch-to-COD on cancelled or already-paid orders.
2. H1: enforce a real password policy (plus M3 per-account throttling and M5 verification of new accounts).
3. H5: make stock adjustments and physical counts atomic, using the existing `applyStockChanges` transaction path.
4. H4: stop exiting on every unhandled rejection and shut down gracefully.
5. M9 + M4 + M1: coupon redemption inside the transaction, magic-byte checks for uploads, and a real CORS allow-list.
