# Authentication, session and payment audit

Scope: `backend/src` at commit f1d448e (working tree with uncommitted seed/CLI changes). Read-only. Files read line by line: `middlewares/auth.middleware.ts`, `services/token.service.ts`, `utils/encryption.ts`, `middlewares/rateLimiter.ts`, `config/config.ts`, `services/user.service.ts`, `services/store/checkout.service.ts`, `routes/user.routes.ts`, `routes/store.routes.ts`, `validations/user.validation.ts`, `controllers/user.controller.ts`, `cli/createSuperAdmin.ts`, plus targeted reads of `account.service.ts`, `employee.service.ts`, `store/customer.service.ts` (coupons), `seedDemo.ts`, `seedOrg.ts`. No secret values were read or printed. Items already in `01-backend-security-reliability.md` (H1-H3, M2, M3, M5, M9, M10, L2) are only repeated where this audit adds a new angle. "Unverified" = reasoned from code but not run.

## Critical

None found.

## High

### A1. Rate limiter does not count successful requests, so forgot-password, register and support are unlimited, and the login limit can be reset
- File: `middlewares/rateLimiter.ts:9` (`skipSuccessfulRequests: true`), used at `routes/user.routes.ts:20-23`, `routes/store.routes.ts:48-53,92`
- Exploit: (1) `forgot-password` always answers 200 (by design, no enumeration), so it is never counted: an attacker can send unlimited reset emails to any victim (email bombing, SMTP quota burn, sender reputation loss). Same for `register` (unlimited fake accounts, feeds the stock-lock abuse in 01-H2) and `/store/support` (unlimited DB rows). (2) For login, a successful request decrements the counter. An attacker who owns any valid account (free sign-up) logs in successfully once after every 19 failed guesses against the victim, so the 20-per-15-min cap never trips. Combined with no password policy (01-H1) this is practical online brute force. The key is IP only; no per-account lockout.
- Fix: count all requests on forgot-password/register/support (separate limiter without `skipSuccessfulRequests`, plus per-identifier key e.g. hash of phone/email). For login, keep `skipSuccessfulRequests` off or add a per-account failed-attempt counter with exponential delay/lockout (store `failedLoginCount`, `lockedUntil`).

### A2. `seedDemo` creates owner/branch/shop/customer logins with the fixed password `Demo@1234` and has no environment guard
- File: `cli/seedDemo.ts:42,205,216,233,398` (no `NODE_ENV`/production check found by grep)
- Exploit: running `npm run seed:demo` against a staging or production `DATABASE_URL` (the script loads `.env`, same as the app) creates ACTIVE accounts with a published password, including company admin `owner@matoshri.demo` / `9800000101`. Anyone who has read the repo or this script can sign in. The password is also printed to the console (`seedDemo.ts:588`).
- Fix: refuse when `NODE_ENV === 'production'` or when the DB host is not local unless `--i-know` is passed; generate a random password per run and print it once.

## Medium

### A3. Refresh token endpoint: no reuse detection, no rate limit, plaintext compare, no `jti`
- File: `services/user.service.ts:178-197`, `services/token.service.ts:41-59`, `routes/user.routes.ts:24`
- Exploit: rotation works (a used refresh token no longer matches `user.refreshToken`), but presenting an already-used token only returns 401; it does not revoke the new session. A thief who steals a refresh token and uses it first keeps a live session, while the real user just gets logged out with no alert and no family revocation. Refresh tokens carry no `jti`, so two tokens issued in the same second for the same user are byte-identical. The stored token is compared with `!==` (not constant time, low impact since it is a signed JWT) and stored in plaintext (01-M2). The endpoint accepts the token from the body or a cookie (`controllers/user.controller.ts:45`) and has no limiter.
- Fix: add `jti`, store a SHA-256 of the current refresh token (per-device table), and on mismatch with a validly signed token revoke all sessions (`sessionsRevokedAt = now`); add a limiter to `/users/refresh`.

