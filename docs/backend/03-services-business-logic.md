# Backend Services: Business Logic Guide

Scope: every file in `backend/src/services/` (including `services/store/*`). Written for beginners. All facts below come from reading the code, not guessing.

## 1. What is the service layer?

The backend is split into layers. A request flows down, the answer flows back up:

```
Browser / app
   |  HTTP request
   v
Route        (backend/src/routes)       "which URL goes where"
   v
Middleware   (login check, permission check, validation)
   v
Controller   (backend/src/controllers)  "read the request, call a service, send the response"
   v
SERVICE      (backend/src/services)     "the actual business rules"   <-- this document
   v
Prisma       (backend/src/client.ts)    "talks to PostgreSQL"
   v
Database
```

| Layer | Job | Should it contain business rules? |
|---|---|---|
| Controller | Unpack the request, call one service method, shape the response | No |
| Service | Decide what is allowed, calculate money and stock, write to the DB in transactions | Yes, all of it |
| Prisma | Run queries | No |

Habits you will see in almost every service:

| Habit | What it means |
|---|---|
| Services are classes exported as a single instance (`export default new BillService()`) | Controllers just `import billService from ...` and call methods. `services/index.ts` re-exports most of them under names like `billService`. |
| `scope` argument (`ShopScope`, `BranchScope`, `Scope`) | Says whose data you may touch: company, branch, shop. Services always add this to their `where` so one company can never read another's data. |
| `ApiError(status, message, fieldErrors?)` | How a service says "no". Controllers/error middleware turn it into an HTTP error. |
| `prisma.$transaction(async (tx) => ...)` | Several writes succeed or fail together (a bill and its stock movement, for example). |
| "404 for not yours" | When something exists but is outside your scope, the answer is "not found", so nobody can probe for other companies' records. |
| Zod schemas exported next to the service (`...Schema`) | Input validation rules that live with the logic. |
| `updateMany` with a status condition, then check `count` | A safe "claim": two people clicking at once can only succeed once ("already decided", "already dispatched"). |

### Key shared building blocks

| Block | File | What it does |
|---|---|---|
| `inventoryService.applyStockChanges(tx, ...)` | `inventory.service.ts` | The single door for automatic stock changes. Bills, online orders, credit notes, transfers all call it. |
| `accountService.nextCode()` / `withRetry()` | `account.service.ts` | Builds the next number in a series (finds the highest used + 1) and retries if two people got the same number at once (unique-index clash, Prisma code P2002). |
| `financialYear()` | `bill.service.ts` | Indian FY label April to March: 3 Nov 2026 gives `26-27`. Used in bill, receipt, expense and debit note numbers. |
| `syncCustomerFromBill()` | `customerLedger.ts` | Keeps each shop customer's `balanceDue` and `totalBought` in step with sales bills. |
| `billService.shopContext()` | `bill.service.ts` | Loads the signed-in user's active shop (id, branch, company, code, bill prefix) or fails with 403. Many services call it first. |

---

## 2. Services by domain

### 2.1 Auth, accounts, tokens, email

| File | Purpose | Main functions | Business rules worth knowing |
|---|---|---|---|
| `services/token.service.ts` | Creates and checks JWT tokens | `generateAccessToken`, `generateRefreshToken`, `generateAccessAndRefreshToken`, `verifyToken` | Access token carries id/name/role and `type:'access'`; refresh token carries only the id and `type:'refresh'`. `verifyToken(token, expectedType)` rejects the wrong type, so a refresh token can never be used as an access token. The newest refresh token is saved on the user row, so only one refresh token is valid at a time. Lifetimes come from `config.jwt`. |
| `services/user.service.ts` | Login, logout, refresh, sign-up, profile, password flows | `assertCanSignIn`, `loginUser`, `logoutUser`, `refreshAccessToken`, `registerCustomer`, `getCurrentUser`, `changePassword`, `forgotPassword`, `resetPassword`, `updateUser` | Login accepts email OR phone in either field. "No such account" and "wrong password" give the same message, and a missing account takes the same time as a wrong password (no account-sniffing). `assertCanSignIn` runs at login, at refresh and on every authenticated request: blocks deleted/inactive/blocked users, and for company/branch/shop-bound roles blocks when their company, branch or shop is no longer active. Public sign-up always creates a `CUSTOMER` regardless of what the request says. First sign-in of the day marks shop staff as "in" (attendance). Change password issues fresh tokens and signs out other devices. Forgot password always "succeeds" (cannot check if an account exists); with no SMTP in development the reset link is printed in the server log. Reset password signs the user out everywhere. |
| `services/account.service.ts` | Shared account helpers for admin-created users | `ensureLoginIsFree`, `nextCode`, `withRetry`, `setStatus`, `revokeSessions`, `listUsers`, `SAFE_USER` | `SAFE_USER` is the list of fields safe to send to the browser (never password or tokens). Who may block whom: Super Admin manages Admin/Sub Admin/Shop Admin/Employee/User; Admin manages Sub Admin/Shop Admin/Employee (own company); Sub Admin manages Shop Admin/Employee (own branch); Shop Admin manages Employee (own shop). You can never manage yourself. Leaving ACTIVE status ends all of that user's sessions immediately. Phone and email must be unique across accounts (409 with field-level messages). |
| `services/permission.service.ts` | Role to permission lookup | `getRolePermissions`, `syncSuperAdmin` | Permissions per role are read from `RolePermission` rows and cached in memory for 60 seconds. `syncSuperAdmin` gives SUPER_ADMIN every permission in `config/permissions.ts` (safe to run repeatedly). |
| `services/email.service.ts` | Sends email through nodemailer | `sendEmail`, `sendResetPasswordEmail`, `sendVerificationEmail` | Plain functions (not a class). Reset and verification mails accept an optional custom URL for the frontend page. |

