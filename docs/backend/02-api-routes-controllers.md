# 02 - API Routes, Controllers and Validations

Beginner guide to how an HTTP request travels through the backend (`backend/src`), which URL maps to which function, and who is allowed to call it.

Source files covered: `routes/*`, `controllers/*`, `validations/*`, plus `config/permissions.ts`, `config/swagger.ts` and the guards in `middlewares/`.

---

## 1. The big picture (read this first)

```
Browser / app
   |  HTTP request, e.g. POST /api/v1/shop-admin/sales-bills
   v
app.ts            ->  app.use('/api/v1', routes)
routes/index.ts   ->  picks the router by the first path word (/shop-admin ...)
router file       ->  runs guards (verifyJWT, checkRole, checkPermission) then the handler
controller        ->  validates input with a zod schema (validations/ or a service), calls a service
service           ->  business rules + database (Prisma)
controller        ->  replies with ApiResponse {statusCode, data, message}
```

Plain-language definitions:

| Term | Meaning |
|---|---|
| Route | A URL + HTTP method, e.g. `GET /api/v1/users/me`. |
| Controller | The function that handles a route. It reads the request, validates it, calls a service and sends the reply. Wrapped in `catchAsync` so errors go to the error handler. |
| Validation schema | A `zod` object that describes what the request body / query / params must look like. `schema.parse(req.body)` throws if the data is wrong (becomes a 400 error). |
| Guard (middleware) | A function that runs before the controller and can stop the request. |
| Scope | Which company / branch / shop the data belongs to. It is always taken from the logged-in user (`req.user`), never from the request. |

Important fact for beginners: **validation is called inside the controller**, not as route middleware. The route files never mention schemas; look at the controller function to see which schema it uses. The tables below list the schema each controller function uses.

Example (`controllers/shopOps.controller.ts`):

```ts
const {openingCash} = v.openCounterSchema.parse(req.body);   // validate
const after = await counterService.open(scope, req.user.id, openingCash); // service
return ok(res, after, 'Counter opened', 201);                // reply
```

---

## 2. How routes are mounted

Everything lives under **`/api/v1`** (`app.ts`: `app.use('/api/v1', routes)`). Swagger UI is at `/api-docs` (`config/swagger.ts` reads `./src/routes/*.ts`). `routes/index.ts` mounts:

| Base path | Router file | Notes |
|---|---|---|
| `/api/v1/users` | `user.routes.ts` | Login, register, profile, customer orders. |
| `/api/v1/companies` | `company.routes.ts` | Company CRUD (super admin only). |
| `/api/v1/super-admin` | `superAdmin.routes.ts` | Platform-wide views. Also mounts catalog + promotions. |
| `/api/v1/company-admin` | `companyAdmin.routes.ts` | Company-scoped admin. Also mounts catalog + promotions. |
| `/api/v1/branch-admin` | `branchAdmin.routes.ts` | Branch-scoped admin. Also mounts catalog + promotions. |
| `/api/v1/shop-admin` | `shopAdmin.routes.ts` (default export) | Shop login: the full shop API. |
| `/api/v1/employee` | `employee.routes.ts` | Same shop API (`shopRoutes`), limited per module. |
| `/api/v1/store` | `store.routes.ts` | Customer storefront (public + signed-in customer). |

Helper "mount" files are not mounted by `index.ts`. They are functions that other routers call to add routes:

| Helper file | Function | Called by | Adds (relative paths) |
|---|---|---|---|
| `catalog.routes.ts` | `mountCatalog(router, access)` | superAdmin, companyAdmin, branchAdmin | `/categories`, `/brands`, `/products` ... |
| `promotion.routes.ts` | `mountPromotions(router)` | superAdmin, companyAdmin, branchAdmin, shopAdmin | `/promotions/...` |
| `bill.routes.ts` | `mountBills(router)` | shopAdmin | `/purchase-bills`, `/sales-bills`, `/customers` (bill lookups) |
| `shopOps.routes.ts` | `mountShopOps(router)` | shopAdmin | `/dashboard`, `/counter/*`, `/expenses` |
| `staffCash.routes.ts` | `mountStaffCash(router)` | shopAdmin | `/staff*`, `/cash-book*`, `/transfers*` |

So the full path of a helper route is `<router base>` + `<relative path>`. Example: `mountBills` adds `/sales-bills`, so shops reach it at `/api/v1/shop-admin/sales-bills` and employees at `/api/v1/employee/sales-bills`.

### 2.1 Who guards what

Roles come from the Prisma `Role` enum. Guards are in `middlewares/auth.middleware.ts`.

| Router | Guard chain | Roles allowed |
|---|---|---|
| `/users` | public routes (some with `authLimiter`), then `verifyJWT` for the rest | Public, then any signed-in user. |
| `/companies` | `verifyJWT`, `checkSuperAdmin`, then `checkPermission('companies.*')` per route | `SUPER_ADMIN` with the permission. |
| `/super-admin` | `verifyJWT`, `checkSuperAdmin`; some routes add `checkPermission` | `SUPER_ADMIN`. |
| `/company-admin` | `verifyJWT`, `checkCompanyAdmin` (= role `ADMIN`) | `ADMIN` (company admin). |
| `/branch-admin` | `verifyJWT`, `checkBranchAdmin` (= role `SUB_ADMIN`) | `SUB_ADMIN` (branch admin). |
| `/shop-admin` | `verifyJWT`, `checkRole([SHOP_ADMIN, SUPER_ADMIN, ADMIN, SUB_ADMIN])` | Shop admin; the three higher roles are also allowed "for management". |
| `/employee` | `verifyJWT`, `checkRole(EMPLOYEE)`, `employeeModuleGuard` | `EMPLOYEE` with module rights. |
| `/store` | public routes first; then `verifyJWT`, `checkRole(USER)` | Public, then `USER` (customer). |

What each guard does:

| Guard | What it checks |
|---|---|
| `verifyJWT` | Access token (cookie `accessToken` or `Authorization: Bearer`). Loads the user, rejects deleted/blocked/suspended accounts and tokens issued before "revoke sessions". Fills `req.user` (id, role, companyId, branchId, shopId, permissions). |
| `checkRole(role or roles)` | `req.user.role` must be in the list, else 403. |
| `checkPermission('x.y')` | The user's permission list (from `permissionService`) must contain `x.y`, else 403. Only the super-admin and company routes use it. |
| `employeeModuleGuard` | See 2.2. |
| `authLimiter` | Rate limit (every request counts) on register, password reset, support form and change-password. |
| `loginLimiter`, `loginIpLimiter` | Login rate limits: failed attempts per IP and account, and all attempts per IP. |
| `imageUpload` / `customerPhotoUpload` | Multer upload middleware for image files. |

Role names in plain words: `SUPER_ADMIN` = platform owner; `ADMIN` = company admin; `SUB_ADMIN` = branch admin; `SHOP_ADMIN` = shop admin; `EMPLOYEE` = shop staff; `USER` = online customer.

Note: `checkPermission` is used on `/companies` and on some `/super-admin` routes (permission names in `config/permissions.ts` `PERMISSIONS`, e.g. `companies.view`, `branches.view`, `users.view`, `users.block`, `dashboard.view`). Company admin, branch admin and shop routes rely on the role plus the data scope (`req.user.companyId/branchId/shopId`) instead of per-route permissions.

### 2.2 Employee access (`/employee`)

`employee.routes.ts` reuses the whole shop router. `middlewares/employeeAccess.ts` then looks at the **first path segment** and maps it to a shop module (module list = `SHOP_MODULES` in `config/permissions.ts`). A read (GET/HEAD/OPTIONS) needs `<module>.view` or `<module>.edit`; a change (POST/PATCH/DELETE) needs `<module>.edit`. Anything not in the table is closed (403 "This is not available to employees").

| First path segment | Module(s) needed to read | Module needed to write |
|---|---|---|
| `dashboard` | dashboard | dashboard |
| `sales-bills`, `credit-notes`, `counter` | billing | billing |
| `orders`, `returns` | orders | orders |
| `customers` | billing or customers | customers |
| `credit` | customers | customers |
| `purchase-bills`, `purchase-returns`, `suppliers` | purchase | purchase |
| `products`, `ai-status` | products | products |
| `inventory` | stock, billing or products | stock |
| `stock`, `stock-adjustments`, `transfers` | stock | stock |
| `barcode-labels` | stock or purchase | stock or purchase |
| `cash-book`, `expenses` | accounts | accounts |
| `reports` | reports | reports |
| `categories`, `subcategories`, `colors`, `sizes` | masters or products | masters |
| everything else (`employees`, `users`, `staff`, `staff-requests`, `promotions`) | closed | closed |

### 2.3 Scope helpers (why the URL has no shop id)

| Helper | File | Behaviour |
|---|---|---|
| `shopOf(req)` | `controllers/scope.ts` (also copies in several controllers) | Returns `{companyId, shopId}` from `req.user`; 403 if the user has no shop. |
| `branchOf(req)` | `controllers/scope.ts` | Returns `{companyId, branchId}`; 403 if no branch. |
| `scopeOf(req)` | `ecommerce`, `org`, `promotion`, `stock*` controllers | Super admin: no filter. Company admin: `{companyId}`. Others: company + branch + shop from `req.user`. |
| `ok(res, data, message, status)` | `scope.ts` and controllers | Sends `ApiResponse`. |

In the tables, "Same as shop" means the shop/employee router; see section 3.5.

