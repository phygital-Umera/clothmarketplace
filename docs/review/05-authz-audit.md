# Authorization audit (exhaustive)

Scope: every route file in `backend/src/routes/*.ts`, followed into controller, service and Prisma queries. Read-only review at commit f1d448e (working tree with the uncommitted CLI changes; those do not touch routes). Paths are relative to `backend/src`. "Verified" means I read the code path end to end; anything not fully traced is marked "unverified".

Legend for guards: `J` = `verifyJWT` (reloads user, checks blocked/inactive/suspended company/session revoke). `R(x)` = `checkRole`. `P(x)` = `checkPermission`. `EG(m)` = `employeeModuleGuard`, module `m`. Scope-checked: yes = query is constrained by `req.user` company/branch/shop (or customer id); partial = constrained but too wide or one id not constrained; no = not constrained.

How routes are mounted (`routes/index.ts`): `/users`, `/companies`, `/super-admin`, `/company-admin`, `/branch-admin`, `/shop-admin`, `/employee`, `/store`, all under `/api/v1`. The shop route set (`routes/shopAdmin.routes.ts`, `shopRoutes`) is mounted twice:
- `/shop-admin`: `J` + `R(SHOP_ADMIN, SUPER_ADMIN, ADMIN, SUB_ADMIN)`
- `/employee`: `J` + `R(EMPLOYEE)` + `EG` (module picked from the first path segment, fail-closed for unknown segments)

Other unauthenticated surface (not under `/api/v1`): `GET /` welcome, `GET /api-docs` (Swagger UI), `express.static('public')` (everything under `public/`, including `/uploads/*`).

## 1. Coverage table

### 1.1 `/users` (user.routes.ts)

| Route | Guards | Scope-checked? | Note |
|---|---|---|---|
| POST /users/register | none, authLimiter | n/a | Creates `USER` only; zod strips `role`. Phone/email existence leaks via 409 (L4). |
| POST /users/login | none, authLimiter | n/a | Dummy-hash for missing user. OK. |
| POST /users/forgot-password | none, authLimiter | n/a | Always 200; limiter skips successful requests so it never throttles (M7). |
| POST /users/reset-password | none, authLimiter | n/a | Token hashed, single use. OK. |
| POST /users/refresh | none | n/a | Not rate limited; compares stored refresh token; checks `assertCanSignIn`. |
| POST /users/logout | J | yes (own id) | |
| POST /users/change-password | J | yes (own id) | Needs current password. |
| GET /users/me | J | yes (own id) | Returns `posPin` (see 01-review M10). |
| PATCH /users/update | J | yes (own id) | zod strips unknown keys (no mass assignment of role/permissions). `phoneNumber` unvalidated, no uniqueness check, `username` not synced (M5). |
| POST /users/orders/checkout | J only (any role) | **no** | Legacy checkout trusts body: payment status, company/shop/branch ids, quantity (C2). |
| GET /users/orders | J | yes (customerId) | |
| GET /users/orders/:id | J | yes (customerId) | |
| POST /users/orders/:id/cancel | J | yes (customerId) | |
| POST /users/orders/:id/return | J | yes (customerId) | `returnItems` stored unvalidated, refund = full order total. |

### 1.2 `/companies` (company.routes.ts): `J` + `R(SUPER_ADMIN)` on all

| Route | Extra guard | Scope-checked? | Note |
|---|---|---|---|
| GET /companies | P(companies.view) | n/a (platform wide) | |
| POST /companies | P(companies.create) | n/a | Creates `ADMIN` login with fixed role. |
| GET /companies/:id | P(companies.view) | n/a | |
| PATCH /companies/:id | P(companies.edit) | n/a | `...rest` is zod-shaped; no role fields. Password change does not set `sessionsRevokedAt` (L1). |
| DELETE /companies/:id | P(companies.delete) | n/a | Soft delete, signs everyone out. |

### 1.3 `/super-admin` (superAdmin.routes.ts): `J` + `R(SUPER_ADMIN)` on all