### A4. Logout and password change leave access tokens alive
- File: `services/user.service.ts:174-176` (`logoutUser` only nulls `refreshToken`), `:262` (`sessionsRevokedAt` is set only when `signOutOthers` is true)
- Exploit: a stolen access token keeps working for the full access TTL (15 min in `.env.example`; `JWT_ACCESS_EXPIRATION_MINUTES` has no default or upper bound, `config/config.ts:8-10`, so an operator can set days) after the victim logs out or changes the password, unless the client opted in to `signOutOthers`. The store `/profile/password` route does not send `signOutOthers` by default either (UI-dependent, unverified).
- Fix: set `sessionsRevokedAt = now` on logout and on every password change (the new token issued in the same second is still accepted because the check is `iat < revokedAt`), cap the access TTL in config validation.

### A5. `POST /users/change-password` is not rate limited (current password can be brute-forced with a stolen token)
- File: `routes/user.routes.ts:30` (the store variant at `store.routes.ts:92` has `authLimiter`, the staff/admin one does not)
- Exploit: anyone holding a short-lived access token (XSS, shared counter PC) can guess the current password without limit and then lock the real owner out of an admin/shop account permanently.
- Fix: apply a per-user failed-attempt limiter; require re-auth for sensitive changes.

### A6. Account takeover persistence: customer email/phone can be changed without the password or re-verification
- File: `services/store/account.service.ts:71-108` (email), `validations/user.validation.ts:78` and `services/user.service.ts:343-349` (`phoneNumber`, any string, no format check, `username` not updated)
- Exploit: a session thief changes the account email to their own address, then uses "forgot password" (reset mail goes to `user.email`, `user.service.ts:286-310`) to set a new password, survive the owner's later password change, and keep the account. Phone is the login identifier and can be replaced without OTP or format validation on `/users/update`. A notification is written to the old inbox only inside the app, not emailed. No session revocation on email change.
- Fix: require current password for email/phone change, validate the phone with the shared pattern, email the OLD address, revoke other sessions.

### A7. Customer email is never verified, and registration reveals which phone/email exist
- File: `services/user.service.ts:200-236`
- Exploit: `isVerified: true` at sign-up (01-M5). Additionally `ensureContactIsFree` returns a field-specific 409 ("This phone number already has an account"), a user-enumeration oracle with only the register rate limit (and see A1: successful and bypassing requests are cheap). An attacker can also register a victim's email with their own phone and password; the victim can then never sign up with that email, and password-reset mail for that account goes to the victim (confusing, and enables social-engineering).
- Fix: verify email or phone by OTP before activation; return a generic message or accept the enumeration trade-off knowingly for UX; DB unique index on `lower(email)` (see A10).

### A8. Forgot-password has a timing difference between existing and unknown accounts
- File: `services/user.service.ts:276-314`
- Exploit: for an unknown identifier the function returns after one DB read; for a real account it does an extra DB update plus an awaited SMTP send (`await emailService.sendResetPasswordEmail`, hundreds of ms to seconds). Response time reveals which emails/phones are registered despite the identical message. Unverified by measurement.
- Fix: fire the email in the background (queue / `void promise.catch(log)`), or pad to a constant time.

### A9. Double-submit checkout can create duplicate orders and double charges
- File: `services/store/checkout.service.ts:99-103` (cart read outside the transaction), `:161-223` (cart cleared inside), no idempotency key
- Exploit: two concurrent `POST /store/checkout` calls (double click, retry on slow network, or deliberate) both read the full cart, both create orders and both deduct stock (each is allowed if stock suffices); for ONLINE two Razorpay orders are created, so the customer can be asked to pay twice. No limiter on `/store/checkout` or `/store/payments/*`.
- Fix: lock the cart row (`SELECT ... FOR UPDATE`) and re-read items inside the transaction, or require an `Idempotency-Key`; add a checkout limiter.