---

## 3. Router tables

Column notes:
- **Full path** is relative to `/api/v1`.
- **Validation** is the zod schema the controller applies. `-` means the controller applies none (id comes through unchecked, or there is no input). `idSchema` = UUID check on `:id`. `(svc)` means the schema lives in a service file, not in `validations/`.
- **Who** abbreviations: SA = SUPER_ADMIN, CA = ADMIN (company admin), BA = SUB_ADMIN (branch admin), SH = SHOP_ADMIN, EMP = EMPLOYEE (module rights), CUST = USER (customer).

### 3.1 `/users` (`user.routes.ts`, controller `userController`, schemas `userValidation`)

| METHOD | Full path | Controller function | Validation schema | Who | Purpose |
|---|---|---|---|---|---|
| POST | `/users/register` | `registerUser` | `registerUserSchema` | Public (rate limited) | Create an account. |
| POST | `/users/login` | `loginUser` | `loginUserSchema` | Public (rate limited) | Sign in, returns tokens. |
| POST | `/users/forgot-password` | `forgotPassword` | `forgotPasswordSchema` | Public (rate limited) | Email a reset link. |
| POST | `/users/reset-password` | `resetPassword` | `resetPasswordSchema` | Public (rate limited) | Set a new password with the token. |
| POST | `/users/refresh` | `refreshAccessToken` | - (refresh token cookie/body) | Public | Get a new access token. |
| POST | `/users/logout` | `logoutUser` | - | Any signed-in user | End the session. |
| POST | `/users/change-password` | `changePassword` | `changePasswordSchema` | Any signed-in user | Change own password. |
| GET | `/users/me` | `getCurrentUser` | - | Any signed-in user | Own profile + permissions. |
| PATCH | `/users/update` | `updateUser` | `updateUserSchema` | Any signed-in user | Edit own profile. |
| GET | `/users/orders` | `listCustomerOrders` | - (query read in controller) | Any signed-in user | List own orders. |
| GET | `/users/orders/:id` | `getCustomerOrder` | - | Any signed-in user | One own order. |
| POST | `/users/orders/:id/cancel` | `customerCancelOrder` | - | Any signed-in user | Request cancellation. |
| POST | `/users/orders/:id/return` | `customerReturnOrder` | - | Any signed-in user | Request a return. |

### 3.2 `/companies` (`company.routes.ts`, `companyController`, `companyValidation`)

All routes: `verifyJWT` + `checkSuperAdmin` + a permission.

| METHOD | Full path | Controller function | Validation schema | Who | Purpose |
|---|---|---|---|---|---|
| GET | `/companies` | `listCompanies` | `listCompaniesSchema` | SA + `companies.view` | List companies. |
| POST | `/companies` | `createCompany` | `createCompanySchema` (multipart, field `logo`) | SA + `companies.create` | Create a company. |
| GET | `/companies/:id` | `getCompany` | `companyIdSchema` | SA + `companies.view` | One company. |
| PATCH | `/companies/:id` | `updateCompany` | `companyIdSchema`, `updateCompanySchema` (field `logo`) | SA + `companies.edit` | Edit a company. |
| DELETE | `/companies/:id` | `deleteCompany` | `companyIdSchema` | SA + `companies.delete` | Delete a company. |

### 3.3 `/super-admin` (`superAdmin.routes.ts`)

Guard: `verifyJWT` + `checkSuperAdmin` for all routes. Controllers: `orgController` (`c`), `ecommerceController` (`e`).

| METHOD | Full path | Controller function | Validation schema | Who | Purpose |
|---|---|---|---|---|---|
| GET | `/super-admin/dashboard` | `c.superAdminDashboard` | - | SA + `dashboard.view` | Platform dashboard numbers. |
| GET | `/super-admin/branches` | `c.listBranches` | `branchListSchema` | SA + `branches.view` | All branches. |
| GET | `/super-admin/branches/:id` | `c.getBranch` | `idSchema` | SA + `branches.view` | One branch. |
| GET | `/super-admin/shops` | `c.listShops` | `shopListSchema` | SA + `branches.view` | All shops. |
| GET | `/super-admin/shops/stats` | `c.shopStats` | - | SA + `branches.view` | Shop counts. |
| GET | `/super-admin/shops/:id` | `c.getShop` | `idSchema` | SA + `branches.view` | One shop. |
| GET | `/super-admin/users` | `c.listUsers` | `userListSchema` | SA + `users.view` | All users. |
| PATCH | `/super-admin/users/:id/status` | `c.setUserStatus` | `idSchema`, `userStatusSchema` | SA + `users.block` | Block / unblock a user. |
| POST | `/super-admin/users/:id/revoke-sessions` | `c.revokeSessions` | `idSchema` | SA + `users.block` | Force a user to sign in again. |
| GET | `/super-admin/orders` | `e.listOrders` | - | SA | All online orders. |
| GET | `/super-admin/orders/:id` | `e.getOrder` | - | SA | One order. |
| GET | `/super-admin/inventory/dashboard` | `e.inventoryDashboard` | - | SA | Stock overview. |
| GET | `/super-admin/inventory` | `e.listInventory` | - | SA | Stock list. |
| GET | `/super-admin/inventory/movements` | `e.listMovements` | - | SA | Stock movement history. |
| GET | `/super-admin/returns` | `e.listReturns` | - | SA | Online order returns. |
| (catalog) | see 3.6 with `manageCategories`, `manageBrands` | | | SA | Global categories and brands; products view / unpublish only. |
| (promotions) | see 3.7 | | | SA | Platform promotions. |

### 3.4 `/company-admin` (`companyAdmin.routes.ts`)

Guard: `verifyJWT` + `checkCompanyAdmin`. Data is limited to the admin's own company.

| METHOD | Full path | Controller function | Validation schema | Who | Purpose |
|---|---|---|---|---|---|
| GET | `/company-admin/dashboard` | `c.scopedDashboard` | - | CA | Company dashboard. |
| GET | `/company-admin/profile` | `c.companyProfile` | - | CA | Own company details. |
| GET | `/company-admin/branches/options` | `c.branchOptions` | - | CA | Branch dropdown list. |
| GET | `/company-admin/branches` | `c.listBranches` | `branchListSchema` | CA | List branches. |
| POST | `/company-admin/branches` | `c.createBranch` | `createBranchSchema` | CA | Create a branch. |
| GET | `/company-admin/branches/:id` | `c.getBranch` | `idSchema` | CA | One branch. |
| PATCH | `/company-admin/branches/:id` | `c.updateBranch` | `idSchema`, `updateBranchSchema` | CA | Edit a branch. |
| PATCH | `/company-admin/branches/:id/status` | `c.setBranchStatus` | `idSchema`, `branchStatusSchema` | CA | Activate / suspend a branch. |
| GET | `/company-admin/shops/options` | `c.shopOptions` | `shopOptionsSchema` | CA | Shop dropdown list. |
| GET | `/company-admin/shops/stats` | `c.shopStats` | - | CA | Shop counts. |
| GET | `/company-admin/shops` | `c.listShops` | `shopListSchema` | CA | List shops. |
| POST | `/company-admin/shops` | `c.createShop` | `createShopSchema` | CA | Create a shop. |
| GET | `/company-admin/shops/:id` | `c.getShop` | `idSchema` | CA | One shop. |
| PATCH | `/company-admin/shops/:id` | `c.updateShop` | `idSchema`, `updateShopSchema` | CA | Edit a shop. |
| PATCH | `/company-admin/shops/:id/status` | `c.setShopStatus` | `idSchema`, `shopStatusSchema` | CA | Activate / suspend a shop. |
| GET | `/company-admin/employees` | `c.listEmployees` | `employeeListSchema` | CA | List employees. |
| POST | `/company-admin/employees` | `c.createEmployee` | `createEmployeeSchema` | CA | Create an employee. |
| GET | `/company-admin/employees/:id` | `c.getEmployee` | `idSchema` | CA | One employee. |
| PATCH | `/company-admin/employees/:id` | `c.updateEmployee` | `idSchema`, `updateEmployeeSchema` | CA | Edit an employee. |
| PATCH | `/company-admin/users/:id/status` | `c.setUserStatus` | `idSchema`, `userStatusSchema` | CA | Block / unblock a user. |
| POST | `/company-admin/users/:id/revoke-sessions` | `c.revokeSessions` | `idSchema` | CA | Force re-login. |
| GET | `/company-admin/inventory/dashboard` | `e.inventoryDashboard` | - | CA | Stock overview. |
| GET | `/company-admin/inventory` | `e.listInventory` | - | CA | Stock list. |
| POST | `/company-admin/inventory/adjust` | `e.adjustStock` | - (service) | CA | Adjust one variant's stock. |
| POST | `/company-admin/inventory/batch-adjust` | `e.batchAdjustStock` | - (service) | CA | Adjust many variants. |
| PATCH | `/company-admin/inventory/threshold` | `e.updateThreshold` | - (service) | CA | Set low-stock level. |
| GET | `/company-admin/inventory/movements` | `e.listMovements` | - | CA | Movement history. |
| GET | `/company-admin/orders/dashboard` | `e.orderDashboard` | - | CA | Order stats. |
| GET | `/company-admin/orders` | `e.listOrders` | - | CA | List online orders. |
| GET | `/company-admin/orders/:id` | `e.getOrder` | - | CA | One order. |
| PATCH | `/company-admin/orders/:id/status` | `e.updateOrderStatus` | - (service) | CA | Move order status. |
| PATCH | `/company-admin/orders/:id/shipping` | `e.updateOrderShipping` | - (service) | CA | Courier / tracking. |
| PATCH | `/company-admin/orders/:id/payment` | `e.updateOrderPayment` | - (service) | CA | Mark payment status. |
| POST | `/company-admin/orders/:id/cancel-review` | `e.reviewCancellation` | - (service) | CA | Approve / reject cancellation. |
| GET | `/company-admin/orders/:id/invoice` | `e.getOrderInvoice` | - | CA | Invoice data. |
| GET | `/company-admin/returns` | `e.listReturns` | - | CA | List returns. |
| PATCH | `/company-admin/returns/:id` and `/returns/:id/status` | `e.updateReturnStatus` | - (service) | CA | Update a return (two paths, same function). |
| (catalog) | see 3.6 with `manageBrands`, `manageProducts` | | | CA | Own brands, all company products. |
| (promotions) | see 3.7 | | | CA | Company promotions. |