| Route | Extra guard | Scope-checked? | Note |
|---|---|---|---|
| GET /super-admin/dashboard | P(dashboard.view) | n/a | |
| GET /super-admin/branches, /branches/:id | P(branches.view) | n/a | |
| GET /super-admin/shops, /shops/stats, /shops/:id | P(branches.view) | n/a | |
| GET /super-admin/users | P(users.view) | n/a | `SAFE_USER` select. |
| PATCH /super-admin/users/:id/status | P(users.block) | yes (`manageable`) | Cannot touch other SUPER_ADMINs or self. |
| POST /super-admin/users/:id/revoke-sessions | P(users.block) | yes | |
| catalog (mountCatalog, manageCategories+manageBrands): GET categories/options, brands/options, GET/POST categories, PATCH/DELETE categories/:id, GET/POST brands, PATCH brands/:id, GET products, GET products/:id, PATCH products/:id/status | none beyond role (no P()) | n/a / yes | Super admin may only set UNPUBLISHED (service). Category/brand writes are not permission-gated (`categories.*` permissions exist but are not applied). |
| GET /super-admin/orders, /orders/:id | none beyond role | n/a (scope `{}` = all) | Customer PII; `orders.view` permission not applied. |
| GET /super-admin/inventory/dashboard, /inventory, /inventory/movements, /returns | none beyond role | n/a | |
| promotions (mountPromotions): GET dashboard; GET/POST offers; GET/PATCH/DELETE offers/:id; PATCH offers/:id/status; GET/POST coupons; GET/PATCH/DELETE coupons/:id; PATCH coupons/:id/status; POST coupons/validate | none beyond role | yes (scope `{}` => global records only on create) | See M3 for offer product ids. |

### 1.4 `/company-admin` (companyAdmin.routes.ts): `J` + `R(ADMIN)` on all (no per-action `P()`)

| Route | Scope-checked? | Note |
|---|---|---|
| GET /dashboard, /profile | yes (companyId) | |
| GET /branches/options, GET/POST /branches, GET/PATCH /branches/:id, PATCH /branches/:id/status | yes (companyId in `scopeWhere`, create forces own company) | Creates `SUB_ADMIN` only. |
| GET /shops/options, /shops/stats, GET/POST /shops, GET/PATCH /shops/:id, PATCH /shops/:id/status | yes | `branchId` checked with `assertActiveInCompany`. Creates `SHOP_ADMIN` only. |
| GET/POST /employees, GET/PATCH /employees/:id | yes | `permissions` limited to enum; role fixed to EMPLOYEE. |
| PATCH /users/:id/status, POST /users/:id/revoke-sessions | yes (`manageable`: same company, lower role) | |
| catalog (manageBrands + manageProducts): categories/options, brands/options, GET/POST brands, PATCH brands/:id, GET/POST products, GET/PATCH/DELETE products/:id, PATCH products/:id/status, POST products/:id/images, PATCH/DELETE products/:id/images/:imageId | yes (company in `scopeWhere`; brand edit `{id, companyId}`; variant ids checked against product) | |
| GET /inventory/dashboard, GET /inventory, GET /inventory/movements | yes (companyId) | `branchId` query only narrows. |
| POST /inventory/adjust | **partial** | Variant company is checked, but body `branchId` is not (C1). |
| POST /inventory/batch-adjust | **no** | Variants not company-checked; branch taken from the foreign variant (C1). |
| PATCH /inventory/threshold | **no** | No variant or branch ownership check (C1). |
| GET /orders/dashboard, /orders, /orders/:id, /orders/:id/invoice, PATCH /orders/:id/status, /shipping, /payment, POST /orders/:id/cancel-review | yes (`buildScopeWhere`, `get()` first) | |
| GET /returns, PATCH /returns/:id, PATCH /returns/:id/status | yes (companyId) | |
| promotions (mountPromotions, 13 routes as above) | yes (company filter on read/write) | M3 (connect foreign ids). |

### 1.5 `/branch-admin` (branchAdmin.routes.ts): `J` + `R(SUB_ADMIN)` on all