### 2.2 Organisation: company, branch, shop, employee, staff

The hierarchy is Company > Branch > Shop > Employee. Roles: SUPER_ADMIN, ADMIN (company admin), SUB_ADMIN (branch admin), SHOP_ADMIN, EMPLOYEE, USER (customer).

| File | Purpose | Main functions | Business rules worth knowing |
|---|---|---|---|
| `services/company.service.ts` | Companies and their single admin login | `createCompany`, `listCompanies`, `getCompanyById`, `updateCompany`, `deleteCompany` | Company code is built from the name ("Aarvi Textiles Pvt Ltd" gives `AARV-TEX`, then `-2`, `-3`). Creating a company also creates the company admin's login in one go. Two creates at once can pick the same code; the unique index rejects one and the code retries. Changing the admin password or deactivating the company ends sessions. Delete is a soft delete: frees the code and admin phone for reuse, soft-deletes its branches and signs out their admins and employees. |
| `services/branch.service.ts` | Branches of a company | `list`, `get`, `options`, `create`, `update`, `setStatus`, `ofUser`, `assertActiveInCompany`, `counts` | A branch has a login (branch admin) and needs an admin password on create. Status changes only via `setStatus`, never through the edit form. Deactivating a branch signs out its admin and employees. Out-of-scope branches return 404. |
| `services/shop.service.ts` | Shops inside branches | `list`, `get`, `options`, `create`, `update`, `setStatus`, `assertActiveInScope`, `branchStats`, `counts` | A shop may have one Shop Admin login. A shop cannot move to another branch (employees' branch follows their shop). Deactivating a shop signs out its employees. `branchStats` powers the Branch Shops page (stock units, sales this month, next sales bill number, code the next shop will get). |
| `services/employee.service.ts` | Employees (company admin, or branch admin for own branch) | `list`, `get`, `create`, `update` | Every employee works in a shop; their branch is always the shop's branch. The shop must be active and within the admin's scope. Changing password, branch or permissions forces re-login. Branch admins cannot move people out of their branch. |
| `services/staff.service.ts` | A shop's team: rights, shifts, attendance, new-staff requests | `list`, `updateRights`, `updateShift`, `markAttendance`, `autoClockIn`, `createRequest`, `listShopRequests`, `listBranchRequests`, `decideRequest` | Shop rights (POS, discount, credit sale ...) replace only the shop-level permissions; other permissions given by higher admins are kept. Rights are read from the DB on each request, so changes apply at once. The shop manager's rights are fixed. Only staff who are "in" can be marked "out". `autoClockIn` never overrides a status the manager set (for example on leave) and never fails the login. Approval flow: shop requests new staff, branch admin approves (the employee login is created then, with requested rights and shift) or rejects. Approval "claims" the request first so two approvals cannot create two logins. Duplicate pending request for the same phone is blocked. Evening shift starts 15:00. |
| `services/branchStaff.service.ts` | Branch admin's staff roster | `getStaff`, `inviteStaff` | Real employees and shop managers plus today's attendance. Pending requests show as "INVITED" rows. A branch admin adding staff creates a request that can be approved straight away. |
| `services/branchShopAssignment.service.ts` | Move employees between shops of a branch | `getAssignmentData`, `moveEmployee` | A move changes the employee's shop. History is the audit log (action `employee.move`). Cannot move someone to the shop they already work in. |
| `services/branchProfileSetup.service.ts` | Branch admin edits own branch profile | `getProfile`, `updateProfile` | Name, code and status belong to the company admin; the branch admin edits only contact details and opening hours. |

### 2.3 Catalog: products, categories, brands, masters

| File | Purpose | Main functions | Business rules worth knowing |
|---|---|---|---|
| `services/product.service.ts` | Company-level product catalog (company/branch/employee view) | `list`, `get`, `create`, `update`, `setStatus`, `delete`, `addImages`, `updateImage`, `deleteImage`, `counts`, `canEdit` | Who can edit: company admin any product of the company; branch admin products created in their branch; employee only own products and only with `products.manage`; super admin edits nobody's. New products start as DRAFT until complete and published. Updating syncs variants: listed ones are updated or added, left-out ones are deactivated (not deleted, history needs them); a deactivated variant with the same size+colour comes back. Variant SKU suffix looks like `NAV-XL` (from "Navy Blue" + "XL"). Status flow Draft/Published/Unpublished/Archived with a publish checklist; super admin may only unpublish (moderation). Only the company admin can delete (soft delete). |
| `services/shopProduct.service.ts` | Products of one shop (shop admin view) | `list`, `get`, `create`, `update`, `delete`, `addImages`, `updateImage`, `deleteImage`, `ShopScope`, `LOW_STOCK` (=5) | Always limited to the signed-in user's shop. Category/subcategory must be active and belong together; sizes and colours must exist and be active (ones already on the product may stay even if deactivated later). `syncVariants` keeps one `ProductVariant` per size x colour (cart and orders work on variants). Creating variants also creates `Inventory` rows in the shop's branch. SKU must be free. Deleting an image also deletes AI previews made from it. |
| `services/master.service.ts` | Shop masters: categories, subcategories, colours, sizes | `list/get/create/update/delete` for each of the four | Each company has its own masters shared by its branches and shops. Rows with `companyId = null` are platform-wide: all companies can use them, only the super admin can change them. A company never sees or changes another company's masters. Names are unique within their scope. |
| `services/categoryBrand.service.ts` | Global category tree and brands | `listCategories`, `categoryOptions`, `create/update/deleteCategory`, `listBrands`, `brandOptions`, `create/updateBrand`, `assertUsable` | Categories: one global taxonomy by the super admin, only two levels (Men > Shirts), a category cannot be its own parent, codes like `MENS-SHIRTS-TOPS` (then `-2`...). Only unused categories can be deleted; otherwise deactivate. Brands: global (super admin) plus a company's own (company admin); each side edits only its own. |
| `services/branchPricing.service.ts` | Branch admin "Products & Prices" | `list`, `savePrices`, `applyBulkPrice` | Shows selling price, weighted-average purchase cost (confirmed purchase bills), margin and stock. Products below `MIN_MARGIN_PCT` (25%) are flagged. Saving writes the price to the product and all its variants (the POS bills at variant price). Price is clamped between Rs 1 and MRP. |
| `services/aiPreview.service.ts` | AI colour previews and "professional photos" | `generate`, `remove`, `cleanBackground`, `professionalPhoto`, `aiReady`, `model` | Uses Cloudflare Workers AI (FLUX.2 image editing) when account id and token are set; otherwise a built-in recolour (`built-in-recolour`). The uploaded original is only read; each preview is a new file plus a `ProductColorPreview` row (one per product, colour, source image). The model only accepts small square images, so the photo is padded to a square and cropped back. Each AI result is checked against the original; a failed AI result falls back to the built-in recolour. When free AI quota runs out for the day, the rest of the run uses the recolour. Professional photo styles: GHOST, MANNEQUIN, MODEL, with extra "how to drape a saree/lehenga" hints and a prompt that locks colour, print and shape. |
| `services/barcodeLabel.service.ts` | Barcode label printing (Pick products, From purchase bill, Reprint) | `getPurchaseBills`, `getBillItemsForLabels`, `searchProductsForLabels`, `getReprintBatches`, `recordPrintJob` | Barcode = variant SKU (falls back to product SKU). Search is capped at 50 rows and uses parameterised SQL. Each print job is saved as `JOB-0001`, numbered per branch, with the label options and item list stored as JSON. This service does not print; it only records the job. |

### 2.4 Inventory, stock, adjustments, transfers

Stock is stored per branch and variant in `Inventory` (`physicalQty`, `reservedQty`, `damagedQty`, `threshold`). Available = physical minus reserved. Every change writes a `StockMovement` row (a ledger).

| File | Purpose | Main functions | Business rules worth knowing |
|---|---|---|---|
| `services/inventory.service.ts` | Core stock engine and inventory screens | `applyStockChanges`, `getDashboard`, `list`, `adjustStock`, `batchAdjust`, `updateThreshold`, `movements` | **`applyStockChanges`** must run inside the caller's transaction. It merges changes per variant and movement type, drops zero changes, and processes in a fixed order (by variant id) to avoid deadlocks. Stock in is an upsert. Stock out is one atomic SQL `UPDATE ... WHERE physicalQty - reservedQty >= qty`, so two simultaneous sales cannot oversell; if it fails you get "Insufficient stock for X (size/colour). Required: n, available: m". Each change records previous and new quantity, reason, reference, source type/id and who did it, then re-computes `Product.stockQuantity`. Manual `adjustStock` and `batchAdjust` validate scope, never allow negative stock, and write movement, adjustment audit and product total. |
| `services/stock.service.ts` | Stock Summary ledger (opening, purchase, sold, returns, transfers, adjustments, closing) and physical counts | `getStockSummary`, `adjustStock`, `recordPhysicalStockCount` | The ledger computes opening = closing - purchases + sold - sales returns - transfers - adjustments. Types: INCREASE, DECREASE, CORRECTION (set an exact number), DAMAGE (reduces stock and adds to `damagedQty`). Physical count sets inventory to the counted number and saves a `PhysicalStockAudit`. Note: this older service writes with raw SQL and does not use `applyStockChanges`. |
| `services/stockAdjustment.service.ts` | Stock Adjustment page (numbered adjustments) | `getNextAdjustmentNumber`, `getAdjustmentVariants`, `getAdjustmentHistory`, `createAdjustment` | Numbers look like `ADJ-0046`. Approval status rule: marking damaged, or a quantity of 2 or fewer, is `AUTO`; anything bigger is `APPROVED` (a PENDING path is mentioned in the comment but the code only produces AUTO or APPROVED). Writes inventory, a `StockAdjustment` row and a `StockMovement`. |
| `services/stockTransfer.service.ts` | Shop-to-shop stock transfer inside one branch | Shop side: `shops`, `variants`, `create`, `listShop`, `getShop`, `dispatch`, `receive`. Branch side: `listBranch`, `summary`, `getBranch`, `sourceOptions`, `decide` | Statuses: REQUESTED, APPROVED or REJECTED, DISPATCHED, RECEIVED or SHORT. Numbers `TRF-0001` per branch. Each shop has its own variants, so units move from the source shop's variant to the requesting shop's matching variant (matched by product name + size + colour, case-insensitive). If the requesting shop does not carry the item, it is cloned into that shop on receipt. The suggested request quantity is about 30 days of sales, at least back to threshold. Details in the key flow below. |
| `services/shopProduct.service.ts` | (see 2.3) | | Creating variants seeds the `Inventory` rows. |

### 2.5 Billing, credit, ledger, day close, cash book

| File | Purpose | Main functions | Business rules worth knowing |
|---|---|---|---|
| `services/bill.service.ts` | Purchase bills (stock in) and Sales bills (stock out, the POS) | Purchase: `listPurchase`, `getPurchase`, `createPurchase`, `updatePurchase`, `confirmPurchase`, `cancelPurchase`, `deletePurchase`. Sales: `getSalesByBillNumber`, `listSales`, `getSales`, `createSales`, `createExchangeBill`, `updateSales`, `confirmSales`, `cancelSales`, `deleteSales`. Both: `recordPayment`, `exportSales`, `salesSummary`, `searchCustomers`, `shopContext` | See the long list after this table. |
| `services/customerLedger.ts` | Not a class: `syncCustomerFromBill(tx, before, after)` | one function | Takes the bill before and after a change and applies only the difference to the `ShopCustomer` with that phone number. Only CONFIRMED, non-deleted bills with a phone count; drafts, cancelled and deleted count as zero. Creates the customer on the first credit or named bill. Totals never go below 0. |
| `services/credit.service.ts` | Credit / Udhaar page (customers who owe the shop) | `getMetrics`, `getCustomersWithDue`, `getCustomerStatement`, `recordPayment`, `getWhatsAppReminders`, `getNextReceiptNumber` | Receipt numbers `RC/26-27/0044`. Statement merges credit bills (debit = credit portion) and payments into a running balance. Collecting a payment: cannot exceed balance; payment is applied to the oldest unpaid bills first (FIFO), each getting a `SalesBillPayment` (`atBilling:false`) and updated paid/due/status; customer `balanceDue` goes down. Aging buckets by oldest unpaid bill. |
| `services/customerDue.service.ts` | Branch view of customer dues across shops | `list`, `summary`, `get`, `updateLimit`, `reminders`, `export` | Due is split "recent" (up to 30 days) and "old" (older). Due not backed by any open bill (for example an opening due) counts as old. Branch admin can set a credit limit per customer. WhatsApp reminders target dues older than 30 days (or chosen customers). |
| `services/creditNote.service.ts` | Sales returns (credit notes) | `returnable`, `create`, `decide`, `get`, `list`, `summary` | Numbers `CN-YYYYMMDD-0001`. `REFUND_APPROVAL_LIMIT` = Rs 2000. Full rules in the key flow below. |
| `services/branchApproval.service.ts` | Branch admin approval queue | `getApprovals`, `decide` | Today the only thing shops send up for approval is a refund credit note (any cash refund, or above Rs 2000). `decide` calls `creditNoteService.decide` with stock going back to shelf (RESTOCK). It also returns a table of limits the system really enforces. |
| `services/counter.service.ts` | Open and close the cash counter session | `current`, `open`, `close` | Only one open session per shop; opening takes a database advisory lock so two clicks cannot open two sessions. Opening cash is recorded. |
| `services/cashBook.service.ts` | The counter's cash book and day close | `getDay`, `addEntry`, `bankDeposit`, `closeDay`, `movements`, `drawer`, `DENOMINATIONS` | Drawer cash is built from bills paid in CASH, due collected, cash expenses, supplier cash payments, cash refunds (leave the drawer when the credit note is approved) plus manual entries. Cash cannot leave the drawer if it is not there (OUT and bank deposit are checked against expected cash). Cash entries need an open counter. Day close: you count notes (500, 200, 100, 50, 20, 10, 5), then deposit + kept float must equal counted cash. If counted differs from expected you must give a reason. A zero difference is auto-ACCEPTED, otherwise it waits for branch review. Close is claimed with `closedAt: null` to prevent double close. |
| `services/dayClose.service.ts` | Branch admin's view of each shop's day close | `getDayClose`, `resolveDifference`, `recordDeposit` | All figures come from shops' cash books. Accepting a difference stores reason, follow-up action and note. Branch can record the day's bank deposit (`BankDeposit`). |

**Sales and purchase bill rules (`bill.service.ts`)**

| Rule | Detail |
|---|---|
| Stock is never touched directly | A private `post()` compares what the bill already posted with what it should post now, and only the difference goes to `applyStockChanges`. Re-saving an unchanged bill posts nothing. A failed stock check rolls back the whole bill. |
| Draft vs confirmed | Only CONFIRMED bills move stock, count for customers and count in reports. DRAFT bills move nothing. |
| Purchase vs sales sign | Purchase: `PB-YYYYMMDD-0001`, stock +, movement types PURCHASE_IN / PURCHASE_REVERSAL. Sales: `{bill prefix or shop code}/{FY}/00001` (for example `WW/26-27/00232`), stock -, movement types SALE_OUT / SALE_REVERSAL. |
| Tax-inclusive sales | New sales bills have `pricesIncludeTax` true: the tag price already contains GST (same as the online store). The bill discount is shared over the lines by value, then GST is taken out of what each line pays: `taxable = linePays / (1 + rate)`, `GST = linePays - taxable`. Total is rounded to the whole rupee (`roundOff`). Older bills (GST added on top) keep their original maths, so editing never changes what was charged. |
| Purchase tax | Purchase lines add GST on top: `net = qty x unitCost`, `tax = net x rate / 100`. |
| Discount | Discount cannot exceed the bill amount. |
| Payment and credit | Split payments allowed; payments are capped so they never exceed the total. Any unpaid rest is credit. Status PAID / PART_CREDIT / CREDIT from `paymentStatusOf`. Giving credit on a sales bill requires customer name and phone. A purchase bill cannot be overpaid (error), a sales bill is capped. |
| Versioning | `lock()` bumps the bill's `version` and checks status (and the client's version if given), so a double submit or stale edit cannot post twice. |
| Day close lock | `assertDayOpen`: once today's counter is closed (and not reopened), new sales bills are refused. Shops that never open a counter are not affected. |
| Frozen after returns | A sales bill with non-rejected credit notes (or legacy sales returns) cannot be edited, cancelled or deleted. |
| Edit tracking | Editing a CONFIRMED sales bill increments `editCount` and `lastEditedAt` (branch watch list). |
| Delete | Drafts are hard-deleted. Confirmed bills are reversed then soft-deleted, so the stock trail stays. |
| Purchase safety | A purchase cannot be reduced or cancelled once its units are sold ("Stock from PB-... has already been sold"). |
| Later payments | `recordPayment` works on CONFIRMED bills only, cannot exceed balance due. Payments recorded after billing are kept across edits (`atBilling:false`). |
| Exchange bill | `createExchangeBill` runs inside the credit note transaction: the credit note value is recorded as a `CREDIT_NOTE` payment (not cash); the customer pays any difference by `topUpMode`; if new items are worth less than the return it is refused. |