### 3.5 `/branch-admin` (`branchAdmin.routes.ts`)

Guard: `verifyJWT` + `checkBranchAdmin`. Data limited to the admin's branch (`branchOf(req)`). Branch-only controllers keep their own schemas in the controller or service (`(svc)`).

**Branch setup and people**

| METHOD | Full path | Controller function | Validation schema | Who | Purpose |
|---|---|---|---|---|---|
| GET | `/branch-admin/dashboard` | `c.scopedDashboard` | - | BA | Dashboard. |
| GET | `/branch-admin/overview` | `c.branchOverview` | - | BA | Branch overview page. |
| GET | `/branch-admin/profile` | `c.branchProfile` | - | BA | Branch details. |
| GET | `/branch-admin/shops/options` | `c.shopOptions` | `shopOptionsSchema` | BA | Shop dropdown. |
| GET | `/branch-admin/shops/stats` | `c.shopStats` | - | BA | Shop counts. |
| GET / POST | `/branch-admin/shops` | `c.listShops` / `c.createShop` | `shopListSchema` / `createShopSchema` | BA | List / create shops. |
| GET / PATCH | `/branch-admin/shops/:id` | `c.getShop` / `c.updateShop` | `idSchema` / + `updateShopSchema` | BA | One shop / edit. |
| PATCH | `/branch-admin/shops/:id/status` | `c.setShopStatus` | `idSchema`, `shopStatusSchema` | BA | Shop status. |
| GET / POST | `/branch-admin/employees` | `c.listEmployees` / `c.createEmployee` | `employeeListSchema` / `createEmployeeSchema` | BA | List / create employees. |
| GET / PATCH | `/branch-admin/employees/:id` | `c.getEmployee` / `c.updateEmployee` | `idSchema` / + `updateEmployeeSchema` | BA | One employee / edit. |
| PATCH | `/branch-admin/users/:id/status` | `c.setUserStatus` | `idSchema`, `userStatusSchema` | BA | Block / unblock. |
| POST | `/branch-admin/users/:id/revoke-sessions` | `c.revokeSessions` | `idSchema` | BA | Force re-login. |
| GET | `/branch-admin/staff-overview` | `branchStaffController.list` | - | BA | Staff overview. |
| POST | `/branch-admin/staff-overview/invite` | `branchStaffController.invite` | `staffValidation.branchInviteSchema` | BA | Invite staff. |
| GET | `/branch-admin/staff-requests` | `staffController.branch.listRequests` | `staffRequestListSchema` | BA | Staff requests from shops. |
| POST | `/branch-admin/staff-requests/:id/decision` | `staffController.branch.decideRequest` | `idSchema`, `decideStaffRequestSchema` | BA | Approve / reject a request. |
| GET | `/branch-admin/shop-assignment` | `branchShopAssignmentController.get` | - | BA | Which employee is in which shop. |
| POST | `/branch-admin/shop-assignment/move` | `branchShopAssignmentController.move` | `moveEmployeeSchema` (svc) | BA | Move an employee to another shop. |
| GET | `/branch-admin/branch-profile` | `branchProfileSetupController.get` | - | BA | Branch profile (setup page). |
| PATCH | `/branch-admin/branch-profile` | `branchProfileSetupController.update` | `updateProfileSchema` (svc) | BA | Edit branch profile. |
| GET | `/branch-admin/approvals` | `branchApprovalController.list` | - | BA | Items waiting for approval. |
| POST | `/branch-admin/approvals/:id/decision` | `branchApprovalController.decide` | `decideSchema` (in controller) | BA | Approve / reject. |

**Pricing, stock, transfers, bills**

| METHOD | Full path | Controller function | Validation schema | Who | Purpose |
|---|---|---|---|---|---|
| GET | `/branch-admin/products-pricing` | `branchPricingController.list` | `priceQuerySchema` (svc) | BA | Price list. |
| POST | `/branch-admin/products-pricing/save` | `branchPricingController.savePrices` | `savePricesSchema` (svc) | BA | Save prices. |
| POST | `/branch-admin/products-pricing/bulk` | `branchPricingController.scheduleBulkPrice` | `bulkPriceSchema` (svc) | BA | Schedule a bulk price change. |
| GET | `/branch-admin/inventory/dashboard`, `/inventory`, `/inventory/movements` | `e.inventoryDashboard`, `e.listInventory`, `e.listMovements` | - | BA | Branch stock views. |
| POST | `/branch-admin/inventory/adjust`, `/inventory/batch-adjust` | `e.adjustStock`, `e.batchAdjustStock` | - (service) | BA | Adjust stock. |
| PATCH | `/branch-admin/inventory/threshold` | `e.updateThreshold` | - (service) | BA | Low-stock level. |
| GET | `/branch-admin/transfers` | `stockTransferController.branch.list` | `branchListSchema` | BA | Transfer requests. |
| GET | `/branch-admin/transfers/summary` | `branch.summary` | - | BA | Counts by status. |
| GET | `/branch-admin/transfers/:id` | `branch.get` | `idSchema` | BA | One transfer. |
| GET | `/branch-admin/transfers/:id/sources` | `branch.sources` | `idSchema` | BA | Shops that can supply the stock. |
| POST | `/branch-admin/transfers/:id/decision` | `branch.decide` | `idSchema`, `decideSchema` | BA | Approve and choose source shop, or reject. |
| GET | `/branch-admin/sales-bills` | `billController.branchSales.list` | `branchSalesListSchema` | BA | Sales bills of all branch shops (view only). |
| GET | `/branch-admin/sales-bills/summary` | `branchSales.summary` | `branchSalesSummarySchema` | BA | Sales totals. |
| GET | `/branch-admin/sales-bills/export` | `branchSales.export` | `branchSalesListSchema` | BA | Export sales bills. |
| GET | `/branch-admin/sales-bills/:id` | `branchSales.get` | `idSchema` | BA | One bill. |
| GET | `/branch-admin/purchase-bills` | `branchPurchaseController.list` | `branchPurchaseQuerySchema` (svc) | BA | Purchase bills of branch. |
| GET | `/branch-admin/purchase-bills/summary` | `branchPurchaseController.summary` | `branchPurchaseQuerySchema.shape.month` | BA | Purchase totals. |
| GET | `/branch-admin/purchase-bills/:id` | `branchPurchaseController.get` | - | BA | One purchase bill. |
| GET | `/branch-admin/credit-notes` | `creditNoteController.branch.list` | `creditNoteListSchema` | BA | Sales returns of all shops. |
| GET | `/branch-admin/credit-notes/summary` | `branch.summary` | `creditNoteSummarySchema` | BA | Return totals. |
| GET | `/branch-admin/credit-notes/:id` | `branch.get` | `idSchema` | BA | One credit note. |
| POST | `/branch-admin/credit-notes/:id/decision` | `branch.decide` | `idSchema`, `decideCreditNoteSchema` | BA | Approve cash / large refunds. |

**Customers, suppliers, stock audit, labels, accounts, reports**

