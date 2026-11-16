# Input handling, files, external calls and deployment config audit

Scope: `backend/` at commit f1d448e plus uncommitted changes. Read-only. Paths are relative to `backend/` unless noted. No secret values were read or printed. Items marked "unverified" were not confirmed by running the code. Overlaps with `01-backend-security-reliability.md` (CORS `*`, password rules, rate limits) are only cross-referenced.

## Critical

None found. No SQL injection, no command injection, no secrets in git history were verified.

## High

### H1. SQL built by string interpolation in `getAdjustmentHistory` (injection-shaped, currently not exploitable)
- File: `src/services/stockAdjustment.service.ts:101` (`WHERE a."branchId" = '${branchId}'`), `:136` (`LIMIT ${query.limit || 50}`), executed with `$queryRawUnsafe` at `:114`.
- Today: `branchId` comes from `resolveBranchId(scope)` (server-side scope, from the DB) and `limit` is validated as an int 1..100 by `getAdjustmentsQuerySchema` (`validations/stockAdjustment.validation.ts:58`). The `type` filter only selects fixed literals. So there is no live injection (verified), but it is the one place where text is concatenated into SQL. If a later change lets a client value reach `branchId` or skips the zod parse, it becomes full SQL injection on a financial DB.
- Fix: use `$1`/`$2` placeholders like the other `$queryRawUnsafe` calls, or Prisma `$queryRaw` tagged templates. Rated High only as a latent risk; downgrade to Medium if you prefer strictly "exploitable now".

### H2. Uploaded SVG is accepted from any shop/company admin and served from the API origin
- File: `src/middlewares/multer.middleware.ts:151-171` (`IMAGE_TYPES` includes `image/svg+xml`), served by `app.ts:23` `express.static('public')` at `/uploads/...`.
- Wrong: the type check trusts the client `Content-Type` header only (no magic-byte check). An SVG can hold `<script>`, `onload=`, external `<image href>` and `<foreignObject>` phishing content. It is stored under the API origin (`/uploads/companies|products|offers|coupons/<uuid>.svg`) when the hosted file server is unreachable (`fileStore.ts:25-31`).
- Exploit: a low-trust admin (shop admin, with `imageUpload` on `/products`, `/promotions`, company logo) uploads a malicious SVG and sends its URL to a super admin; opened directly it runs in the API origin. Mitigation present: helmet's default CSP (`script-src 'self'`, `script-src-attr 'none'`) should block inline script (unverified in a browser), and `nosniff` is set. Remaining risk: phishing pages, tracking, and any CSP relaxation later making it full stored XSS. SVG logos are also embedded by the panels; if the frontends use `<img>` this is safe, if they inline or `<object>` the SVG it is not (unverified, frontend not audited).
- Fix: drop SVG, or sanitise it (DOMPurify/`svgo` with scripts removed) and serve `/uploads` with `Content-Disposition: attachment` or `Content-Security-Policy: sandbox; default-src 'none'`. Add a magic-byte check (e.g. `file-type`, or run `sharp(buf).metadata()`) for raster types.

## Medium

### M1. Public debug page with a hard-coded dev tunnel URL is served in production
- File: `public/backup-test.html:320` (`baseUrl = 'https://bq88dfxj-5670.inc1.devtunnels.ms/api/v1'`), served by `app.ts:23`; tracked in git.
- Wrong: an unauthenticated "Database Backup & Restore Testing Client" page is reachable at `/backup-test.html`. No backup/restore route exists in `src` (grep for backup/restore/pg_dump found none), so the page is stale, but it advertises the feature, leaks a developer tunnel hostname, and would become a ready-made client if such routes return. No other debug endpoints found.
- Fix: delete the file from `public/` (and from git), keep tooling in a separate dev folder.

### M2. Swagger UI is mounted in every environment
- File: `src/config/swagger.ts:18-21`, `app.ts:50`.
- Wrong: `/api-docs` is public with no `NODE_ENV` check. `apis: ['./src/routes/*.ts']` is a relative path to TypeScript sources, so in a built `dist` deploy the spec is probably empty (unverified), but the endpoint itself still exists and in dev/ts-node it documents every route.
- Fix: mount only when `config.env !== 'production'`, or behind super-admin auth.