### 2.6 Purchases, suppliers, purchase returns

| File | Purpose | Main functions | Business rules worth knowing |
|---|---|---|---|
| `services/branchPurchase.service.ts` | Branch admin's read-only view of all shops' purchase bills | `list`, `summary`, `get` | Shops create purchase bills (they put stock into a shop); the branch only follows them up. Monthly filter `YYYY-MM`. |
| `services/supplier.service.ts` | Suppliers and supplier payments | `listSuppliers`, `getSupplierLedger`, `createSupplier`, `recordPayment`, `getNextReceiptNumber` | Supplier name is unique per branch (case-insensitive). Payable is always recomputed: unpaid opening balance + balance due on confirmed purchase bills of that supplier. Payment numbers `PY/26-27/0001` per branch and FY. A payment against a bill cannot exceed its balance due; a payment with no bill can only clear the opening balance. After each payment the supplier's stored `payable` is refreshed. TDS deducted is recorded. |
| `services/purchaseReturn.service.ts` | Purchase returns (debit notes) to suppliers | `getNextDebitNoteNumber`, `getSuppliers`, `getBillsBySupplier`, `getEarlierReturns`, `createPurchaseReturn`, `getPurchaseReturn` | Debit note numbers `DN/26-27/0006`. At least one line with return quantity above 0. Tax defaults to 5% when a line has none. Only a CONFIRMED return changes stock (physical qty reduced, floored at 0) and, if `settleAs` is `DEDUCT_FROM_PAYABLE`, lowers the bill's `balanceDue` (and sets PAID or PART_CREDIT). Caveat from the code: this service updates `Inventory` directly instead of `applyStockChanges` (so no `StockMovement` row), and when no bill is given it falls back to using the shop id as the branch id. |