| METHOD | Full path | Controller function | Validation schema | Who | Purpose |
|---|---|---|---|---|---|
| GET | `/branch-admin/customer-dues` | `customerDueController.list` | `customerDueQuerySchema` (svc) | BA | Customers who owe money. |
| GET | `/branch-admin/customer-dues/summary` | `customerDueController.summary` | - | BA | Dues totals. |
| GET | `/branch-admin/customer-dues/export` | `customerDueController.export` | `customerDueQuerySchema` | BA | Export dues. |
| POST | `/branch-admin/customer-dues/reminders` | `customerDueController.sendReminders` | - | BA | Send payment reminders. |
| GET | `/branch-admin/customer-dues/:id` | `customerDueController.get` | - (uuid check in controller) | BA | One customer's dues. |
| PATCH | `/branch-admin/customer-dues/:id/limit` | `customerDueController.updateLimit` | `updateLimitSchema` (svc) | BA | Set credit limit. |
| GET | `/branch-admin/suppliers` | `supplierController.listSuppliers` | - | BA | Suppliers. |
| POST | `/branch-admin/suppliers` | `supplierController.createSupplier` | `createSupplierSchema` | BA | Add supplier. |
| GET | `/branch-admin/suppliers/next-receipt` | `supplierController.getNextReceipt` | - | BA | Next payment receipt number. |
| GET | `/branch-admin/suppliers/:id/ledger` | `supplierController.getSupplierLedger` | - | BA | Supplier ledger. |
| POST | `/branch-admin/suppliers/payment` | `supplierController.recordPayment` | `recordSupplierPaymentSchema` | BA | Pay a supplier. |
| GET | `/branch-admin/stock/summary` | `stockController.getStockSummary` | - | BA | Live stock summary. |
| POST | `/branch-admin/stock/adjust` | `stockController.adjustStock` | `adjustStockSchema` | BA | Adjust stock. |
| POST | `/branch-admin/stock/physical-count` | `stockController.recordPhysicalStockCount` | `physicalCountSchema` | BA | Record physical count. |
| GET | `/branch-admin/stock-adjustments/next-number` | `stockAdjustmentController.getNextAdjustmentNumber` | - | BA | Next adjustment number. |
| GET | `/branch-admin/stock-adjustments/variants` | `getAdjustmentVariants` | - | BA | Variants to adjust. |
| GET | `/branch-admin/stock-adjustments` | `getAdjustmentHistory` | `getAdjustmentsQuerySchema` | BA | History. |
| POST | `/branch-admin/stock-adjustments` | `createAdjustment` | `createAdjustmentSchema` | BA | New adjustment. |
| GET | `/branch-admin/barcode-labels/purchase-bills` | `barcodeLabelController.getPurchaseBills` | - | BA | Bills to print labels for. |
| GET | `/branch-admin/barcode-labels/bills/:billId/items` | `getBillItems` | - | BA | Items on a bill. |
| GET | `/branch-admin/barcode-labels/products` | `searchProducts` | - | BA | Search products for labels. |
| GET | `/branch-admin/barcode-labels/reprint-batches` | `getReprintBatches` | - | BA | Earlier print batches. |
| POST | `/branch-admin/barcode-labels/print` | `recordPrintJob` | `printBarcodeLabelsSchema` | BA | Record a print job. |
| GET | `/branch-admin/day-close` | `dayCloseController.get` | `dayQuerySchema` | BA | Day-close view. |
| POST | `/branch-admin/day-close/resolve-difference` | `dayCloseController.resolveDifference` | `resolveDifferenceSchema` | BA | Explain a cash difference. |
| POST | `/branch-admin/day-close/bank-deposit` | `dayCloseController.recordDeposit` | `bankDepositSchema` | BA | Record bank deposit. |
| GET | `/branch-admin/expenses` | `branchExpenseController.list` | - | BA | Branch expenses. |
| POST | `/branch-admin/expenses` | `branchExpenseController.add` | `addExpenseSchema` (svc) | BA | Add expense. |
| GET | `/branch-admin/reports/pnl` | `branchReportsController.getPnl` | `pnlQuerySchema` (svc) | BA | Profit and loss. |

**Online orders and returns (branch)**

| METHOD | Full path | Controller function | Validation | Who | Purpose |
|---|---|---|---|---|---|
| GET | `/branch-admin/orders/dashboard`, `/orders`, `/orders/:id`, `/orders/:id/invoice` | `e.orderDashboard`, `e.listOrders`, `e.getOrder`, `e.getOrderInvoice` | - | BA | View orders. |
| PATCH | `/branch-admin/orders/:id/status`, `/shipping`, `/payment` | `e.updateOrderStatus`, `e.updateOrderShipping`, `e.updateOrderPayment` | - (service) | BA | Update order. |
| POST | `/branch-admin/orders/:id/cancel-review` | `e.reviewCancellation` | - (service) | BA | Decide a cancel request. |
| GET | `/branch-admin/returns` | `e.listReturns` | - | BA | Returns list. |
| PATCH | `/branch-admin/returns/:id` | `e.updateReturnStatus` | - (service) | BA | Update a return. |
| (catalog) | see 3.6 with `manageProducts` | | | BA | Company products; edits limited to this branch. |
| (promotions) | see 3.7 | | | BA | Branch promotions. |

### 3.6 Shop API: `/shop-admin` and `/employee` (`shopAdmin.routes.ts` + helpers)

The same routes are mounted twice. `/shop-admin/...`: roles SH, SA, CA, BA (all rights). `/employee/...`: EMP, narrowed by `employeeModuleGuard` (section 2.2). In the table "Employee module" is the module an employee needs. Data scope is `shopOf(req)`.

**Employees and masters**

| METHOD | Relative path | Controller function | Validation schema | Employee module | Purpose |
|---|---|---|---|---|---|
| GET / POST | `/employees` | `c.listEmployees` / `c.createEmployee` | `employeeListSchema` / `createEmployeeSchema` | none (closed) | Shop employees. |
| GET / PATCH | `/employees/:id` | `c.getEmployee` / `c.updateEmployee` | `idSchema` / + `updateEmployeeSchema` | none | One employee / edit. |
| PATCH | `/users/:id/status` | `c.setUserStatus` | `idSchema`, `userStatusSchema` | none | Block / unblock. |
| POST | `/users/:id/revoke-sessions` | `c.revokeSessions` | `idSchema` | none | Force re-login. |
| GET | `/categories/options` | `m.categoryOptions` | - | masters or products (read) | Category dropdown. |
| GET / POST | `/categories` | `m.listCategories` / `m.createCategory` | `masterListSchema` / `createCategorySchema` | masters (write) | Shop categories. |
| GET / PATCH / DELETE | `/categories/:id` | `m.getCategory` / `m.updateCategory` / `m.deleteCategory` | `idSchema` (+ `updateCategorySchema`) | masters | One category. |
| GET / POST | `/subcategories` | `m.listSubcategories` / `m.createSubcategory` | `masterListSchema` / `createSubcategorySchema` | masters | Subcategories. |
| GET / PATCH / DELETE | `/subcategories/:id` | `m.getSubcategory` / `m.updateSubcategory` / `m.deleteSubcategory` | `idSchema` (+ `updateSubcategorySchema`) | masters | One subcategory. |
| GET / POST | `/colors` | `m.listColors` / `m.createColor` | `masterListSchema` / `createColorSchema` | masters | Colors. |
| GET / PATCH / DELETE | `/colors/:id` | `m.getColor` / `m.updateColor` / `m.deleteColor` | `idSchema` (+ `updateColorSchema`) | masters | One color. |
| GET / POST | `/sizes` | `m.listSizes` / `m.createSize` | `masterListSchema` / `createSizeSchema` | masters | Sizes. |
| GET / PATCH / DELETE | `/sizes/:id` | `m.getSize` / `m.updateSize` / `m.deleteSize` | `idSchema` (+ `updateSizeSchema`) | masters | One size. |

**Products (shop catalog, `shopProductController`, `shopProductValidation`)**

| METHOD | Relative path | Controller function | Validation schema | Employee module | Purpose |
|---|---|---|---|---|---|
| GET | `/products` | `p.listProducts` | `shopProductListSchema` | products | List products. |
| POST | `/products` | `p.createProduct` | `createShopProductSchema` (multipart, up to 8 `images`) | products | Create product + photos in one request. |
| GET | `/products/:id` | `p.getProduct` | `idSchema` | products | One product. |
| PATCH | `/products/:id` | `p.updateProduct` | `idSchema`, `updateShopProductSchema` | products | Edit product. |
| DELETE | `/products/:id` | `p.deleteProduct` | `idSchema` | products | Delete product. |
| POST | `/products/:id/images` | `p.uploadImages` | `idSchema` (multipart `images`) | products | Add photos. |
| PATCH | `/products/:id/images/:imageId` | `p.updateImage` | `imageIdSchema`, `imageUpdateSchema` | products | Edit a photo (e.g. primary). |
| DELETE | `/products/:id/images/:imageId` | `p.deleteImage` | `imageIdSchema` | products | Delete photo. |
| POST | `/products/:id/previews` | `p.generatePreviews` | `idSchema`, `generatePreviewSchema` | products | AI preview images. |
| POST | `/products/:id/images/:imageId/clean` | `p.cleanBackground` | `imageIdSchema` | products | AI background clean. |
| POST | `/products/:id/images/:imageId/professional` | `p.professionalPhoto` | `imageIdSchema`, `professionalPhotoSchema` | products | AI studio photo. |
| DELETE | `/products/:id/previews/:previewId` | `p.deletePreview` | `previewIdSchema` | products | Delete a preview. |
| GET | `/ai-status` | `p.aiStatus` | - | products | Is the AI feature configured. |

**Inventory, stock, adjustments, labels**

| METHOD | Relative path | Controller function | Validation | Employee module | Purpose |
|---|---|---|---|---|---|
| GET | `/inventory/dashboard`, `/inventory`, `/inventory/movements` | `e.inventoryDashboard`, `e.listInventory`, `e.listMovements` | - | stock, billing or products (read) | Stock views. |
| POST | `/inventory/adjust`, `/inventory/batch-adjust` | `e.adjustStock`, `e.batchAdjustStock` | - (service) | stock | Adjust stock. |
| PATCH | `/inventory/threshold` | `e.updateThreshold` | - (service) | stock | Low-stock level. |
| GET | `/stock/summary` | `stockController.getStockSummary` | - | stock | Live stock summary. |
| POST | `/stock/adjust` | `stockController.adjustStock` | `adjustStockSchema` | stock | Adjust stock. |
| POST | `/stock/physical-count` | `stockController.recordPhysicalStockCount` | `physicalCountSchema` | stock | Physical count. |
| GET | `/stock-adjustments/next-number` | `getNextAdjustmentNumber` | - | stock | Next number. |
| GET | `/stock-adjustments/variants` | `getAdjustmentVariants` | - | stock | Variants. |
| GET | `/stock-adjustments` | `getAdjustmentHistory` | `getAdjustmentsQuerySchema` | stock | History. |
| POST | `/stock-adjustments` | `createAdjustment` | `createAdjustmentSchema` | stock | New adjustment. |
| GET | `/barcode-labels/purchase-bills` | `barcodeLabelController.getPurchaseBills` | - | stock or purchase | Bills for labels. |
| GET | `/barcode-labels/bills/:billId/items` | `getBillItems` | - | stock or purchase | Bill items. |
| GET | `/barcode-labels/products` | `searchProducts` | - | stock or purchase | Search products. |
| GET | `/barcode-labels/reprint-batches` | `getReprintBatches` | - | stock or purchase | Earlier batches. |
| POST | `/barcode-labels/print` | `recordPrintJob` | `printBarcodeLabelsSchema` | stock or purchase (write) | Record print job. |