### M3. 500 responses return the raw internal error message
- File: `src/middlewares/error.middleware.ts:24-27,45-48`.
- Wrong: any non-ApiError (e.g. `PrismaClientValidationError`, `PrismaClientInitializationError`, sharp/native errors, axios errors) is converted with `message = err.message` and sent to the client. Prisma messages include model/field names, parts of the query arguments, and sometimes the DB host. Stack traces are only logged, not sent (verified, good).
- Exploit: any user who triggers a bad query shape learns schema details; an unreachable-DB error can disclose the connection target.
- Fix: for status >= 500 send a generic "Something went wrong" plus a request id; log the real message.

### M4. 16 MB JSON and urlencoded body limit on every route, including unauthenticated ones
- File: `app.ts:24-25`.
- Wrong: `/login`, `/register`, `/forgot-password`, store `/support` and others parse up to 16 MB per request before any auth. The urlencoded parser is `extended: true` (qs, deep object parsing, slower). With gzip response compression and no global request rate limit (only `authLimiter` on a few routes, which counts failures only) this is a cheap memory/CPU exhaustion vector.
- Fix: default `express.json({limit:'100kb'})`; raise only on the few routes that need base64 bodies. Use `extended:false`. Add a modest global rate limiter.

### M5. Unlimited customer photo uploads, orphan temp files, and `public/temp` is web-served
- File: `src/middlewares/multer.middleware.ts:24-39,155-196`, `routes/store.routes.ts:99-102`, `fileStore.ts:35-37`.
- Wrong: (a) `/store/uploads` takes 5 MB per call from any free customer account, with no per-user or per-IP limit; files are kept forever. (b) All uploaders write to `public/temp` first, which `express.static('public')` serves; files are deleted/moved only on the success path of `storeUpload`. If validation fails after multer ran, or the process dies, the file stays in `public/temp` for ever and is fetchable by UUID. (c) `imageUpload.array('images', 8)` has no `files` limit in multer options (route caps at 8, fine) but also no field/part count limits.
- Exploit: disk exhaustion by a script with a free account; a pending upload is readable by anyone who knows the UUID (low, unguessable).
- Fix: add a rate limiter and per-user quota to `/store/uploads`; put temp dir outside `public/` (e.g. `os.tmpdir()`); clean the temp file in an error handler/`finally`; add a periodic cleanup of old temp files.

### M6. Mime type is the only file check; no content check (images written to disk unverified)
- File: `multer.middleware.ts:147-196`, `fileStore.ts:35-37`.
- Wrong: extension is derived from the client mimetype via a fixed map (so the stored extension is safe and filenames are random UUIDs; path traversal is not possible, verified). But the bytes are not verified. A PNG-labelled HTML/JS file is stored and served as `image/png` with `nosniff` (harmless in browsers), yet it sits on disk and is later passed to `sharp` (native decoder) by the AI preview, where crafted files are a decoder attack surface.
- Fix: validate with `sharp(file).metadata()` or `file-type` before accepting; reject mismatches.

### M7. Local-fallback upload URL is built from the Host header, and `readStoredImage` can fetch arbitrary URLs
- File: `fileStore.ts:33,60` (`${req.protocol}://${req.get('host')}/uploads/...`), `fileStore.ts:68-78` (`fetch(url)` with no host allow-list, no timeout, no size cap), reached from `aiPreview.service.ts:257,375,422`.
- Wrong: when the hosted file server fails, the stored `ProductImage.url` contains whatever `Host` the request carried (the trust-proxy setting does not cover `Host`). Later, if the local file is not found, `readStoredImage` does a server-side `fetch` of that stored URL. A shop admin who can force the fallback (hosted server down) and spoof `Host` could store `http://internal-host/uploads/products/x.jpg`, then trigger an AI preview and make the server request an internal address (response is only fed to `sharp`, so blind SSRF with limited data return). Requires: authenticated shop admin, hosted upload failure, Host spoofing. Not exploited (unverified end to end).
- Fix: build the public base URL from a configured `PUBLIC_BASE_URL`, not from `Host`; in `readStoredImage` allow only the configured hosted-server/own hostnames, add `AbortSignal.timeout`, a max content length, and `redirect:'error'`.