### A10. Email and username are not unique in the database; login and reset pick an arbitrary match
- File: `backend/prisma/schema.prisma:12-13` (`username String?`, `email String?`, no `@unique`; only `phoneNumber` is `@unique` at `:22`), `services/user.service.ts:133-142`, `:277-285`
- Exploit: uniqueness is enforced only by a check-then-create in app code (`ensureContactIsFree`), which races. Two accounts with one email are possible; `findFirst` without ordering then logs in or resets whichever row Postgres returns first. Staff accounts created via `accountService.ensureLoginIsFree` share the same weakness (unverified for all creators).
- Fix: partial unique index on `lower(email) WHERE deletedAt IS NULL`, and on `username`; handle P2002 in register.

### A11. Payment verify/switch race: payment succeeds at Razorpay but the order can be cancelled or switched to COD (extends 01-H3)
- File: `services/store/checkout.service.ts:246-283`, `:317-329`
- Added detail: `failed` (`:285-300`) can be called by the customer at any time to flip an order to FAILED, then `cod` flips it to COD/PENDING, all before the browser's `verify` call or with the verify call dropped; there is no server-side fetch of the Razorpay order/payment status and no webhook. Read-modify-write on `paymentDetails` (`:267`, `:295`) can drop `razorpayPaymentId` under concurrency. Result: money captured, order shipped as COD, no reconciliation record (the payment id is lost).
- Fix: as in 01-H2/H3 (webhook with raw-body HMAC, conditional `updateMany`), and before `switchToCod` query Razorpay for captured payments on that order id.

### A12. `posPin` is a stored plaintext credential with no verification endpoint and no policy (extends 01-M10)
- File: `validations/user.validation.ts:79`, `services/user.service.ts:42` (returned by login, `me`, `update`)
- Detail: no code in `backend/src` compares a PIN (grep for `posPin` finds only the select list and the schema), so either the PIN is checked client-side (comparing against the value the server hands out, so it is not a control) or it is unused. Any string up to 10 chars, including empty-ish values, is accepted.
- Fix: do not return it; hash it; verify server-side with an attempt limiter, or remove the field.

## Low

### A13. Password policy gaps beyond 01-H1
- File: `validations/custom.validation.ts:114-115`; `middlewares`-less login schema `validations/user.validation.ts:11`; `utils/encryption.ts:13`
- Detail: no minimum length (confirmed: comment "No strength rules"); `BCRYPT_SALT_ROUNDS` is parsed with no floor, so a value like `4` or an unparseable string (`NaN`) is accepted silently (bcryptjs falls back to 10 on NaN, unverified); login password has no max length so a multi-MB string is hashed on every attempt (body limit is 16 MB, `app.ts:24`); bcryptjs is the pure JS implementation, slower than native `bcrypt`, so 20 parallel login attempts at cost 12 consume noticeable CPU. Admin-created staff/employee passwords (`employee.service.ts:87`) have no policy, and `mustChangePassword` is only returned to the client, never enforced server side (`auth.middleware.ts` does not check it).
- Fix: enforce min 10 chars and a minimum of 10 rounds, cap login password at 128 chars, enforce `mustChangePassword` in `verifyJWT` for all routes but change-password/logout.

### A14. JWT details
- File: `services/token.service.ts:28-52,65-69`
- Detail: no `iss`/`aud`/`algorithm` options (jsonwebtoken 9 with a string secret only accepts HS256/384/512 and rejects `none`, so alg confusion is not exploitable here; still pin `algorithms: ['HS256']`); access token embeds `fullname`, `email`, `role` (PII in a bearer token; role is not trusted because it is reloaded in `verifyJWT`); one shared secret for access and refresh (separated only by `type`, which is correctly checked at `:80`); empty `JWT_SECRET` fails closed at sign time (checked: jsonwebtoken throws on empty secret) but no startup check, and no minimum length (01-L2).
- Fix: pin algorithm, add `iss`/`aud`, separate secrets, validate length >= 32 at startup.