**Bills (`mountBills`, `billController`, `billValidation`)**

| METHOD | Relative path | Controller function | Validation schema | Employee module | Purpose |
|---|---|---|---|---|---|
| GET | `/purchase-bills` | `purchase.list` | `billListSchema` | purchase | List purchase bills. |
| POST | `/purchase-bills` | `purchase.create` | `createPurchaseBillSchema` | purchase | Create (draft or confirmed). |
| GET | `/purchase-bills/:id` | `purchase.get` | `idSchema` | purchase | One bill. |
| PATCH | `/purchase-bills/:id` | `purchase.update` | `idSchema`, `updatePurchaseBillSchema` | purchase | Edit (uses `version` to stop clashes). |
| DELETE | `/purchase-bills/:id` | `purchase.remove` | `idSchema` | purchase | Delete draft. |
| POST | `/purchase-bills/:id/confirm` | `purchase.confirm` | `idSchema` | purchase | Confirm; stock goes in. |
| POST | `/purchase-bills/:id/cancel` | `purchase.cancel` | `idSchema`, `cancelBillSchema` | purchase | Cancel with reason. |
| POST | `/purchase-bills/:id/payments` | `purchase.payment` | `idSchema`, `recordPaymentSchema` | purchase | Pay against the bill. |
| GET | `/customers` and `/sales-bills/customers` | `b.customers` | - | billing or customers (read) | Customer search for POS. Note: `/customers` is also defined below by `customerController` (see Shop Customers); both paths are registered, and the earlier one in the file runs first. |
| GET | `/sales-bills/find` and `/sales-bills/by-number/:billNumber` | `sales.findByNumber` | - | billing | Find a bill by number (for returns). |
| GET | `/sales-bills` | `sales.list` | `billListSchema` | billing | List sales bills. |
| POST | `/sales-bills` | `sales.create` | `createSalesBillSchema` | billing | New sale (POS). |
| GET | `/sales-bills/:id` | `sales.get` | `idSchema` | billing | One bill. |
| PATCH | `/sales-bills/:id` | `sales.update` | `idSchema`, `updateSalesBillSchema` | billing | Edit. |
| DELETE | `/sales-bills/:id` | `sales.remove` | `idSchema` | billing | Delete draft. |
| POST | `/sales-bills/:id/confirm` | `sales.confirm` | `idSchema` | billing | Confirm; stock goes out. |
| POST | `/sales-bills/:id/cancel` | `sales.cancel` | `idSchema`, `cancelBillSchema` | billing | Cancel. |
| POST | `/sales-bills/:id/payments` | `sales.payment` | `idSchema`, `recordPaymentSchema` | billing | Take payment. |

Check on the `/customers` overlap: in `shopAdmin.routes.ts`, `mountBills(router)` is called before the "Shop Customers" block, so `GET /customers` is answered by `bill.customers`. `customerController.list` for the same path is therefore shadowed; `customerController.online`, `.create`, `.get`, `.update`, `.importExcel` still work. (Found by reading the code; confirm in a test before relying on it.)

**Returns, customers, credit, suppliers, purchase returns**

| METHOD | Relative path | Controller function | Validation schema | Employee module | Purpose |
|---|---|---|---|---|---|
| GET | `/credit-notes` | `creditNoteController.shop.list` | `creditNoteListSchema` | billing | Sales returns of this shop. |
| POST | `/credit-notes` | `shop.create` | `createCreditNoteSchema` | billing | Create a return; cash/large refunds wait for branch admin. |
| GET | `/credit-notes/returnable` | `shop.returnable` | `returnableSchema` (query `bill`) | billing | Items of a bill that can still be returned. |
| GET | `/credit-notes/:id` | `shop.get` | `idSchema` | billing | One credit note. |
| GET | `/customers/online` | `customerController.online` | - | billing or customers | Online customers who ordered from this shop. |
| POST | `/customers` | `customerController.create` | `createCustomerSchema` | customers | New customer. |
| GET | `/customers/:id` | `customerController.get` | - | billing or customers | One customer. |
| PATCH | `/customers/:id` | `customerController.update` | `updateCustomerSchema` | customers | Edit. |
| POST | `/customers/import` | `customerController.importExcel` | - (body checked in code) | customers | Import customers from Excel. |
| GET | `/credit/metrics` | `creditController.getMetrics` | - | customers | Credit (udhaar) totals. |
| GET | `/credit/customers` | `getCustomersWithDue` | - | customers | Customers with dues. |
| GET | `/credit/customers/:customerId/statement` | `getCustomerStatement` | - | customers | Customer statement. |
| GET | `/credit/next-receipt` | `getNextReceiptNumber` | - | customers | Next receipt number. |
| POST | `/credit/customers/:customerId/payment` | `recordPayment` | `receivePaymentSchema` | customers | Receive payment. |
| GET | `/credit/reminders` | `getWhatsAppReminders` | - | customers | WhatsApp reminder texts. |
| GET | `/suppliers` | `supplierController.listSuppliers` | - | purchase | Suppliers. |
| POST | `/suppliers` | `createSupplier` | `createSupplierSchema` | purchase | Add supplier. |
| GET | `/suppliers/next-receipt` | `getNextReceipt` | - | purchase | Next receipt number. |
| GET | `/suppliers/:id/ledger` | `getSupplierLedger` | - | purchase | Ledger. |
| POST | `/suppliers/payment` | `recordPayment` | `recordSupplierPaymentSchema` | purchase | Pay supplier. |
| GET | `/purchase-returns/next-number` | `purchaseReturnController.getNextDebitNoteNumber` | - | purchase | Next debit note number. |
| GET | `/purchase-returns/suppliers` | `getSuppliers` | - | purchase | Suppliers with bills. |
| GET | `/purchase-returns/bills` | `getBillsBySupplier` | - | purchase | A supplier's bills. |
| GET | `/purchase-returns/earlier` | `getEarlierReturns` | - | purchase | Earlier returns. |
| POST | `/purchase-returns` | `createPurchaseReturn` | `createPurchaseReturnSchema` | purchase | Return goods to supplier (debit note). |
| GET | `/purchase-returns/:id` | `getPurchaseReturn` | - | purchase | One debit note. |

**Dashboard, counter, expenses, reports (`mountShopOps`, `shopOpsController`)**

| METHOD | Relative path | Controller function | Validation schema | Employee module | Purpose |
|---|---|---|---|---|---|
| GET | `/dashboard` | `s.dashboard` | - | dashboard | Shop dashboard. |
| GET | `/counter/current` | `s.counter.current` | - | billing | Today's counter state. |
| POST | `/counter/open` | `s.counter.open` | `openCounterSchema` | billing | Open cash counter with opening cash. |
| POST | `/counter/close` | `s.counter.close` | `closeCounterSchema` | billing | Close counter with closing cash. |
| GET | `/expenses/next-number` | `s.expenses.nextNumber` | - | accounts | Next expense number. |
| GET | `/expenses` | `s.expenses.list` | `expenseListSchema` | accounts | List expenses. |
| POST | `/expenses` | `s.expenses.create` | `createExpenseSchema` | accounts | Add expense. |
| GET | `/reports/pnl` | `branchReportsController.getShopPnl` | `pnlQuerySchema` (svc) | reports | Shop profit and loss. |

**Staff, cash book, transfers (`mountStaffCash`)**

| METHOD | Relative path | Controller function | Validation schema | Employee module | Purpose |
|---|---|---|---|---|---|
| GET | `/staff` | `staffController.shop.list` | `staffListSchema` | none (closed to employees) | Staff list for a date. |
| PATCH | `/staff/:id/rights` | `shop.updateRights` | `idSchema`, `updateRightsSchema` | none | Change what a staff member may do. |
| PATCH | `/staff/:id/shift` | `shop.updateShift` | `idSchema`, `updateShiftSchema` | none | Change shift. |
| POST | `/staff/:id/attendance` | `shop.attendance` | `idSchema`, `attendanceSchema` | none | Mark attendance. |
| GET / POST | `/staff-requests` | `shop.listRequests` / `shop.createRequest` | - / `createStaffRequestSchema` | none | Ask the branch admin to add staff. |
| GET | `/cash-book` | `cashBookController.getDay` | `dayQuerySchema` | accounts | Cash book for a day. |
| POST | `/cash-book/entries` | `addEntry` | `addEntrySchema` | accounts | Add entry. |
| POST | `/cash-book/bank-deposit` | `bankDeposit` | `bankDepositSchema` | accounts | Bank deposit. |
| POST | `/cash-book/close` | `closeDay` | `closeDaySchema` | accounts | Close the day. |
| GET | `/transfers/shops` | `stockTransferController.shop.shops` | - | stock | Other shops. |
| GET | `/transfers/variants` | `shop.variants` | `variantSearchSchema` | stock | Search variants. |
| GET | `/transfers` | `shop.list` | `shopListSchema` | stock | This shop's transfers. |
| POST | `/transfers` | `shop.create` | `createTransferSchema` | stock | Request stock. |
| GET | `/transfers/:id` | `shop.get` | `idSchema` | stock | One transfer. |
| POST | `/transfers/:id/dispatch` | `shop.dispatch` | `idSchema` | stock | Send stock. |
| POST | `/transfers/:id/receive` | `shop.receive` | `idSchema`, `receiveSchema` | stock | Receive stock. |