### M8. CORS `origin:'*'` with credentials, ignoring `CORS_ORIGINS`
- File: `app.ts:34-38`. Already reported as M1 in doc 01; repeated here for completeness. The API uses bearer tokens (no cookie is ever set, `grep res.cookie` found none), so CSRF risk is low today; `cookieParser` plus `req.cookies?.accessToken` in `auth.middleware.ts:12` would become CSRF-prone if a cookie is ever set.

## Low

### L1. Generic `upload` multer instance allows 32 MB of video/Office/audio files (currently unused)
- File: `multer.middleware.ts:84-146`. No route uses `upload.*` (grep verified), so it is dead code, but it is exported and one import away from accepting `.docm`-like Office files, `.txt`, and 32 MB videos with client-supplied extension logic (`filename` uses `file.originalname` extension). Remove it.

### L2. Outbound calls to the hosted file server have no timeout or size limits and the base URL has a hard-coded default
- File: `src/utils/s3upload.ts:4,22,54`. `axios.post` without `timeout`, `maxBodyLength`; default `https://upload.phygitaltech.in/` plus `/upload` yields a double slash. A hung file server holds request threads; `fileStore` falls back only on error, not on slowness. Also `link` returned by the remote server is stored as-is (trusted).
- Fix: `timeout: 10_000`, trim trailing slash; validate the returned URL host.

### L3. Verification email interpolates `username` into HTML unescaped
- File: `src/services/email.service.ts:117-118`. Function has no callers today (grep verified), so not exploitable now; reset email only embeds a server-built URL. If used, escape HTML and URL-encode `username`/`code`.

### L4. PII and reset links in logs
- File: `email.service.ts:42-49` logs recipient address and subject with `console.log` ("[Email Debug]") in all environments; `user.service.ts:305-307` logs the full password reset link, but only when `NODE_ENV=development` and email is not configured (verified gating, fine). morgan logs `:url` including query strings (search terms, possibly phone/email in `?q=`) and, in production, the IP (`config/morgan.ts`). Request bodies, passwords and Authorization headers are NOT logged (verified).
- Fix: drop the debug `console.log`s; strip query strings from the morgan URL token.

### L5. Pagination caps inconsistent
- File: `validations/common.validation.ts:17-21`: `limit` has a minimum but no maximum (`?limit=1000000`). Where is it used: `user.validation.ts` imports `common.validation`; whether it is applied to a list endpoint was not traced (unverified). Most other lists use `listQuerySchema` (`utils/list.ts:26`, max 100), `stock.validation.ts:8` allows 500, `stockAdjustment` 100. `store.routes.ts:~114` notification `page` is `Number(req.query.page)` with no cap (page * limit skip is harmless but large values give slow offset scans).
- Fix: add `.max(100)` to `common.validation` limit.

### L6. Dev-only helpers
- `public/backup-test.html` (see M1). `seedDemo.ts` prints the shared demo password to stdout and `createSuperAdmin.ts:86` prints email/phone; both are CLI-only and not reachable over HTTP. `backend/seed.json` is git-ignored (new `seedOrg.ts` and `seed.example.json` are untracked as of now; `seed.example.json` should be checked to contain no real passwords before committing - it was not read in full).

### L7. Unhandled `SIGTERM`/`unhandledRejection` behaviour affects availability
- Already covered in doc 01 (H4).