### 2.7 Promotions and coupons

| File | Purpose | Main functions | Business rules worth knowing |
|---|---|---|---|
| `services/promotion.service.ts` | Offers and coupons for company admins and the platform | `getDashboard`, offers: `listOffers/getOffer/createOffer/updateOffer/toggleOffer/deleteOffer`, coupons: `listCoupons/getCoupon/createCoupon/updateCoupon/toggleCoupon/deleteCoupon`, `validateCoupon`, `recordUsage`, `computeStatus` | Status is computed, not stored: inactive flag or dates decide Scheduled / Active / Expired. Start date must be before the end date. Coupon codes are upper-cased and unique (409). `validateCoupon` checks, in order: exists, scope (company coupon or global), active, within dates, total usage limit, per-customer limit, minimum purchase. Discount: `PERCENTAGE` = subtotal x value / 100 capped by `maxDiscountLimit`; `FLAT` = value capped at subtotal; rounded to 2 decimals. `recordUsage` is transaction-safe and bumps `usedCount`. |

### 2.8 Orders and the online storefront

`order.service.ts` is the admin/fulfilment side (what shop/branch/company admins see). `services/store/*` is the customer-facing side (what shoppers use).

| File | Purpose | Main functions | Business rules worth knowing |
|---|---|---|---|
| `services/order.service.ts` | Admin order management and an older customer-order API | `getDashboard`, `list`, `get`, `updateStatus`, `updateShipping`, `updatePayment`, `reviewCancellation`, `listReturns`, `updateReturnStatus`, `getInvoiceData`, `listCustomerOrders`, `getCustomerOrder`, `requestCustomerCancellation`, `requestCustomerReturn`, `cancelAndRestock`, `NEXT_STATUS`, `NEXT_RETURN_STATUS`, `returnedLines` | Order status moves forward only (see key flow). Delivered and Cancelled never move again except Delivered via a return. Online-paid orders can be packed only after payment arrives. COD is auto-marked PAID on delivery. A cancelled order can never be reopened (stock already restored). `cancelAndRestock` uses a conditional update so a repeated cancel restores stock only once. Return requests move forward only (REQUESTED, IN_REVIEW, APPROVED, RECEIVED, COMPLETED or REJECTED). Refund only after the item is marked RECEIVED. Exchange returns refuse "refund". A return is restocked once (guarded by checking existing stock movements). A full-order refund closes the order as RETURNED and PAID becomes REFUNDED; part returns and exchanges leave it DELIVERED. Customers get a notification for each step. |
| `services/store/catalog.service.ts` | Public store browsing (no sign-in) | `listProducts`, `getProduct`, `suggest`, `home`, `deliveryEstimate`, `sortSizes`, `stockOf` | Only PUBLISHED products of an ACTIVE shop of an ACTIVE company are shown. Stock = branch inventory physical minus reserved. The catalog is filtered, faceted and sorted in memory after one query so facet counts are exact (each facet counts with all other filters applied). In-stock items sort first. Search: every word must match, plurals match ("sarees" finds "saree"). "Bestseller" = top tenth by units sold. Card photo uses a colour photo of the first colour in stock when every colour has its own. Delivery constants: free above Rs 999, standard Rs 49, express Rs 99. Pincode must be 6 digits. Size order XS<S<M<L<XL<XXL, then numbers. |
| `services/store/customer.service.ts` | Signed-in customer: bag, wishlist, addresses, coupons, reviews | `getCart`, `addToCart`, `updateLine`, `removeLine`, wishlist methods, `listAddresses`, `saveAddress`, `deleteAddress`, `review`, `myReviews`, `toReview`, `publicCoupons`, `couponFor`, `deliveryFee` | Prices always come from the database, never from the client. Adding checks the real stock of that size. Changing to a size already in the bag merges the two lines. Cart shows per-line problems (`hasProblems`). Coupon check (`couponFor`): valid, in dates, not used up, not already used by this customer, applies only to that company's or shop's items, minimum purchase; returns the discount share per bag line (needed to split across shop orders). Only one default address is kept. Only customers whose order of that product was DELIVERED may review it. Delivery options: STANDARD, EXPRESS, PICKUP. |
| `services/store/checkout.service.ts` | Turn the bag into orders and handle Razorpay | `checkout`, `verify`, `failed`, `retry`, `switchToCod`, `status`, `paymentConfig` | One order per shop (each shop ships from its own branch stock). Coupon is shared across the orders by value; the delivery fee goes on the first order. Store prices include GST; GST is stored inside each order for invoices and reports. Stock is deducted at order time. One Razorpay order covers all the shop orders. An order becomes PAID only after the Razorpay signature is verified with the key secret; the client can never mark itself paid. Failed or cancelled payment keeps the orders so the customer can retry or switch to cash on delivery. |
| `services/store/orders.service.ts` | Customer's orders: tabs, tracking, cancel, returns, buy again | `list`, `get`, `cancel`, `requestReturn`, `returns`, `buyAgain` | Tabs: all, active, delivered, cancelled, returns. Customer sees six tracking steps mapped from order statuses. Cancel allowed only while PENDING or CONFIRMED. Unpaid order: cancelled at once and stock restored. Paid order: becomes a cancellation request (shop approves and refunds). Returns allowed after delivery, per item, no duplicates, cannot return more than bought minus what is already in a return. Refund for a line = its price share after coupon; delivery fee is not refunded. Resolution is REFUND or EXCHANGE. `buyAgain` re-adds items, skipping gone or sold-out ones. |
| `services/store/account.service.ts` | Customer profile and support | `profile`, `updateProfile`, `passwordChanged`, `support`, `forgotPassword` | Support topics are a fixed list (Order and delivery, Returns and refunds, Payments, Size and fit, My account, other). |
| `services/notification.service.ts` | Customer notifications (bell + page) | `notify`, `notifyOrderStatus`, `list`, `unreadCount`, `markRead`, `markAllRead` | Types: ORDER, PAYMENT, RETURN, OFFER, ACCOUNT. `notify` is written inside the same transaction as the change it describes, so a rolled-back change leaves no message behind. `notifyOrderStatus` has a text for each order status and skips statuses without one. |