### A15. `createSuperAdmin` upsert does not revoke existing access tokens, and accepts any password
- File: `cli/createSuperAdmin.ts:57-82`
- Detail: re-running it resets the password and nulls `refreshToken` but does not set `sessionsRevokedAt`, so access tokens issued before the reset stay valid until expiry (matters when the purpose is recovery after compromise). Password has no strength check (only presence). `seed.example.json` ships `Change@1234`; `seedOrg` does not reject that value if the file is copied unchanged (unverified for the full file; only the header and grep were checked). `--password` on the command line lands in shell history and process lists; env `SUPERADMIN_PASSWORD` is supported.
- Fix: set `sessionsRevokedAt` in `update`, reject known placeholder passwords, require min length, prefer env/prompt.

### A16. Coupons: usage never released on cancel, code probing, and limits race
- File: `services/store/customer.service.ts:139-153`, `services/store/checkout.service.ts:218-222`, `services/store/orders.service.ts:309-326` (no coupon handling found in cancel)
- Detail: a cancelled or never-paid ONLINE order keeps its `CouponUsage` row and `usedCount`, so a customer loses a single-use coupon, and an attacker can burn a global `usageLimit` by checking out and cancelling (needs only a free account). Error messages distinguish invalid / expired / used up / not applicable, and `GET /store/cart?coupon=` has no limiter, so private coupon codes can be probed (the codes are short upper-case strings; format not checked). Parallel redemption (01-M9) is the remaining race. Discount is capped at eligible total and server computed (checked OK).
- Fix: decrement usage on cancel/expiry, one generic error for bad codes plus a limiter, atomic conditional update.

### A17. `razorpayOrderId` lookup scans orders by JSON path
- File: `services/store/checkout.service.ts:86-93`
- Detail: `paymentDetails->razorpayOrderId` has no index; every verify/status/retry/failed call filters `Order` by customer and a JSON path (customer filter narrows it, so impact is limited to customers with many orders). Unauthenticated users cannot reach it.
- Fix: promote `razorpayOrderId` to an indexed column.

### A18. Error responses leak role names and token state
- File: `middlewares/auth.middleware.ts:96-100`, `services/token.service.ts:70-78`
- Detail: 403 text lists required roles and the caller's role (aids route mapping); distinct messages for expired / not-yet-valid / invalid token (harmless). `tokenSchema.parse` in `getTokenFromRequest` throws a ZodError rather than a 401 for malformed tokens (status depends on the error converter, unverified).
- Fix: generic 403 text in production.

### A19. Reset link carries the token in the URL query
- File: `services/user.service.ts:306`, `services/email.service.ts` (link built as `...?token=`)
- Detail: the token can leak via Referer, browser history and proxy logs before the page consumes it; 30-minute expiry and single use limit the impact. Also `JWT_RESET_PASSWORD_EXPIRATION_MINUTES` in config/env is unused: the real expiry is the constant `RESET_TOKEN_MINUTES = 30` (`user.service.ts:22`), which can mislead operators.
- Fix: use a URL fragment (`#token=`) and read it client-side; delete the dead config values.

### A20. Reset and forgot concurrency: token consumed with find-then-update
- File: `services/user.service.ts:316-340`
- Detail: `findFirst` by token hash then `update` by id: two concurrent requests with the same token both succeed (last password wins). Limited impact (requires holding the token). Also the reset works for any status once a token exists; tokens are only issued to ACTIVE users, so a later block still lets the token be used (the user stays blocked at login).
- Fix: `updateMany({where:{passwordResetTokenHash, expires > now}, ...})` and check `count === 1`.

## Checked and OK