## Checked and OK
- Raw SQL: all `$queryRaw`/`$executeRaw` tagged templates use bound params (`index.ts:12`, `counter.service.ts:19`, `cashBook.service.ts:461`, `dashboard.service.ts:41`, `inventory.service.ts:100`). All `$queryRawUnsafe`/`$executeRawUnsafe` calls in `barcodeLabel.service.ts`, `barcodeLabel.controller.ts`, `stock.service.ts`, `stockAdjustment.service.ts` pass values as `$n` parameters; the only interpolated pieces are the whereClause template with fixed fragments (`barcodeLabel.service.ts:116-123` uses `$2` for the search text, escaping not needed) and the exception in H1.
- Command execution: only one `execFile` (`utils/recolour.ts:72`), with `process.execPath`, fixed worker path and server-generated temp file names (no shell, no user data in argv), with a 180 s timeout. No `exec`, `spawn(shell)`, `eval`, `new Function`, or `new RegExp(userInput)` anywhere in `src` (grep verified). `workers/segment.cjs` has no `exec/shell` use.
- Path traversal: multer file names are `crypto.randomUUID()` plus an extension from a fixed map (`imageUpload`, `customerPhotoUpload`); the generic one also strips via `path.basename`. `readStoredImage` regex `[\w-]+`/`[\w.-]+` cannot yield `..` in the folder segment; `fileStore` builds paths from the fixed `folder` union and server-side `file.filename`/UUIDs.
- Upload size limits: 2 MB (images, with 8-file route cap) and 5 MB, single file (customer photos).
- Mass assignment: no `data: {...req.body}` or `Object.assign(x, req.body)` found (grep); `Object.assign` appears only in `config/logger.ts`. Controllers use zod parsing before services (spot-checked).
- Prototype pollution: no recursive merge/`lodash.merge` of user input found; `Object.keys` uses are on parsed zod objects.
- Regex DoS: no dynamic regexes from user input; static regexes spot-checked are simple.
- External fetches: only fixed hosts (`api.cloudflare.com` with account id from env in `aiPreview.service.ts:147`, with 20-ish s timeout; `api.razorpay.com`, `checkout.service.ts:47`; hosted upload server) except M7. No user-supplied URL is fetched by any controller; `ProductImage.url` is set only from `storeUpload` results.
- Security headers: `helmet()` default is applied; `nosniff` therefore present on static files; CORP `cross-origin` only for `/uploads`.
- Error handler: stack traces are logged, never returned (500 message leak is M3).
- Trust proxy: `app.set('trust proxy', config.trustProxy)` from env, documented as empty by default (rate limiter cannot be bypassed with a forged `X-Forwarded-For` unless set wrongly).
- Cookies: server never sets cookies; no cookie flags to misconfigure.
- Secrets in git: tracked env files are only `backend/.env.example` and `frontend/.env.example` (`git ls-files`); `git log --all --diff-filter=A --name-only` shows no `.env`, `.pem`, `.key`, credential or zip files ever added (only `.env.example` files and prisma migrations matched my pattern). Pattern search (`-G` for `AKIA...`, `BEGIN ... PRIVATE KEY`, `rzp_live_/rzp_test_` + key chars) matched only `frontend/src/assets/js/nirmalaBase64.ts` (commits 048bff9, 85cb516, 9c3d3ee; a base64 font blob, false positive) and no Razorpay key literal; the `rzp_` mentions in `config/config.ts:44` and `.env.example:70` are descriptions only. No hard-coded passwords or API keys found in `src`, `scripts`, `prisma` (regex search; `seedDemo.ts` uses a shared demo password constant, CLI only).
- `.gitignore`: root and `backend/.gitignore` cover `.env`, `.env.*`, `seed.json`, `public/temp`, `*.zip`, `dist`, logs. `.env.example` lists every variable with no real values (names inspected only, values stripped).
- Dev tunnel URLs: only one found, in `public/backup-test.html` (M1).
- S3 bucket ACL: no AWS SDK or bucket configuration in the code (`s3upload.ts` is a misnamed HTTP client for a hosted file server); the hosted server's own access policy is outside the repo (unverified).
- Reset email: link is built from `FRONTEND_URL`/server values, token is random; no user text interpolated into HTML (L3 covers the unused verification template).