### 2.9 Expenses

| File | Purpose | Main functions | Business rules worth knowing |
|---|---|---|---|
| `services/expense.service.ts` | Shop running expenses | `getNextExpenseNumber`, `create`, `list` | Numbers `EX/26-27/0001`, per shop, restart each financial year. "Paid by" containing "cash" means mode CASH; contains "upi" means UPI; otherwise BANK. A cash expense also creates a `CashEntry` OUT row, so it reduces the drawer in the cash book. Month metrics are computed from the month's expenses; default month is the current one. |
| `services/branchExpense.service.ts` | Branch-level expenses | `getExpenses`, `addExpense`, `EXPENSE_HEADS`, `PAID_FROM` | Shows shops' own expenses plus what the branch books. A branch expense can go to one shop, be split equally over active shops (leftover paisa goes to the first shop), or stay at branch level. Branch payments are never CASH, so they never change a shop drawer. Paid-from options: Branch bank, Branch petty cash, Owner. |

### 2.10 Reports and dashboards

| File | Purpose | Main functions | Business rules worth knowing |
|---|---|---|---|
| `services/dashboard.service.ts` | Shop admin dashboard | `getShopDashboard` | Everything is read from the database: confirmed, non-deleted bills of the shop; payments of cancelled bills ignored; "today" is the server's local day. Net sales are after approved credit notes (pending/rejected not counted). Gross profit = net sales ex-tax minus average cost of goods. Cash in drawer matches the Cash Book page. Also dues grouped per customer (phone, else name), supplier payables, stock value at average cost, today's bills, payment mix and online orders waiting for the shop. Weighted-average purchase cost per variant comes from confirmed purchases (ex-tax). |
| `services/branchOverview.service.ts` | Branch admin dashboard | `get` | Sales, purchases and stock across the branch's shops; only confirmed bills count; change vs yesterday is null when yesterday had no sales. |
| `services/branchReports.service.ts` | Branch profit and loss | `getPnl` | Net sales = confirmed sales ex-GST minus approved returns. Cost of goods = units sold x average purchase cost in the branch. Gross profit = net sales - COGS. Net profit = gross profit - expenses (shop expenses plus branch expenses not charged to a shop). With a `shopId` it covers only that shop. |
| `services/branchPurchase.service.ts`, `customerDue.service.ts`, `dayClose.service.ts` | Other branch reports | | See 2.6 and 2.5. |