**Online orders and promotions (shop)**

| METHOD | Relative path | Controller function | Validation | Employee module | Purpose |
|---|---|---|---|---|---|
| GET | `/orders/dashboard`, `/orders`, `/orders/:id`, `/orders/:id/invoice` | `e.orderDashboard`, `e.listOrders`, `e.getOrder`, `e.getOrderInvoice` | - | orders | View online orders. |
| PATCH | `/orders/:id/status`, `/shipping`, `/payment` | `e.updateOrderStatus`, `e.updateOrderShipping`, `e.updateOrderPayment` | - (service) | orders | Update order. |
| POST | `/orders/:id/cancel-review` | `e.reviewCancellation` | - (service) | orders | Decide cancel request. |
| GET | `/returns` | `e.listReturns` | - | orders | Returns list. |
| PATCH | `/returns/:id` | `e.updateReturnStatus` | - (service) | orders | Update return. |
| (promotions) | `/promotions/...` see 3.8 | | | none (closed to employees) | Shop promotions. |

### 3.7 Catalog routes (`catalog.routes.ts`, `catalogController`, `catalogValidation`)

`mountCatalog(router, access)` adds routes depending on flags. Mounted for SA (`manageCategories`, `manageBrands`), CA (`manageBrands`, `manageProducts`), BA (`manageProducts`). Who can really change a product is also decided in `productService`.

| METHOD | Relative path (under `/super-admin`, `/company-admin`, `/branch-admin`) | Controller function | Validation schema | Added when | Purpose |
|---|---|---|---|---|---|
| GET | `/categories/options` | `categoryOptions` | - | always | Category dropdown. |
| GET | `/brands/options` | `brandOptions` | - | always | Brand dropdown. |
| GET / POST | `/categories` | `listCategories` / `createCategory` | `catalogListSchema` / `createCategorySchema` | `manageCategories` (SA) | Global categories. |
| PATCH / DELETE | `/categories/:id` | `updateCategory` / `deleteCategory` | `idSchema` (+ `updateCategorySchema`) | `manageCategories` | Edit / delete. |
| GET / POST | `/brands` | `listBrands` / `createBrand` | `catalogListSchema` / `createBrandSchema` | `manageBrands` (SA, CA) | Brands. |
| PATCH | `/brands/:id` | `updateBrand` | `idSchema`, `updateBrandSchema` | `manageBrands` | Edit brand. |
| GET | `/products` | `listProducts` | `productListSchema` | always | List products. |
| GET | `/products/:id` | `getProduct` | `idSchema` | always | One product. |
| PATCH | `/products/:id/status` | `setProductStatus` | `idSchema`, `productStatusSchema` | always | Publish / unpublish (SA can only unpublish; checked in service). |
| POST | `/products` | `createProduct` | `createProductSchema` | `manageProducts` (CA, BA) | Create. |
| PATCH / DELETE | `/products/:id` | `updateProduct` / `deleteProduct` | `idSchema` (+ `updateProductSchema`) | `manageProducts` | Edit / delete. |
| POST | `/products/:id/images` | `uploadImages` | `idSchema` (multipart `images`, max 8) | `manageProducts` | Add photos. |
| PATCH / DELETE | `/products/:id/images/:imageId` | `updateImage` / `deleteImage` | `imageIdSchema` (+ `imageUpdateSchema`) | `manageProducts` | Edit / delete photo. |

### 3.8 Promotions (`promotion.routes.ts`, `promotionController`)

Mounted for SA, CA, BA and the shop admin (not employees). Scope comes from `scopeOf(req)`. This controller does not use a zod schema: it converts form fields itself (`parseArray`, `Number(...)`) and the service validates the rules. Banners are uploaded with `imageUpload.single('banner')`.

| METHOD | Relative path | Controller function | Validation schema | Purpose |
|---|---|---|---|---|
| GET | `/promotions/dashboard` | `getDashboard` | - | Promotions summary. |
| GET | `/promotions/offers` | `listOffers` | - (query read in controller) | List offers. |
| POST | `/promotions/offers` | `createOffer` | - (service checks) | Create offer (+ banner). |
| GET | `/promotions/offers/:id` | `getOffer` | - | One offer. |
| PATCH | `/promotions/offers/:id` | `updateOffer` | - | Edit offer. |
| DELETE | `/promotions/offers/:id` | `deleteOffer` | - | Delete offer. |
| PATCH | `/promotions/offers/:id/status` | `toggleOfferStatus` | - | Turn offer on / off. |
| GET | `/promotions/coupons` | `listCoupons` | - | List coupons. |
| POST | `/promotions/coupons` | `createCoupon` | - | Create coupon (+ banner). |
| GET | `/promotions/coupons/:id` | `getCoupon` | - | One coupon. |
| PATCH | `/promotions/coupons/:id` | `updateCoupon` | - | Edit coupon. |
| DELETE | `/promotions/coupons/:id` | `deleteCoupon` | - | Delete coupon. |
| PATCH | `/promotions/coupons/:id/status` | `toggleCouponStatus` | - | Turn coupon on / off. |
| POST | `/promotions/coupons/validate` | `validateCoupon` | - | Check a coupon for a cart. |

Express order warning: `POST /promotions/coupons/validate` is declared after `/promotions/coupons/:id` routes, but those use GET/PATCH/DELETE, so there is no clash.

### 3.9 `/store` (customer storefront, `store.routes.ts`)

This router has no separate controller file. Each route is an inline handler that calls a service in `services/store/*` and validates with zod schemas exported from those services. Public routes first; after `router.use(verifyJWT, checkRole(Role.USER))` the rest need a signed-in customer.

**Public**

| METHOD | Full path | Handler calls | Validation | Who | Purpose |
|---|---|---|---|---|---|
| GET | `/store/home` | `catalogService.home` | - | Public | Home page data. |
| GET | `/store/products` | `catalogService.listProducts` | `productQuerySchema` | Public | Browse / filter. |
| GET | `/store/products/:idOrSlug` | `catalogService.getProduct` | - | Public | Product page. |
| GET | `/store/search/suggest` | `catalogService.suggest` | - | Public | Search suggestions. |
| GET | `/store/coupons` | `customerService.publicCoupons` | - | Public | Public coupons. |
| GET | `/store/delivery/:pincode` | `catalogService.deliveryEstimate` | - | Public | Delivery estimate. |
| GET | `/store/payment-config` | `checkoutService.paymentConfig` | - | Public | Payment options. |
| GET | `/store/help` | constants `SUPPORT_TOPICS`, `RETURN_REASONS` | - | Public | Help topics. |
| POST | `/store/support` | `storeAccount.support(null, ...)` | `supportSchema` | Public (rate limited) | Contact form. |
| POST | `/store/auth/forgot-password` | `storeAccount.forgotPassword` | `userValidation.forgotPasswordSchema` | Public (rate limited) | Reset email. |
| POST | `/store/auth/reset-password` | `userService.resetPassword` | `userValidation.resetPasswordSchema` | Public (rate limited) | New password. |

**Signed-in customer (CUST)**