- Reset token: 32 random bytes (`crypto.randomBytes`), only the SHA-256 is stored (`passwordResetTokenHash @unique`), 30-minute expiry, cleared on use, new request overwrites old, success sets `sessionsRevokedAt` and nulls `refreshToken` (`user.service.ts:297-340`).
- Login: dummy bcrypt compare for unknown accounts, one error text for unknown/wrong password, status and company/branch/shop checks only after the right password (`user.service.ts:130-172`).
- Store forgot-password is restricted to `Role.USER` and the store reset page URL (`store.routes.ts:49-52`, `account.service.ts:126-131`).
- Role escalation at signup: `registerCustomer` hard-codes `Role.USER`; the zod schema has no role field and strips unknown keys; `updateUserSchema` has no role, status, company or email fields, so no mass assignment on `/users/update`. SUPER_ADMIN can only be created via the CLI.
- Suspended/inactive/blocked users and old tokens: `verifyJWT` reloads the user every request and checks `deletedAt`, `sessionsRevokedAt` vs `iat`, `status`, company, branch and shop status (`auth.middleware.ts:24-84`, `user.service.ts:72-128`); status changes set `sessionsRevokedAt` (`account.service.ts:140-150`, also `company.service.ts:254`, `branch.service.ts:197`, `shop.service.ts:229`, `employee.service.ts:178`). Refresh also re-runs `assertCanSignIn`.
- Token type separation: access vs refresh checked in `verifyToken` (`token.service.ts:80`); a refresh token cannot be used as an access token. `type` is set after the payload spread so it cannot be overridden. Expiry is mandatory (`JWT_ACCESS_EXPIRATION_MINUTES` has no default; `.env.example` uses 15 min / 7 days).
- Permissions: role permissions are looked up server side per request, employees add only admin-granted permissions; `checkRole`/`checkPermission` fail closed when `req.user` is missing.
- bcrypt: default cost 12 via `encryptPassword` (`utils/encryption.ts:13`); passwords are never returned (`SAFE_USER` excludes `password`, `refreshToken`, reset fields).
- Session fixation: no server-side session id exists; tokens are issued fresh at login and refresh; the API does not set auth cookies (no `res.cookie` found), so cookie-based CSRF is not exposed today.
- Razorpay: amount comes from server-side cart prices and server-computed coupon/delivery (`checkout.service.ts:124-143`); client sends only address id, delivery option, payment method and coupon code. Signature `HMAC_SHA256(orderId|paymentId)` with `timingSafeEqual` and length pre-check (`:249-256`). Orders are looked up by `customerId` plus Razorpay order id, so one customer cannot verify, retry, fail or switch another customer's payment (`:86-93`). Replay of a payment id on another Razorpay order fails because the signature binds the order id; repeated verify is idempotent (`:260`). Key secret is read from env and never sent to the client (`paymentConfig` returns only the key id). `retry` blocks cancelled and fully paid orders.
- Coupon discount cannot exceed the eligible total or become negative; per-customer and global limits are checked (race noted in A16/01-M9); company/shop scoping applied.
- CLI/seed: `seed.json` is git-ignored, `.env` is not tracked, `createSuperAdmin` refuses to create a second super admin or convert an account without `--force`, stores a bcrypt hash only.
- Express `trust proxy` defaults to `false`, so `X-Forwarded-For` cannot be spoofed to dodge the IP limiter unless `TRUST_PROXY` is misconfigured.
- Customer store routes require `verifyJWT` plus `checkRole(Role.USER)`; staff tokens cannot place store orders and customers cannot call staff routes (role checked per router, sampled in `store.routes.ts:59`).

## Suggested order of fixes
1. A1 (limiter semantics + per-account lockout) together with 01-H1 (password policy).
2. A2 (guard `seedDemo`).
3. A4 and A3 (revoke on logout/password change, refresh reuse detection).
4. A6 and A7 (verify email/phone, re-auth for contact changes).
5. A9, A11 and 01-H2/H3 (idempotent checkout, Razorpay webhook, conditional status updates).