| Route | Scope-checked? | Note |
|---|---|---|
| GET /dashboard, /overview, /profile | yes (branch) | |
| GET /shops/options, /shops/stats, GET/POST /shops, GET/PATCH /shops/:id | yes (branch) | |
| PATCH /shops/:id/status | yes | Service-level 403 for SUB_ADMIN (company admin only). |
| GET/POST /employees, GET/PATCH /employees/:id | yes (company+branch) | Cannot move employee out of branch. |
| PATCH /users/:id/status, POST /users/:id/revoke-sessions | yes (same branch, SHOP_ADMIN/EMPLOYEE only) | |
| catalog (manageProducts): same list as 1.4 minus brand writes | partial | Reads are company-wide (all branches' products); edits limited to products created in own branch (`canEdit`). |
| GET /products-pricing, POST /products-pricing/save, POST /products-pricing/bulk | yes (branch products) | |
| GET /inventory/dashboard, /inventory, /inventory/movements | yes (branch) | |
| POST /inventory/adjust, /inventory/batch-adjust, PATCH /inventory/threshold | **partial/no** | Branch fixed to own, but variants not ownership-checked in batch/threshold (C1). |
| GET /transfers, /transfers/summary, /transfers/:id, /transfers/:id/sources, POST /transfers/:id/decision | yes (company+branch; `assertShopInBranch`) | |
| GET /sales-bills, /summary, /export, /:id | yes (company+branch) | |
| GET /customer-dues, /summary, /export, /:id; POST /reminders; PATCH /:id/limit | yes (company+branch; `updateMany` with base scope) | |
| GET /purchase-bills, /summary, /:id | yes | |
| GET/POST /suppliers, GET /suppliers/next-receipt, GET /suppliers/:id/ledger, POST /suppliers/payment | yes (branch) | |
| GET /stock/summary, POST /stock/adjust, POST /stock/physical-count | partial | Company-wide variant list and cost prices (M2); variant company-checked. |
| GET /stock-adjustments/next-number, /variants, GET/POST /stock-adjustments | partial | Same. |
| GET /barcode-labels/purchase-bills, /bills/:billId/items, /products, /reprint-batches, POST /print | yes (branch) | Branch wide, not shop wide (M2). |
| GET /day-close, POST /day-close/resolve-difference, /bank-deposit | yes (shop in branch) | |
| GET/POST /expenses | yes | |
| GET /approvals, POST /approvals/:id/decision | yes | |
| GET /reports/pnl | yes | |
| GET /staff-overview, POST /staff-overview/invite | yes | `shopId` checked in branch. |
| GET /staff-requests, POST /staff-requests/:id/decision | yes | |
| GET /shop-assignment, POST /shop-assignment/move | yes (employee and target shop in branch) | |
| GET/PATCH /branch-profile | yes (`updateMany` with id+company) | |
| GET /credit-notes, /summary, /:id, POST /:id/decision | yes | |
| GET /orders/dashboard, /orders, /orders/:id, /invoice, PATCH status/shipping/payment, POST cancel-review | yes (branch) | |
| GET /returns | yes (branch via order) | Dashboard returns count is company-wide (H1). |
| PATCH /returns/:id | **no (company wide)** | Branch admin can process any return in the company (H1). |
| promotions (13 routes) | yes (company+branch) | |

### 1.6 Shop routes: mounted at `/shop-admin` (R: SHOP_ADMIN, SUPER_ADMIN, ADMIN, SUB_ADMIN) and `/employee` (R: EMPLOYEE + EG)

Employee module in brackets, `r/w` as in `employeeAccess.ts`. Routes whose first segment is not in `RULES` are closed to employees.

| Route | Employee guard | Scope-checked? | Note |
|---|---|---|---|
| GET/POST /employees, GET/PATCH /employees/:id | closed | yes (company/branch/shop by role) | Shop admin can create employees directly, bypassing the staff-request approval flow (M4). SUPER_ADMIN gets scope `{}` = platform wide here (M8). |
| PATCH /users/:id/status, POST /users/:id/revoke-sessions | closed | yes (`manageable`) | Shop admin: own-shop employees only. |
| GET /categories/options, GET/POST /categories, GET/PATCH/DELETE /categories/:id (and subcategories, colors, sizes: same 5 patterns each) | masters r(masters/products) w(masters) | yes (company) | Company-wide masters writable by any shop admin, `masters.edit` employee, and branch admin/company admin through this mount (M9). Platform rows protected (`owned`). |
| GET/POST /products, GET/PATCH/DELETE /products/:id, POST /products/:id/images, PATCH/DELETE /products/:id/images/:imageId, POST /products/:id/previews, /images/:imageId/clean, /images/:imageId/professional, DELETE /products/:id/previews/:previewId, GET /ai-status | products | yes (`scopeWhere` company+shop; image/preview ids checked against product) | AI endpoints have no throttle (L6). |
| GET /inventory/dashboard, /inventory, /inventory/movements | inventory r(stock,billing,products) | partial | Movements and dashboard "recent" are branch-wide, not shop (M2). |
| POST /inventory/adjust, /inventory/batch-adjust, PATCH /inventory/threshold | inventory w(stock) | **partial/no** | C1, plus other-shop variants in same company are accepted (M2). |
| promotions (13 routes) | closed | yes | Shop scope = own shop's rows only. |
| GET/POST /purchase-bills, GET/PATCH/DELETE /purchase-bills/:id, POST /:id/confirm, /cancel, /payments | purchase | yes (`lock()`/`getPurchase` with shopId) | Variant ids restricted to own shop's products. |
| GET /customers, /sales-bills/customers, /sales-bills/find, /sales-bills/by-number/:billNumber, GET/POST /sales-bills, GET/PATCH/DELETE /sales-bills/:id, POST /:id/confirm, /cancel, /payments | sales-bills r/w billing, customers r(billing,customers) | yes (shopId) | Bill number lookup is shop-scoped. |
| GET/POST /credit-notes, GET /credit-notes/returnable, GET /credit-notes/:id | credit-notes billing | yes (shop) | |
| GET /customers/online, GET/POST /customers, GET/PATCH /customers/:id, POST /customers/import | customers r(billing,customers) w(customers) | yes (shopId) | Any customer writer can set `creditLimit` (M4). `/customers` GET is shadowed by the earlier bills route (functional). |
| GET /credit/metrics, /credit/customers, /credit/customers/:customerId/statement, /credit/next-receipt, POST /credit/customers/:customerId/payment, GET /credit/reminders | credit customers | yes (`{id, shopId}`) | |
| GET/POST /suppliers, GET /suppliers/next-receipt, GET /suppliers/:id/ledger, POST /suppliers/payment | suppliers purchase | yes (branch) | Suppliers belong to the branch, so all shops of a branch share them. |
| GET /stock/summary, POST /stock/adjust, POST /stock/physical-count | stock | partial | Company-wide variant list with cost estimates (M2). |
| GET /stock-adjustments/next-number, /variants, GET/POST /stock-adjustments | stock-adjustments stock | partial | Same. |
| GET /barcode-labels/purchase-bills, /bills/:billId/items, /products, /reprint-batches, POST /print | barcode-labels r/w (stock, purchase) | partial | Branch wide (M2). |
| GET /purchase-returns/next-number, /suppliers, /bills, /earlier, POST /purchase-returns, GET /purchase-returns/:id | purchase-returns purchase | partial | POST accepts unchecked `variantId`/`purchaseBillItemId` (M1); GET by id is shop-scoped. |
| GET /dashboard | dashboard | yes (shop) | |
| GET /counter/current, POST /counter/open, /counter/close | counter billing | yes | |
| GET /expenses/next-number, GET/POST /expenses | expenses accounts | yes | |
| GET /reports/pnl | reports | yes (own shop) | |
| GET /staff, PATCH /staff/:id/rights, PATCH /staff/:id/shift, POST /staff/:id/attendance, GET/POST /staff-requests | closed | yes (`employeeOf` shop) | |
| GET /cash-book, POST /cash-book/entries, /bank-deposit, /close | cash-book accounts | yes | |
| GET /transfers/shops, /transfers/variants, GET/POST /transfers, GET /transfers/:id, POST /:id/dispatch, /:id/receive | transfers stock | yes (from/to shop must be own) | |
| GET /orders/dashboard, /orders, /orders/:id, /invoice, PATCH /orders/:id/status, /shipping, /payment, POST /orders/:id/cancel-review | orders | yes (shopId) | |
| GET /returns, PATCH /returns/:id | returns orders | yes (shopId) | |

Employee guard path-bypass attempts I traced (all fail closed): mixed case (`/employee/Employees` -> segment not in `RULES` -> 403), double slashes, trailing slash, `HEAD`/`OPTIONS` (read only), method override (none installed), encoded segments (Express does not decode the matched path, so no route matches). No bypass found.

### 1.7 `/store` (store.routes.ts)

| Route | Guards | Scope-checked? | Note |
|---|---|---|---|
| GET /store/home, /products, /products/:idOrSlug, /search/suggest | none | n/a | Only PUBLISHED products of ACTIVE shop+company. Returns variant ids and exact per-variant stock (see C1 amplifier, L3). |
| GET /store/coupons | none | no | Lists every active coupon including shop/branch-specific (M6). |
| GET /store/delivery/:pincode | none | n/a | Static estimate, no data. |
| GET /store/payment-config, /help | none | n/a | Returns Razorpay key id (public by design). |
| POST /store/support | none, authLimiter | n/a | Successful posts not throttled (M7). |
| POST /store/auth/forgot-password, /auth/reset-password | none, authLimiter | n/a | Customers only (`role: USER`). |
| GET /cart, POST /cart/items, PATCH/DELETE /cart/items/:id | J + R(USER) | yes (`cart.userId`) | |
| GET /wishlist, /wishlist/ids, POST/DELETE /wishlist/:id | J + R(USER) | yes (userId) | |
| GET/POST /addresses, PATCH/DELETE /addresses/:id | J + R(USER) | yes (`{id,userId}`) | |
| POST /checkout | J + R(USER) | yes | Prices from DB, address owner checked. Coupon `branchId` not enforced (M6). |
| POST /payments/verify, /failed, /retry, /cod, GET /payments/:razorpayOrderId | J + R(USER) | yes (`customerId` + razorpay order) | State issues are in 01-review H2/H3. |
| POST /products/:id/reviews, GET /reviews | J + R(USER) | yes (delivered order of this user) | |
| GET/PATCH /profile, POST /profile/password, POST /support/mine | J + R(USER) | yes | |
| POST /uploads | J + R(USER) | n/a | customer photo upload. |
| GET /orders, GET /orders/:id, POST /orders/:id/cancel, /return, /buy-again, GET /returns | J + R(USER) | yes (`{id, customerId}`) | |
| GET /notifications, /notifications/unread, POST /notifications/read-all, /notifications/:id/read | J + R(USER) | yes (userId) | |

## 2. Findings

Ranked. Each has a verified exploit unless marked unverified.

### Critical

**C1. Any company admin can change another company's stock (cross-tenant write in inventory adjust/threshold)**
- File: `services/inventory.service.ts:829-940` (`batchAdjust`), `:946-970` (`updateThreshold`), `:699-740` (`adjustStock`), `:176-215` (`resolveBranchId`). Routes: `POST /company-admin/inventory/batch-adjust`, `PATCH /company-admin/inventory/threshold`, `POST /company-admin/inventory/adjust` (same three also under `/branch-admin`, `/shop-admin`, and `/employee` with `stock.edit`).
- Wrong: `batchAdjust` loads variants by id only (`:843-852`, checks they exist, never that `product.companyId === scope.companyId`). For a company admin (`scope.branchId` unset) `resolveBranchId` returns the body `branchId`, else the branch of `variants[0]`'s shop, i.e. the victim's branch. `updateThreshold` does no ownership check at all and upserts an `inventory` row for any `variantId` and any `branchId`. `adjustStock` checks the variant's company but still accepts any body `branchId`, so a company admin can write rows and movements into another company's branch.
- Exploit: take a variant id from the public storefront (`GET /store/products/<slug>` returns `variants[].id`). As an admin of company A: `POST /api/v1/company-admin/inventory/batch-adjust` body `{"type":"DECREASE","reason":"x","items":[{"variantId":"<B variant uuid>","quantity":9999}]}` (quantity capped by current stock, so use the exact stock the storefront shows). Company B's stock for that item drops to 0 and the sale shows as "out of stock". `INCREASE` inflates it so B oversells. `PATCH /company-admin/inventory/threshold {"variantId":"<B>","branchId":"<B branch>","threshold":0}` silences B's low-stock alerts. Lower roles (branch/shop admin, employee with stock.edit) cannot reach the victim branch but can create stray inventory rows and overwrite `Product.stockQuantity` of foreign products via `syncProductStock` (`:154-165`) using their own branch's quantities.
- Fix: in all three methods require `variant.product.companyId === scope.companyId` (and `shopId` for shop scope); for company admins validate `branchId` with `branchService.assertActiveInCompany(scope.companyId, branchId)`; reject the request instead of deriving the branch from a variant.

**C2. Legacy checkout `POST /users/orders/checkout` lets a caller mark the order PAID, pick the shop/company, use negative quantities, and works for any logged-in role**
- File: `routes/user.routes.ts:35` (only `verifyJWT`, no `checkRole(USER)`), `services/order.service.ts:910-1140`; the frontend still calls it (`frontend/src/lib/api/order.ts:126`).
- Wrong: (a) `initialPaymentStatus = PAID` when body `paymentMethod==='ONLINE'` and `paymentDetails.transactionId` is any truthy value (`:1047-1049`), with no Razorpay verification. (b) `companyId/shopId/branchId` come from the body first (`:945-947`), so an order and its stock deduction can be pointed at any company/branch; the coupon lookup also uses the body `companyId`. (c) `items[].quantity` is never validated: a negative quantity passes the stock check (`:976`), makes `totalPrice` negative and later adds stock back (`applyStockChanges` with positive delta). (d) No per-customer or usage limit on coupons here (the `/store` flow has them).
- Exploit: `POST /api/v1/users/orders/checkout` as any signed-in customer: `{"items":[{"variantId":"<A, 1000 INR>","quantity":1},{"variantId":"<B, 1000 INR>","quantity":-1}],"shippingAddress":{...},"paymentMethod":"ONLINE","paymentDetails":{"transactionId":"x"}}`. Subtotal becomes 0, fee 50, status PAID, goods shipped by the shop, and B's stock is inflated. Without the negative item the order is simply created as PAID with no money.
- Fix: delete this endpoint (the `/store` checkout replaces it) or put it behind `checkRole(USER)`, drop `companyId/shopId/branchId/paymentDetails` from the input type, validate `quantity` as an integer 1..10 with zod, and never derive `PAID` from client data.

### High

**H1. A branch admin can read counts of and process return requests for the whole company (cross-branch)**
- File: `services/order.service.ts:791-800` (`updateReturnStatus` where clause), also `:147-153` (dashboard return count). Route: `PATCH /branch-admin/returns/:id`.
- Wrong: the clause is `scope.shopId ? shopId : scope.companyId ? companyId : {}`. For a branch admin `shopId` is empty, so it falls to `companyId`. `listReturns` (`:719-725`) correctly uses the branch, but the update does not. The update then runs the restock path against `item.order`'s branch.
- Exploit: branch admin of branch X: `PATCH /api/v1/branch-admin/returns/<return id of branch Y>` body `{"returnStatus":"APPROVED"}` then `RECEIVED` with `restock:true`, `refundStatus:"PROCESSED"`. Return ids are uuids (needs one id, e.g. from a shared support ticket/email); effect is another branch's refund and stock changed.
- Fix: add the same branch branch as `listReturns` (`order: {branchId}`) to the where in `updateReturnStatus`, and in the dashboard count.

### Medium

**M1. Purchase return accepts unchecked variant/bill item ids and decrements any stock in the branch**
- File: `services/purchaseReturn.service.ts:184-296` (`createPurchaseReturn`, esp. `:280-290`), controller `controllers/purchaseReturn.controller.ts`.
- Wrong: `items[].variantId`, `purchaseBillItemId`, `boughtQty`, `unitCost` come from the body and are never matched to the bill or the shop. With `status:"CONFIRMED"`, `inventory.findFirst({branchId, variantId})` decrements stock for any variant that has a row in the bill's branch, including another shop's. Without `purchaseBillId` the branch used is `scope.shopId` (a shop id, never a branch id), so the stock step silently does nothing and the return is still saved. A forged `unitCost` also reduces the bill's payable (`:293-303`).
- Exploit: shop employee with `purchase.edit`: `POST /api/v1/employee/purchase-returns` `{"purchaseBillId":"<own bill>","status":"CONFIRMED","items":[{"variantId":"<other shop's variant in same branch>","returnQty":50,"unitCost":1,...}]}`; that shop's stock drops.
- Fix: load the bill's items (`shopId` scoped), require each `purchaseBillItemId` to belong to it, take variant/cost from the item, cap `returnQty` at what remains; use the shop's `branchId` always.

**M2. Shop-level users see and write branch/company-wide inventory data (cross-shop)**
- File: `services/inventory.service.ts:974-1060` (`movements`: only `branchId`/company), `:420-445` (`list` is shop scoped; `getDashboard` recent movements `:350-356` not), `services/stock.service.ts:102-175` and `:358-380` (company-wide variants, cost prices from other shops' purchase bills), `services/stockAdjustment.service.ts:66-100,205-215`, `services/barcodeLabel.service.ts:16-60,147` (branch purchase bills), `inventory.service.ts:699-740` (adjust any company variant).
- Wrong: scope for shop admin/employee is the branch or company, not the shop. An employee with `stock.view` (or `billing.view` for `/inventory/movements`) reads other shops' movements, stock, cost estimates and purchase bills (supplier names); with `stock.edit` can adjust stock rows of other shops' variants at the branch.
- Exploit: `GET /api/v1/employee/stock/summary` or `/barcode-labels/purchase-bills` returns rows for every shop in the branch/company.
- Fix: add `product.shopId = scope.shopId` (shop users) in these queries and in the variant ownership check; keep branch-wide views to branch/company admins.

**M3. Offers can be attached to foreign products/categories, leaking their names**
- File: `services/promotion.service.ts:346-354` (`connect` on create), update uses `set` (`:430-440`, same pattern); controller parses ids from the body (`controllers/promotion.controller.ts:70-90`).
- Wrong: `productIds/categoryIds/subcategoryIds` are connected without checking they belong to the caller's company; the response includes `products {id,name,sku}`.
- Exploit: `POST /api/v1/company-admin/promotions/offers` with `applicableOn:"SELECTED_PRODUCTS"`, `productIds:["<other company's product uuid>"]` returns that product's name and SKU. Offers are not applied to prices elsewhere (only coupons are), so the effect is a data leak and a stray relation.
- Fix: filter ids with `where: {id: {in: ids}, companyId}` and reject on mismatch.

**M4. Server-side rights are mostly cosmetic; shop users can exceed what the branch admin approves**
- File: `config/permissions.ts` (`pos.bill`, `sales.discount`, `sales.credit`, `cash.manage`, `stock.transfer`, `inventory.adjust`, `orders.process` are defined and shown on the Staff & rights page) but a grep over `src` shows they are never read by any guard or service (only `products.manage/publish` in `product.service.ts`). `validations/customer.validation.ts:21`, `services/customer.service.ts:139` (any `customers.edit` user sets `creditLimit`); `routes/shopAdmin.routes.ts:16` + `services/employee.service.ts:99` (shop admin creates employees directly).
- Wrong: an employee with `billing.edit` can give any discount and credit sales; a customer writer can raise `creditLimit` although limits are the branch admin's call (`PATCH /branch-admin/customer-dues/:id/limit`); the shop admin can `POST /shop-admin/employees` instead of the staff-request flow that the branch admin approves. Whether `creditLimit` is enforced at billing: unverified.
- Exploit: `PATCH /api/v1/employee/customers/<id>` `{"creditLimit":10000000}`.
- Fix: enforce the rights in the billing/cash/stock services (or drop them from the UI), remove `creditLimit` from the shop update schema, and restrict `POST /employees` to branch/company admins.

**M5. Profile update changes the login phone without validation or uniqueness check**
- File: `validations/user.validation.ts:75-81` (`phoneNumber: z.string().trim().optional()`), `services/user.service.ts:343-349`.
- Wrong: any role can set any string as `phoneNumber` via `PATCH /users/update`; uniqueness is only the DB constraint (500 on clash), the 10-digit phone rule is bypassed, and `username` keeps the old number. `loginUser` matches `phoneNumber OR username`, `registerCustomer` only checks `phoneNumber`. After a change the old number is "free" to register but still matches the first account's `username`.
- Exploit: customer A registers 9000000001, changes phone to 9000000002 via `PATCH /users/update {"phoneNumber":"9000000002"}`. Victim V registers 9000000001: login for V now races with A's username match (`findFirst` has no ordering), locking V out or hitting the wrong row. Also lets staff set a free-form phone that the staff forms would reject. Impact depends on DB row order: unverified beyond the code reading.
- Fix: use the same phone `field()` rule, check uniqueness with `ensureLoginIsFree`, update `username`, and require the current password (or OTP) for login-identifier changes.

**M6. Public coupon list exposes every active coupon code; branch scope of coupons is ignored**
- File: `services/store/customer.service.ts:458-466` (`publicCoupons`, used by `GET /store/coupons` and `/store/home` at `services/store/catalog.service.ts:502-510`), `couponFor` `:137-170`.
- Wrong: no filter on `shopId/branchId/companyId`, so private shop or branch coupons created by a shop admin appear to anonymous users; `couponFor` checks company and shop but not `coupon.branchId`.
- Exploit: `GET /api/v1/store/coupons` (no auth) lists all codes; a coupon meant for one branch applies to carts from other branches of the same company.
- Fix: expose only coupons marked public (add a flag) or only company/global ones; add `branchId` to the eligibility filter.

**M7. Rate limiter never counts successful requests, so mail/ticket/account spam is unlimited**
- File: `middlewares/rateLimiter.ts:7` (`skipSuccessfulRequests: true`); used on `POST /users/forgot-password`, `/users/register`, `/store/support`, `/store/auth/forgot-password` (all return 2xx on success).
- Wrong: those endpoints always succeed, so the counter stays at zero. This confirms 01-review M3/M5 with the exact routes.
- Exploit: loop `POST /api/v1/users/forgot-password {"identifier":"victim@x.com"}` to mail-bomb a victim with reset links; loop `/store/support` to fill the support table; loop `/users/register` to create accounts.
- Fix: separate limiter (not skipping successes) for these four routes, keyed by IP and by identifier.

**M8. Super admin bypasses its own permission matrix and gets platform-wide scope on `/shop-admin`**
- File: `routes/shopAdmin.routes.ts:165-169` (`checkRole([SHOP_ADMIN, SUPER_ADMIN, ADMIN, SUB_ADMIN])`, no `checkPermission`), `controllers/org.controller.ts:25-31` (`scopeOf` returns `{}` for SUPER_ADMIN), `services/employee.service.ts:25-31`.
- Wrong: SUPER_ADMIN can list, read and update any employee (including `permissions` and `password`) and manage promotions/orders through `/shop-admin/*` without `users.edit`/`orders.view`. `scopeWhere` with `companyId: undefined` means "no filter". Since SUPER_ADMIN permissions come from the `RolePermission` table, removing a permission in the DB has no effect on these paths.
- Exploit: `PATCH /api/v1/shop-admin/employees/<any employee id>` `{"password":"NewPass1"}` with a super-admin token lacking `users.edit`.
- Fix: remove SUPER_ADMIN from the shop mount (it has its own panel), or add the matching `checkPermission`.

**M9. Company-wide master data is writable by every shop admin, branch admin and `masters.edit` employee**
- File: `routes/shopAdmin.routes.ts:36-58`, `controllers/master.controller.ts:7-13` (`companyOf`), `services/master.service.ts:176-203,296-330,413-441,504-521`.
- Wrong: categories, subcategories, colors and sizes belong to the company and are shared by all shops, but the only check is "same company, not platform row". A single shop's staff can rename or delete masters that other shops use (delete is blocked only when products exist).
- Exploit: `DELETE /api/v1/employee/colors/<id>` with `masters.edit` removes an unused company color that another shop was about to use; `PATCH` renames it everywhere.
- Fix: limit master writes to company admin (or add an owning `shopId`), keep read-only for shops.

### Low

**L1. Password changes made by an admin do not invalidate existing access tokens**
- File: `services/shop.service.ts:~170-190`, `services/branch.service.ts:~175-200`, `services/company.service.ts:~195-210`: set `refreshToken: null` but not `sessionsRevokedAt`; `verifyJWT` relies on `sessionsRevokedAt`. Access token lifetime not checked (unverified). `employee.service.ts` does it correctly. Fix: set `sessionsRevokedAt` in all three.

**L2. Branch admin sees all products of the company in catalog lists**
- File: `services/product.service.ts:88-96` (`scopeWhere` company-wide for every non-super role). Edits are restricted, reads are not. Likely intended; confirm. Fix: filter by branch if products should be branch-private.

**L3. Public product API returns exact stock and variant ids**
- File: `services/store/catalog.service.ts` (`stockOf` in `toCard`/`getProduct`). Exact counts help scraping and are the entry point for C1's variant ids. Fix: return `inStock` and "only N left" below a threshold.

**L4. Registration and coupon errors allow account/coupon enumeration**
- File: `services/user.service.ts:196-212` (409 "This phone number / email already has an account"), `services/store/customer.service.ts:139-150` (distinct messages per coupon state), `validateCoupon` in `promotion.service.ts:732-760` lets any shop/branch admin probe any global coupon. Fix: generic messages and rate limit.

**L5. Swagger UI is public**
- File: `config/swagger.ts`, `app.ts:55`. Exposes route annotations (currently nearly empty). Fix: disable in production.

**L6. AI preview/photo endpoints have no throttle**
- File: `routes/shopAdmin.routes.ts:50-56`, `services/aiPreview.service.ts:227-340`. An employee with `products.edit` can burn the AI quota or cost. Fix: per-shop daily cap.

**L7. Online-customer PII visible to billing-only employees**
- File: `middlewares/employeeAccess.ts:30` (`customers` read allows `billing.view`), `controllers/customer.controller.ts:35-60` (`/customers/online` returns name, phone, email, spend). Fix: require `customers.view` for `/customers/online`.

## 3. Checked and found fine

- Mass assignment: no endpoint accepts `role`, `companyId`, `branchId`, `shopId`, `status` (user), `permissions` (except the enum list for employees) through zod bodies; public sign-up forces `USER`; org create flows force the child role (ADMIN creates SUB_ADMIN/SHOP_ADMIN/EMPLOYEE only; branch admin creates SHOP_ADMIN/EMPLOYEE only; only super admin creates ADMIN). Status/session actions use `accountService.manageable` (same company/branch/shop, lower role, not self, 404 on mismatch).
- IDOR on the main objects is closed: bills, credit notes, customers, credit, orders, transfers, cash book, products and images, store orders/addresses/cart all use `findFirst`/`updateMany` with scope in the `where`.
- No public order lookup by number; delivery pincode is static; store catalog filters on PUBLISHED + ACTIVE.
- Employee module guard is fail-closed (see 1.6).

## 4. Not covered / unverified

- Whether access tokens outlive a password change (L1) depends on `config.jwt` expiry, not read.
- `dashboard.service.ts`, `branchOverview.service.ts`, `branchExpense/branchApproval/dayClose` internals were skimmed for scope clauses (all use branch/shop ids from `req.user`); no deep line-by-line pass on report math.
- Frontend behaviour was not reviewed (only used to confirm that `/users/orders/checkout` is still called).