### 2.11 Audit

| File | Purpose | Main functions | Business rules worth knowing |
|---|---|---|---|
| `services/audit.service.ts` | Append-only activity log | `log`, `track` (runs a change and logs it), `fromRequest` | Any key that looks like a credential (password, token, secret, otp, apiKey ...) is stripped before saving. Logging must never break the action it records: failures are logged to the app log and swallowed. The wrapper writes SUCCESS with before/after, or FAILURE with the error message; plain validation errors (400) are not audited because nothing was attempted. `fromRequest` takes actor, IP and user agent from the request. |

---

## 3. Key flows, step by step

### 3.1 A sale at the shop counter (`bill.service.ts`)

1. The shop admin or employee opens the counter (`counterService.open`, with opening cash). Only one session can be open per shop.
2. The POS calls `createSales` with items (variant, quantity, price, tax rate, discount), customer details and payments.
3. `assertDayOpen` refuses the bill if today's counter was already closed.
4. Inside one transaction:
   1. `loadVariants` checks every item is an active variant of this shop.
   2. `salesLines` prices the lines. The tag price includes GST; the bill discount is shared over lines; GST is taken out of each line; total is rounded to the rupee.
   3. `salesPaidNow` caps the split payments at the total. The unpaid rest is credit (needs customer name and phone).
   4. The bill number is built (`{prefix}/{FY}/00001`) by `nextBillNumber`; a clash retries automatically.
   5. The bill, its lines and counter payments are saved.
   6. If the status is CONFIRMED, `post()` calls `applyStockChanges` with SALE_OUT. If any item lacks stock, the entire bill is rolled back with "Insufficient stock...".
   7. `syncCustomerFromBill` updates the customer's `totalBought` and `balanceDue`.