| METHOD | Full path | Handler calls | Validation | Purpose |
|---|---|---|---|---|
| GET | `/store/cart` | `customerService.getCart` | query `coupon`, `delivery` | View bag. |
| POST | `/store/cart/items` | `addToCart` | `addToCartSchema` | Add to bag. |
| PATCH | `/store/cart/items/:id` | `updateLine` | `updateCartSchema` | Change quantity. |
| DELETE | `/store/cart/items/:id` | `removeLine` | uuid check; `?toWishlist=true` | Remove or move to wishlist. |
| GET | `/store/wishlist`, `/store/wishlist/ids` | `wishlist`, `wishlistIds` | - | Wishlist. |
| POST / DELETE | `/store/wishlist/:id` | `addToWishlist` / `removeFromWishlist` | uuid check | Add / remove. |
| GET / POST | `/store/addresses` | `listAddresses` / `saveAddress` | `addressSchema` | Addresses. |
| PATCH / DELETE | `/store/addresses/:id` | `saveAddress` / `deleteAddress` | `addressSchema` | Edit / delete. |
| POST | `/store/checkout` | `checkoutService.checkout` | `checkoutSchema` | Place order. |
| POST | `/store/payments/verify` | `checkoutService.verify` | `verifySchema` | Confirm Razorpay payment. |
| POST | `/store/payments/failed` | `checkoutService.failed` | `paymentRefSchema` | Report failed payment. |
| POST | `/store/payments/retry` | `checkoutService.retry` | `paymentRefSchema` | Retry payment. |
| POST | `/store/payments/cod` | `checkoutService.switchToCod` | `paymentRefSchema` | Switch to cash on delivery. |
| GET | `/store/payments/:razorpayOrderId` | `checkoutService.status` | - | Payment status. |
| POST | `/store/products/:id/reviews` | `customerService.review` | `reviewSchema` | Write a review. |
| GET | `/store/reviews` | `myReviews`, `toReview` | - | My reviews + pending. |
| GET / PATCH | `/store/profile` | `storeAccount.profile` / `updateProfile` | `profileSchema` | Profile. |
| POST | `/store/profile/password` | `userService.changePassword` + `storeAccount.passwordChanged` | `userValidation.changePasswordSchema` (rate limited) | Change password. |
| POST | `/store/support/mine` | `storeAccount.support(userId, ...)` | `supportSchema` | Support message as a customer. |
| POST | `/store/uploads` | `storeUpload` (multer `customerPhotoUpload`, field `photo`) | file check | Upload a photo. |
| GET | `/store/orders` | `storeOrders.list` | query `tab`, `q` | My orders. |
| GET | `/store/orders/:id` | `storeOrders.get` | uuid check | One order / tracking. |
| POST | `/store/orders/:id/cancel` | `storeOrders.cancel` | `cancelSchema` | Cancel. |
| POST | `/store/orders/:id/return` | `storeOrders.requestReturn` | `returnSchema` | Return / exchange. |
| POST | `/store/orders/:id/buy-again` | `storeOrders.buyAgain` | uuid check | Re-add items to bag. |
| GET | `/store/returns` | `storeOrders.returns` | - | My returns. |
| GET | `/store/notifications` | `notificationService.list` | query `tab`, `page` | Notifications. |
| GET | `/store/notifications/unread` | `notificationService.unreadCount` | - | Unread badge. |
| POST | `/store/notifications/read-all` | `notificationService.markAllRead` | - | Mark all read. |
| POST | `/store/notifications/:id/read` | `notificationService.markRead` | uuid check | Mark one read. |

---

## 4. Controllers, file by file

All files are in `backend/src/controllers/`. They are exported from `controllers/index.ts` as `xxxController` objects (some `export default {...}`, some `export * as ...`). Every handler is wrapped in `catchAsync`. Sensitive writes are wrapped in `auditService.track(...)` in many controllers (audit log of who did what).

### 4.1 Platform and organisation

| File | Purpose | Functions |
|---|---|---|
| `user.controller.ts` | Account login/session and profile. | `registerUser`, `loginUser`, `logoutUser`, `refreshAccessToken`, `getCurrentUser`, `changePassword`, `forgotPassword`, `resetPassword`, `updateUser` |
| `company.controller.ts` | Company CRUD with audit logging. | `createCompany`, `listCompanies`, `getCompany`, `updateCompany`, `deleteCompany` |
| `org.controller.ts` | Branches, shops, employees, users and dashboards for SA/CA/BA/Shop (scoped by role). | `listBranches`, `getBranch`, `branchOptions`, `createBranch`, `updateBranch`, `setBranchStatus`, `listShops`, `getShop`, `shopOptions`, `shopStats`, `createShop`, `updateShop`, `setShopStatus`, `listEmployees`, `getEmployee`, `createEmployee`, `updateEmployee`, `listUsers`, `setUserStatus`, `revokeSessions`, `superAdminDashboard`, `scopedDashboard`, `branchOverview`, `companyProfile`, `branchProfile` |
| `scope.ts` | Shared helpers (not a controller). | `shopOf`, `branchOf`, `ok` |
| `index.ts` | Barrel file that re-exports every controller. | - |

### 4.2 Catalog and products

| File | Purpose | Functions |
|---|---|---|
| `catalog.controller.ts` | Company/platform catalog: categories, brands, products, images. | `listCategories`, `categoryOptions`, `createCategory`, `updateCategory`, `deleteCategory`, `listBrands`, `brandOptions`, `createBrand`, `updateBrand`, `listProducts`, `getProduct`, `createProduct`, `updateProduct`, `setProductStatus`, `deleteProduct`, `uploadImages`, `updateImage`, `deleteImage` |
| `master.controller.ts` | Shop master data: categories, subcategories, colors, sizes. | `listCategories`, `getCategory`, `categoryOptions`, `createCategory`, `updateCategory`, `deleteCategory`, and the same set for `Subcategor(y/ies)`, `Color(s)`, `Size(s)` (list, get, create, update, delete) |
| `shopProduct.controller.ts` | Shop products with photos and AI photo tools. | `listProducts`, `getProduct`, `createProduct`, `updateProduct`, `deleteProduct`, `uploadImages`, `updateImage`, `deleteImage`, `generatePreviews`, `cleanBackground`, `professionalPhoto`, `aiStatus`, `deletePreview` |
| `branchPricing.controller.ts` | Branch price list. | `list`, `savePrices`, `scheduleBulkPrice` |
| `promotion.controller.ts` | Offers and coupons. | `getDashboard`, `listOffers`, `getOffer`, `createOffer`, `updateOffer`, `toggleOfferStatus`, `deleteOffer`, `listCoupons`, `getCoupon`, `createCoupon`, `updateCoupon`, `toggleCouponStatus`, `deleteCoupon`, `validateCoupon` |

### 4.3 Orders, inventory and stock

| File | Purpose | Functions |
|---|---|---|
| `ecommerce.controller.ts` | Online inventory, online orders, returns, customer-side order calls. | `inventoryDashboard`, `listInventory`, `adjustStock`, `batchAdjustStock`, `updateThreshold`, `listMovements`, `orderDashboard`, `listOrders`, `getOrder`, `updateOrderStatus`, `updateOrderShipping`, `updateOrderPayment`, `reviewCancellation`, `listReturns`, `updateReturnStatus`, `getOrderInvoice`, `listCustomerOrders`, `getCustomerOrder`, `customerCancelOrder`, `customerReturnOrder` |
| `stock.controller.ts` | Live stock summary and physical count. | `getStockSummary`, `adjustStock`, `recordPhysicalStockCount` |
| `stockAdjustment.controller.ts` | Dedicated stock adjustment page. | `getNextAdjustmentNumber`, `getAdjustmentVariants`, `getAdjustmentHistory`, `createAdjustment` |
| `stockTransfer.controller.ts` | Shop-to-shop transfers (`shop` and `branch` groups). | `shop.{shops, variants, list, get, create, dispatch, receive}`, `branch.{list, summary, get, sources, decide}` |
| `barcodeLabel.controller.ts` | Barcode label printing. | `getPurchaseBills`, `getBillItems`, `searchProducts`, `getReprintBatches`, `recordPrintJob` |

### 4.4 Billing, purchases, returns and credit

| File | Purpose | Functions |
|---|---|---|
| `bill.controller.ts` | Purchase bills, sales bills (POS) and branch sales view. | `purchase.{list, get, create, update, remove, confirm, cancel, payment}`, `sales.{list, get, create, update, remove, confirm, cancel, payment, findByNumber}`, `branchSales.{list, summary, export, get}`, `customers` |
| `branchPurchase.controller.ts` | Branch view of purchase bills. | `list`, `summary`, `get` |
| `creditNote.controller.ts` | Sales returns (credit notes). | `shop.{list, get, returnable, create}`, `branch.{list, summary, get, decide}` |
| `purchaseReturn.controller.ts` | Returns to suppliers (debit notes). | `getNextDebitNoteNumber`, `getSuppliers`, `getBillsBySupplier`, `getEarlierReturns`, `createPurchaseReturn`, `getPurchaseReturn` |
| `supplier.controller.ts` | Suppliers and supplier payments. | `listSuppliers`, `getSupplierLedger`, `createSupplier`, `recordPayment`, `getNextReceipt` |
| `customer.controller.ts` | Shop customers. | `customerController.{online, list, get, create, update, importExcel}` |
| `credit.controller.ts` | Customer credit (udhaar) at the shop. | `getMetrics`, `getCustomersWithDue`, `getCustomerStatement`, `getNextReceiptNumber`, `recordPayment`, `getWhatsAppReminders` |
| `customerDue.controller.ts` | Branch view of dues and credit limits. | `list`, `summary`, `get`, `updateLimit`, `sendReminders`, `export` |

### 4.5 Cash, accounts and staff

| File | Purpose | Functions |
|---|---|---|
| `shopOps.controller.ts` | Shop dashboard, cash counter, expenses. | `dashboard`, `counter.{current, open, close}`, `expenses.{nextNumber, list, create}` |
| `cashBook.controller.ts` | Shop cash book and day close. | `getDay`, `addEntry`, `bankDeposit`, `closeDay` |
| `dayClose.controller.ts` | Branch day-close review. | `get`, `resolveDifference`, `recordDeposit` |
| `branchExpense.controller.ts` | Branch expenses. | `list`, `add` |
| `branchApproval.controller.ts` | Branch approvals inbox. | `list`, `decide` |
| `branchReports.controller.ts` | Profit and loss reports. | `getPnl`, `getShopPnl` |
| `staff.controller.ts` | Shop staff and rights; branch handling of staff requests. | `shop.{list, updateRights, updateShift, attendance, listRequests, createRequest}`, `branch.{listRequests, decideRequest}` |
| `branchStaff.controller.ts` | Branch staff overview. | `list`, `invite` |
| `branchShopAssignment.controller.ts` | Move employees between shops. | `get`, `move` |
| `branchProfileSetup.controller.ts` | Branch profile setup page. | `get`, `update` |