5. Later, a customer can pay the credit part: `credit.service.recordPayment` spreads it over the oldest unpaid bills.
6. Editing a confirmed bill re-posts only the stock difference and bumps `editCount`. Cancelling reverses the stock (SALE_REVERSAL).
7. At the end of the day `cashBook.closeDay` compares counted cash with expected cash; this locks new bills for the day.

### 3.2 An online order (`store/*` and `order.service.ts`)

1. The customer browses (`store/catalog.service`) and adds to the bag (`customerService.addToCart`, which checks real stock and takes the price from the database).
2. At checkout (`checkoutService.checkout`) the bag must be non-empty with no problem lines and a chosen address. The coupon (if any) is validated and its discount shared across lines.
3. The bag is split into one order per shop. The delivery fee goes on the first order.
4. If payment is ONLINE, a Razorpay order is created for the grand total.
5. In one transaction each order is created as PENDING, stock is deducted at once (SALE_OUT; fails the whole checkout if someone took the last piece), the coupon usage is recorded, the bag is emptied, and a notification is written for COD.
6. Online: after paying, the client calls `verify`. Only a valid Razorpay signature marks the orders PAID. Failure keeps the orders; the customer can `retry` or `switchToCod`.
7. The shop moves the order forward with `orderService.updateStatus` along `NEXT_STATUS` (PENDING, CONFIRMED, PROCESSING/PACKED, DISPATCHED/SHIPPED, OUT_FOR_DELIVERY, DELIVERED). Online orders cannot be packed before payment. Each step notifies the customer. COD becomes PAID on delivery.
8. Cancel: unpaid and still PENDING/CONFIRMED means instant cancel and stock restored. Paid means a cancellation request that the shop reviews (`reviewCancellation`), then stock is restored once and the payment is marked refunded.
9. Return (after delivery): the customer picks items and chooses REFUND or EXCHANGE. The shop moves the request REQUESTED, IN_REVIEW, APPROVED, RECEIVED, COMPLETED. Restock is applied once; the refund is allowed only after the item is received.

### 3.3 A purchase (stock in) (`bill.service.ts`, `supplier.service.ts`)