---

## 5. Validation files, file by file

All in `backend/src/validations/`. They use `zod`. Most use helper rules from `custom.validation.ts` (`field({label, kind, ...})` builds trimmed, length-checked, pattern-checked fields with friendly messages). Files marked "barrel" are re-exported by `validations/index.ts` as `xxxValidation`; others are imported directly by path.

| File | Purpose | Schemas / exports |
|---|---|---|
| `index.ts` | Barrel: exports `userValidation`, `commonValidation`, `customValidation`, `companyValidation`, `orgValidation`, `catalogValidation`, `masterValidation`, `shopProductValidation`, `billValidation`, `creditNoteValidation`, `shopOpsValidation`, `cashBookValidation`, `staffValidation`, `stockTransferValidation`, `dayCloseValidation`. | - |
| `common.validation.ts` | Small reusable pieces (barrel). | `idSchema`, `nameSchema`, `tokenSchema`, `refreshTokenSchema`, `phoneNumberSchema`, `paginationSchema`, `searchSchema`, `paginationAndSearchSchema` |
| `custom.validation.ts` | Rule builder and patterns (barrel). Not tied to one route. | `field`, `kindFromLabel`, `PATTERNS`, `collapseSpaces`, `dateRange`, `IMAGE_RULE`, `password`, `emailSchema`, `usernameSchema`, `fullnameSchema`, `phoneNumberSchema` |
| `user.validation.ts` | Auth and profile (barrel). | `loginUserSchema`, `registerUserSchema`, `changePasswordSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `updateUserSchema`, `idSchema` |
| `company.validation.ts` | Companies (barrel). | `createCompanySchema`, `updateCompanySchema`, `listCompaniesSchema`, `companyIdSchema` |
| `org.validation.ts` | Branches, shops, employees, users (barrel). | `createBranchSchema`, `updateBranchSchema`, `branchListSchema`, `branchStatusSchema`, `createShopSchema`, `updateShopSchema`, `shopListSchema`, `shopStatusSchema`, `shopOptionsSchema`, `createEmployeeSchema`, `updateEmployeeSchema`, `employeeListSchema`, `userListSchema`, `userStatusSchema`, `idSchema`, `WEEK_DAYS` |
| `catalog.validation.ts` | Categories, brands, products for admin catalog (barrel). | `createCategorySchema`, `updateCategorySchema`, `createBrandSchema`, `updateBrandSchema`, `catalogListSchema`, `createProductSchema`, `updateProductSchema`, `productListSchema`, `productStatusSchema`, `imageUpdateSchema`, `idSchema`, `imageIdSchema` |
| `master.validation.ts` | Shop masters (barrel). | `create/update` for `Category`, `Subcategory`, `Color`, `Size`; `masterListSchema`; `idSchema` |
| `shopProduct.validation.ts` | Shop products and AI photos (barrel). | `createShopProductSchema`, `updateShopProductSchema`, `shopProductListSchema`, `generatePreviewSchema`, `idSchema`, `imageIdSchema`, `professionalPhotoSchema`, `previewIdSchema`, `imageUpdateSchema` |
| `bill.validation.ts` | Purchase/sales bills (barrel). | `createPurchaseBillSchema`, `updatePurchaseBillSchema`, `createSalesBillSchema`, `updateSalesBillSchema`, `cancelBillSchema`, `recordPaymentSchema`, `billListSchema`, `branchSalesListSchema`, `branchSalesSummarySchema`, `idSchema`, `PAYMENT_MODES`, `PAYMENT_METHODS` |
| `creditNote.validation.ts` | Sales returns (barrel). | `createCreditNoteSchema`, `decideCreditNoteSchema`, `creditNoteListSchema`, `creditNoteSummarySchema`, `returnableSchema`, `idSchema`, `RETURN_REASONS`, `REFUND_MODES` |
| `shopOps.validation.ts` | Counter and expenses (barrel). | `openCounterSchema`, `closeCounterSchema`, `createExpenseSchema`, `expenseListSchema`, `idSchema`, helpers `money`, `positive`, `text`, constants `REFUND_MODES`, `EXPENSE_CATEGORIES` |
| `cashBook.validation.ts` | Cash book (barrel). | `dayKeySchema`, `dayQuerySchema`, `addEntrySchema`, `bankDepositSchema`, `closeDaySchema` |
| `dayClose.validation.ts` | Branch day close (barrel). | `dayQuerySchema`, `resolveDifferenceSchema`, `bankDepositSchema` |
| `staff.validation.ts` | Staff, rights, requests (barrel). | `staffListSchema`, `updateRightsSchema`, `updateShiftSchema`, `attendanceSchema`, `createStaffRequestSchema`, `branchInviteSchema`, `staffRequestListSchema`, `decideStaffRequestSchema`, `idSchema`, `SHIFTS`, `ATTENDANCE_STATUSES`, `STAFF_ROLES` |
| `stockTransfer.validation.ts` | Stock transfers (barrel). | `createTransferSchema`, `shopListSchema`, `branchListSchema`, `variantSearchSchema`, `receiveSchema`, `decideSchema`, `idSchema`, `TRANSFER_REASONS`, `TRANSFER_STATUSES` |
| `stock.validation.ts` | Stock summary, adjust, physical count (direct import). | `getStockSummarySchema`, `adjustStockSchema`, `physicalStockCountItemSchema`, `physicalStockCountSchema` |
| `stockAdjustment.validation.ts` | Stock adjustments page (direct import). | `createAdjustmentSchema`, `adjustStockSchema`, `physicalCountSchema`, `getAdjustmentsQuerySchema` |
| `supplier.validation.ts` | Suppliers (direct import). | `createSupplierSchema`, `recordSupplierPaymentSchema` |
| `purchaseReturn.validation.ts` | Debit notes (direct import). | `purchaseReturnItemSchema`, `createPurchaseReturnSchema` |
| `customer.validation.ts` | Shop customers (direct import). | `customerTypeEnum`, `createCustomerSchema`, `updateCustomerSchema`, `customerListQuerySchema` |
| `credit.validation.ts` | Credit payments (direct import). | `CREDIT_PAYMENT_MODES`, `receivePaymentSchema`, `customerStatementQuerySchema` |
| `barcodeLabel.validation.ts` | Barcode printing (direct import). | `barcodeLabelItemSchema`, `printBarcodeLabelsSchema` |

Schemas that live outside `validations/` (inside services, so not listed above): `branchExpense.service` (`addExpenseSchema`), `branchPricing.service` (`priceQuerySchema`, `savePricesSchema`, `bulkPriceSchema`), `branchPurchase.service` (`branchPurchaseQuerySchema`), `branchProfileSetup.service` (`updateProfileSchema`), `branchShopAssignment.service` (`moveEmployeeSchema`), `customerDue.service` (`customerDueQuerySchema`, `updateLimitSchema`), `branchReports.service` (`pnlQuerySchema`), and `services/store/*` (cart, checkout, address, review, profile, support schemas).

Note on duplicate names: `stock.validation.ts` and `stockAdjustment.validation.ts` both export an `adjustStockSchema`. `stock.controller.ts` imports `adjustStockSchema` and `physicalCountSchema` from `stockAdjustment.validation.ts`, so `stock.validation.ts` is not used by any controller (it may be used by a service; check before deleting). Note also that `bill.controller.ts` has a `findByNumber` under `purchase` as well as `sales`, but only the sales one is routed.

---

## 6. Beginner examples

Sign in, then call an authenticated route:

```
POST /api/v1/users/login            body {"username":"...", "password":"..."}   -> access token cookie
GET  /api/v1/users/me               (cookie or "Authorization: Bearer <token>")
```

Shop admin takes payment on a sales bill:

```
POST /api/v1/shop-admin/sales-bills/<bill-uuid>/payments
  -> verifyJWT -> checkRole(SHOP_ADMIN...) -> billController.sales.payment
  -> idSchema (params) + recordPaymentSchema (body) -> service -> reply
```

The same call as an employee is `POST /api/v1/employee/sales-bills/<uuid>/payments`. It works only if the employee has `billing.edit`.

Common errors: 401 "Please sign in" (no/invalid token), 403 "Access denied" (wrong role or missing permission, or "not available to employees"), 400 (zod validation failed), 404 (wrong id/scope).

---

## 7. Five-line summary

1. All APIs live under `/api/v1`; `routes/index.ts` mounts users, companies, super-admin, company-admin, branch-admin, shop-admin, employee and store; five helper files (catalog, promotion, bill, shopOps, staffCash) add routes into those routers.
2. Guards are `verifyJWT` plus a role check (`SUPER_ADMIN`, `ADMIN`, `SUB_ADMIN`, `SHOP_ADMIN`, `EMPLOYEE`, `USER`); only `/companies` and part of `/super-admin` use `checkPermission`, and `/employee` reuses the shop router behind `employeeModuleGuard` (module view/edit).
3. Scope (company / branch / shop) always comes from `req.user`, so URLs never carry a shop id.
4. Validation is done inside controllers with zod schemas from `validations/` (15 are exported through `validations/index.ts`, 7 are imported directly by path); ecommerce and promotion controllers have no zod schema, and several branch features keep their schemas in services.
5. Watch-outs found: `GET /customers` in the shop router is answered by `bill.customers` because `mountBills` is registered first, and `stock.validation.ts` looks unused by controllers (`adjustStockSchema` is defined in two files).