1. The shop creates a purchase bill with supplier details, items (variant, quantity, unit cost, tax rate) and how much was paid now. Number `PB-YYYYMMDD-0001`.
2. As a DRAFT nothing happens to stock. Tax is added on top of cost: `tax = qty x cost x rate / 100`.
3. `confirmPurchase` (or creating directly as CONFIRMED) calls `post()` with PURCHASE_IN, so inventory goes up and movements are written.
4. Payment: `amountPaid` omitted means paid in full; less means the rest is `balanceDue` (supplier payable). Overpaying is an error.
5. Paying the supplier later: `supplierService.recordPayment` (receipt `PY/26-27/0001`) reduces the bill's `balanceDue`. Cash payments show in the cash book.
6. Editing or cancelling reverses only what changed, but fails with "Stock from PB-... has already been sold" if the units have gone.
7. Sending goods back: `purchaseReturnService.createPurchaseReturn` makes a debit note `DN/26-27/0006`. When CONFIRMED it lowers stock and, if chosen, deducts the value from the bill's payable.
8. Optionally print barcode labels from the bill (`barcodeLabelService`).

### 3.4 A stock transfer between shops (`stockTransfer.service.ts`)

1. Shop B (needs stock) calls `create`: picks items and optionally a source shop. `variants` suggests low-stock items and shows the best stock elsewhere in the branch. Status REQUESTED, number `TRF-0001`. You cannot request from your own shop.
2. Branch admin calls `decide`. Reject sets REJECTED with a reason. Approve needs a source shop (not the requester) and an approved quantity per line, which must not exceed that shop's available stock and needs the shop to actually stock the item. At least one unit must be approved. Status APPROVED.
3. Source shop calls `dispatch`. The status is claimed from APPROVED to DISPATCHED; stock leaves the source shop's variants (TRANSFER_OUT).
4. Shop B calls `receive` and counts each line. Received cannot exceed dispatched. If any line is short, the status is SHORT, otherwise RECEIVED.
5. Stock enters Shop B's matching variants (TRANSFER_IN). If Shop B never carried the item, a copy of the product and variant is created in Shop B first.
6. Because every step is claimed with a status condition, double clicks cannot dispatch or receive twice.

### 3.5 A credit note (sales return) (`creditNote.service.ts`)

1. The shop searches a bill by number (`returnable`): the sales bill must be CONFIRMED and shows what can still come back (sold minus what is on non-rejected notes).
2. `create` locks the bill (bumps its version) so two returns or an edit cannot both pass the quantity check. Quantity cannot exceed the returnable amount.
3. The return value per unit is the line price after the bill discount, as the customer really paid. GST is taken out of the amount (`tax = total x rate / (100 + rate)`).
4. Settlement options:
   - REFUND (with a refund mode): needs branch approval if the mode is CASH or the total is over Rs 2000 (`REFUND_APPROVAL_LIMIT`). Otherwise it is approved at once.
   - ADJUST_DUE: reduces the bill's `balanceDue` (cannot be more than what is due) and updates the customer ledger.
   - EXCHANGE: creates a replacement sales bill in the same transaction; the note's value is paid as `CREDIT_NOTE`, the customer tops up any difference (new items must be worth at least the return).
   - STORE_CREDIT: kept as open store credit (the branch can also choose this when deciding).
5. Approved at once with `stockTo = RESTOCK`: stock goes back (RETURN_RESTOCK). Damaged goods do not go back to the shelf.
6. Pending notes appear in the branch approval queue (`branchApprovalService`). The branch admin approves (choose RESTOCK or not), converts to store credit, or rejects. Only a PENDING_APPROVAL note can be decided, once.
7. A bill with a non-rejected credit note can no longer be edited, cancelled or deleted. A cash refund leaves the drawer in the cash book when the note is approved.

---

## 4. Things a new developer should watch for

| Item | Why |
|---|---|
| Two stock systems | `inventory.service.applyStockChanges` is the safe path (atomic, no overselling). `stock.service`, `stockAdjustment.service` and `purchaseReturn.service` update inventory in their own way (raw SQL or direct update), so keep them in mind when changing stock behaviour. |
| Two return systems | Legacy `SalesReturn` still exists; credit notes are the current way. Both are checked when freezing a bill. |
| One order path | The older `order.service.createCustomerOrder` and `POST /users/orders/checkout` were removed (2026-11-07, insecure). Orders are placed only through `store/checkout.service` (`POST /store/checkout`). |
| Numbering | Counters are "highest used + 1" per scope with a retry on unique-index clash, not a database sequence. Formats: PB-date-0001, SB `prefix/FY/00001`, CN-date-0001, TRF-0001, ADJ-0046, RC/FY/0044, PY/FY/0001, DN/FY/0006, EX/FY/0001, ORD-date-RANDOM, JOB-0001. |
| Money rounding | Most services use a local `round2` (2 decimals). Sales bill totals round to the whole rupee. |

---

## 5. Summary (5 lines)

1. Services hold all business rules; controllers only translate HTTP, and Prisma only runs queries inside services.
2. Every stock change should go through `inventoryService.applyStockChanges` in the same transaction as its document (bill, order, note, transfer), which prevents overselling and writes a movement ledger.
3. Sales bills are tax-inclusive, only CONFIRMED bills count, edits post only the stock difference, and credit and customer dues are kept in step by `syncCustomerFromBill`.
4. Approval and "claim" patterns (refunds over Rs 2000 or cash, stock transfers, staff requests, day-close differences) use status-conditioned updates so nothing happens twice.
5. Data is always scoped by company/branch/shop and out-of-scope records return 404; the storefront (`services/store/*`) splits one bag into one order per shop and trusts only server prices and verified Razorpay signatures.
