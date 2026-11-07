# Backend 01: Database and Core

This page explains the base of the backend: how it starts, how it is configured, the database, and the helper code every feature uses. It is written for beginners.

Backend folder: `backend/`. Stack: Express 5, Prisma 5, PostgreSQL, TypeScript.

---

## 1. Startup flow

What happens when you run `npm run dev`:

| Step | File | What happens |
|---|---|---|
| 1 | `package.json` | `dev` runs `ts-node-dev` on `src/index.ts` and loads `.env`. |
| 2 | `src/config/config.ts` | Reads `.env` and checks every variable with Zod. A missing required value stops the server with "Config validation error". |
| 3 | `src/client.ts` | Creates ONE `PrismaClient` (kept on `global` in development so reloads do not open many connections). |
| 4 | `src/index.ts` | Calls `prisma.$connect()`, logs the database name, then calls `permissionService.syncSuperAdmin()` so SUPER_ADMIN always holds every permission in `config/permissions.ts`. |
| 5 | `src/index.ts` | Calls `app.listen(config.port)`. |
| 6 | `src/app.ts` | Builds the Express app (see order below). |

Order of middleware in `src/app.ts`:

1. `helmet()` adds security headers.
2. `/uploads` gets `crossOriginResourcePolicy: cross-origin` so other sites (store, admin panel) can show uploaded pictures.
3. `express.json` and `express.urlencoded` with a 16 MB limit.
4. `express.static('public')` serves the `public/` folder.
5. `cookieParser()`.
6. `xss()` is imported but commented out (`// TODO`), so it is NOT active.
7. `compression()` (gzip).
8. `cors({origin: '*', credentials: true})`. Note: `CORS_ORIGINS` is read by config but the code currently allows any origin.
9. `app.set('trust proxy', config.trustProxy)`.
10. `morgan` request logging (not when `NODE_ENV=test`).
11. `/api/v1` routes (`src/routes/index`), then Swagger at `/api-docs`, then `GET /` welcome message.
12. Error chain: `notFoundHandler`, `errorConverter`, `errorHandler`.

`index.ts` also handles shutdown: `uncaughtException` and `unhandledRejection` log the error and exit; `SIGTERM` closes the server. If the compiled file is `.js`, it first loads `module-alias/register` so `@config/...` style imports work in `dist/`.

Path aliases (`tsconfig.json` and `_moduleAliases` in `package.json`): `@config`, `@utils`, `@middlewares`, `@routes`, `@services`, `@controllers`, `@validations`, `@models`, `@libs`, `@client`.

---

## 2. Environment variables

Copy `backend/.env.example` to `backend/.env` and fill it in. Never commit `.env`. Only names are listed here.

| Variable | Required? | Used for |
|---|---|---|
| `NODE_ENV` | Yes (`development`, `production`, `test`) | Logging level, dev Prisma caching, morgan, rate limiter skip in test. |
| `PORT` | No (default 3000; example uses 3500) | Port the API listens on. |
| `DATABASE_URL` | Yes (read by Prisma) | PostgreSQL connection string. |
| `JWT_SECRET` | Yes | Signs access and refresh tokens. |
| `JWT_ACCESS_EXPIRATION_MINUTES` | Yes | Access token life. |
| `JWT_REFRESH_EXPIRATION_DAYS` | No (default 30) | Refresh token life. |
| `JWT_RESET_PASSWORD_EXPIRATION_MINUTES` | No (default 10) | Reset-password token life. |
| `JWT_VERIFY_EMAIL_EXPIRATION_MINUTES` | No (default 10) | Verify-email token life. |
| `BCRYPT_SALT_ROUNDS` | No (default 12) | Password hashing cost (read in `utils/encryption.ts`). |
| `CORS_ORIGINS` | No | Comma list of allowed origins (parsed into `config.cors.origins`, not enforced yet). |
| `FRONTEND_URL` | No | Admin panel URL used in password-reset emails. |
| `STORE_URL` | No | Customer store URL used in its reset emails. |
| `TRUST_PROXY` | No | Number of proxies in front of the API. Empty means direct clients. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `EMAIL_FROM` | No | Sending email. |
| `SUPERADMIN_EMAIL`, `SUPERADMIN_PHONE`, `SUPERADMIN_PASSWORD`, `SUPERADMIN_NAME` | No | Defaults for `create:superadmin` (CLI flags win). |
| `IS_OFFLINE`, `HOSTED_BACKEND_URL`, `ONLINE_BACKEND_URL` | No | File hosting. Code reads `HOSTED_BACKEND_URL` (default `https://upload.phygitaltech.in/`). |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_API_TOKEN` | No | AI product photos (Cloudflare Workers AI). |
| `CLOUDFLARE_AI_MODEL` | No | Colour preview model (default `@cf/black-forest-labs/flux-2-klein-4b`). |
| `CLOUDFLARE_AI_PRO_MODEL` | No | Professional photo model (default `flux-2-klein-9b`). Read by config, not listed in `.env.example`. |
| `CLOUDFLARE_AI_FOR_COLOURS` | No (`true`/`false`, default `false`) | Also use AI for colour photos. Read by config, not listed in `.env.example`. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | No | Online payments on the store. |
| `ASSET_BASE_URL` | No | Used only by `seed:demo` to build photo URLs (default `http://localhost:<PORT>`). Not in `.env.example`. |
| `SOP_URL`, `CLOUDINARY_*`, `AWS_*` | No | Old leftovers. The example file says the current code does not read them. |

---

## 3. Database overview

- Database: PostgreSQL. ORM: Prisma. Schema file: `backend/prisma/schema.prisma` (1842 lines, 62 models and 23 enums, grouped into 9 business areas below).
- Ids are UUID strings. Money is `Float`. Most tables have `createdAt` and `updatedAt`.
- "Soft delete": many tables have `deletedAt`. A row with `deletedAt` set is treated as deleted but stays in the database.
- Multi-tenant shape: `Company` (a business) has many `Branch` (a location), each Branch has many `Shop` (a counter). Almost every business table stores `companyId`, `branchId` and/or `shopId`, so data can be filtered per level.

```
Company
 +-- Branch
      +-- Shop
           +-- Users (shop admin, employees)
           +-- Products, bills, cash, expenses, customers ...
```

Useful commands (from `backend/`):

| Command | Meaning |
|---|---|
| `npx prisma generate` | Build the Prisma client from the schema. |
| `npm run prisma:migrate:dev` | Create and apply a new migration after you edit the schema. |
| `npm run prisma:migrate:deploy` | Apply committed migrations (use on servers). |
| `npm run prisma:studio` | Open a browser table viewer. |
| `npm run prisma:reset` | Drop everything and re-run migrations (destroys data). |

### 3.1 Enums

| Enum | Values | Meaning |
|---|---|---|
| `Role` | SUPER_ADMIN, ADMIN, SUB_ADMIN, SHOP_ADMIN, EMPLOYEE, USER | Platform owner, company admin, branch admin, shop admin, shop staff, store customer. |
| `AccountStatus` | PENDING_INVITATION, ACTIVE, INACTIVE, BLOCKED | Login state of a user. |
| `accessType` | ONLINE, OFFLINE | Admin plan type (lowercase name in the schema). |
| `CompanyStatus` | ACTIVE, INACTIVE, SUSPENDED | |
| `BranchStatus`, `ShopStatus` | ACTIVE, INACTIVE | |
| `AuditResult` | SUCCESS, FAILURE | Result of a logged action. |
| `ProductStatus` | DRAFT, PENDING_REVIEW, PUBLISHED, UNPUBLISHED, ARCHIVED | Product life cycle. |
| `GenderTarget` | MEN, WOMEN, UNISEX, BOYS, GIRLS, KIDS | Who the product is for. |
| `PreviewStatus` | PENDING, READY, FAILED | AI colour preview progress. |
| `MovementType` | PURCHASE_IN, SALE_OUT, ADJUSTMENT_INCREASE, ADJUSTMENT_DECREASE, RETURN_RESTOCK, DAMAGE_WRITE_OFF, TRANSFER_OUT, TRANSFER_IN, PURCHASE_REVERSAL, SALE_REVERSAL | Kind of stock change. |
| `StockSourceType` | PURCHASE_BILL, SALES_BILL, ORDER, RETURN, ADJUSTMENT, TRANSFER | What caused the stock change. |
| `BillStatus` | DRAFT, CONFIRMED, CANCELLED | Purchase and sales bills. Stock moves only when CONFIRMED. |
| `BillPaymentStatus` | PAID, PART_CREDIT, CREDIT | How much of a bill is paid. |
| `OrderStatus` | PENDING, CONFIRMED, PROCESSING, PACKED, READY_FOR_DISPATCH, DISPATCHED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, RETURNED | Online order steps. |
| `PaymentStatus` | PENDING, PAID, FAILED, REFUNDED | Online order payment. |
| `ReturnStatus` | REQUESTED, IN_REVIEW, APPROVED, REJECTED, RECEIVED, COMPLETED | Online return steps. |
| `RefundStatus` | NONE, PENDING, APPROVED, PROCESSED, REJECTED | Refund steps. |
| `OfferType` | PERCENTAGE, FLAT | Offers and coupons. |
| `OfferApplicableOn` | ALL_PRODUCTS, SELECTED_CATEGORIES, SELECTED_SUBCATEGORIES, SELECTED_PRODUCTS | Offer scope. |
| `ReturnSettlement` | REFUND, EXCHANGE, STORE_CREDIT, ADJUST_DUE | How a credit note is settled. ADJUST_DUE reduces what the customer still owes. |
| `CreditNoteStatus` | PENDING_APPROVAL, APPROVED, REJECTED | |
| `ReturnStockTo` | RESTOCK, DAMAGED | Where returned units go. |

Many status-like fields are plain `String` instead of enums (for example `StockTransfer.status`, `Attendance.status`, `CashEntry.type`, `Expense.mode`). Their allowed values are in comments in the schema and are checked in the services.

### 3.2 Models by domain

Notation: "FK" means foreign key (a link to another table).

#### A. Organisation: company, branch, shop

| Model | Purpose | Key fields | Relations |
|---|---|---|---|
| `Company` | A business that uses the platform. | `name`, `code` (unique), `email`, `contactNumber`, address fields, `adminName/adminEmail/adminPhone`, `status`, `logo`, `deletedAt` | Has many branches, shops, users, categories, brands, products, orders, offers, coupons, bills, customers. |
| `Branch` | A location of a company. | `code` (unique), `name`, `companyId`, address, `openingTime/closingTime`, `weeklyHolidays[]`, `status` | FK to Company. Has users, shops, inventory, orders, stock movements, offers, coupons, bills, customers. |
| `Shop` | A counter or outlet inside a branch. Employees work here. | `code` (unique), `name`, `shopType` (Men's wear...), `companyId`, `branchId`, `gstin`, `billPrefix` (bill series like `WW/26-27/00001`), `status` | FK to Company and Branch. Has users, products, bills, credit notes, counter sessions, cash entries, attendance, staff requests, transfers, expenses, customers. |

#### B. Users, roles, permissions

| Model | Purpose | Key fields | Relations |
|---|---|---|---|
| `User` | Every login: platform admins, company/branch/shop staff and store customers. | `fullname`, `phoneNumber` (unique), `email`, `password` (hashed), `role`, `status`, `companyId/branchId/shopId`, `permissions[]` (extra rights for employees), `shift`, `employeeCode` (unique), `mustChangePassword`, `sessionsRevokedAt`, `posPin`, `photoUrl`, customer profile (`gender`, `dateOfBirth`), block info (`blockedAt`, `blockedReason`), `deletedAt` | Optional FK to Company, Branch, Shop. One optional Admin. Has orders, cart, wishlist, addresses, reviews, notifications, bills it created, etc. |
| `Admin` | Extra business profile for an ADMIN user (plan, licence key, branding). | `userId` (unique), `accessType`, `amount`, `renewalAmount`, `startDate`, `expiryDate`, `key`, `isUsedKey`, `shopName`, `logo`, `BrandColour`, contact person | One-to-one with User. |
| `RolePermission` | Which permissions each role has. | composite id `(role, permission)` | None. Loaded by `verifyJWT`. |

Permission strings live in `src/config/permissions.ts` (see section 5).

#### C. Catalog and products

| Model | Purpose | Key fields | Relations |
|---|---|---|---|
| `Category` | Top product group; can nest. | `name`, `code` (unique), `parentId`, `displayOrder`, `isActive`, `companyId?` | Self relation (parent/children). Has products, subcategories, offers. |
| `Subcategory` | Group under a category. | `name`, `code` (unique), `categoryId`, `companyId?` (null = platform-wide) | FK Category (cascade delete). |
| `Brand` | Product brand. | `name`, `code` (unique), `logo`, `companyId?` | Has products. |
| `Color` | Colour master. | `name`, `code` (unique), `hexCode`, `companyId?` | Used by ProductColor and previews. |
| `Size` | Size master. | `name`, `code` (unique), `displayOrder`, `companyId?` | Used by ProductSize. |
| `Product` | A garment. Company catalog product (`shopId` null) or shop product. | `name`, `sku` (unique), `slug` (unique), `status`, `gender`, `mrp`, `sellingPrice`, `taxRate` (default 5), `stockQuantity`, clothing attributes (`fabric`, `fit`, `pattern`, `sleeveType`, `neckType`, `occasion`, `season`), return rules (`returnEligible`, `returnPeriodDays`), SEO fields, `deletedAt` | FK Company, Category, optional Brand, Shop, Subcategory, creator User. Has images, variants, sizes, colours, previews, reviews, offers. |
| `ProductSize` | Link product to size. | composite id `(productId, sizeId)` | Cascade on product. |
| `ProductColor` | Link product to colour. | composite id `(productId, colorId)` | Cascade on product. |
| `ProductImage` | Photo of a product. | `url`, `order`, `isMain`, `isAiGenerated`, `cleanedFromId`, `aiStyle` (GHOST, MANNEQUIN, MODEL) | FK Product (cascade). |
| `ProductColorPreview` | AI colour preview of one image; the original is never changed. | `productId`, `colorId`, `sourceImageId`, `url`, `status`, `error`, `model`; unique on product + colour + source image | FK Product, Color, ProductImage. |
| `ProductVariant` | One sellable item: a size and colour of a product. This is what stock, bills and carts point to. | `variantSku` (unique), `size`, `color`, `colorHex`, `image`, `mrp`, `sellingPrice`, `isActive` | FK Product (cascade). |
| `ProductReview` | Customer review. | `rating`, `title`, `comment`, `fit` (SMALL/TRUE/LARGE), `images[]` | FK Product, User. |

#### D. Inventory and stock

| Model | Purpose | Key fields | Relations |
|---|---|---|---|
| `Inventory` | Stock count of a variant in a branch. | `physicalQty`, `reservedQty`, `damagedQty`, `threshold` (low-stock level, default 5); unique `(branchId, variantId)` | FK Branch, ProductVariant. |
| `StockMovement` | Ledger line for every stock change. | `type`, `quantity`, `prevPhysical`, `newPhysical`, `reason`, `reference`, `sourceType`, `sourceId`, `performedById` | FK Branch, ProductVariant. |
| `StockAdjustment` | Manual correction. | `adjustmentNumber`, `type` (INCREASE, DECREASE, MARK_DAMAGED, WRITE_OFF), `quantity`, before/after counts, `reason`, `approvalStatus` (AUTO, APPROVED, PENDING, REJECTED), `photoUrl` | FK creator User. |
| `StockTransfer` | Move stock between two shops of one branch: REQUESTED, APPROVED, DISPATCHED, RECEIVED or SHORT. | `transferNumber` (unique per branch), `fromShopId?`, `toShopId`, `status`, `reason`, who/when for each step | FK Shop (from, to). |
| `StockTransferItem` | A line of a transfer. | `productName`, `variantSku`, `size`, `color`, `requestedQty`, `approvedQty`, `dispatchedQty`, `receivedQty`, `destVariantId?`, `sourceVariantId?` | FK StockTransfer (cascade). |
| `PhysicalStockAudit` | A stock count with its differences. | `auditNumber`, `totalItemsCounted`, `discrepanciesCount`, `auditItems` (JSON) | None (ids only). |
| `BarcodePrintJob` | A batch of printed barcode labels. | `jobId` (unique), `sourceType`, `labelSize`, `show*` flags, `totalLabels`, `itemsSummary` (JSON) | None (ids only). |

#### E. Billing and sales (shop POS)

| Model | Purpose | Key fields | Relations |
|---|---|---|---|
| `PurchaseBill` | Stock bought from a supplier (stock in). | `billNumber` (unique per shop), `supplierName`, `status`, `subtotal`, `taxAmount`, `discount`, `totalAmount`, `amountPaid`, `balanceDue`, `paymentStatus`, `version` (optimistic lock so stock is not posted twice), `deletedAt` | FK Company, Branch, Shop, creator User. Has items, payments, returns. |
| `PurchaseBillItem` | Line of a purchase bill. | `quantity`, `unitCost`, `taxRate`, `totalCost` | FK bill (cascade), Product, Variant. |
| `PurchaseBillPayment` | Money paid to the supplier. | `mode`, `amount`, `paidAt`, `atBilling` (true = at save, false = later) | FK bill (cascade). |
| `SalesBill` | A counter sale (stock out). | `billNumber` (unique per shop), `customerName/Phone`, `paymentMethod`, `subtotal`, `discount`, `taxAmount`, `roundOff`, `totalAmount`, `paidAmount`, `amountPaid`, `creditAmount`, `balanceDue`, `paymentStatus`, `pricesIncludeTax`, `editCount`, `version`, `status` | FK Company, Branch, Shop, creator User. Has items, payments, credit notes, returns. |
| `SalesBillItem` | Line of a sales bill (copies product name, sku, size, colour). | `quantity`, `unitPrice`, `discount`, `taxRate`, `totalPrice` | FK bill (cascade), Product, Variant. |
| `SalesBillPayment` | Money received on a sales bill. | `mode`, `amount`, `atBilling`, `receivedById` | FK bill (cascade). |
| `SalesReturn`, `SalesReturnItem` | Older sales-return records. Migration `20261105200000` says credit notes are now the only sales-return system. | `returnNumber`, `refundMode`, `totalAmount` | FK Shop, SalesBill. |
| `CreditNote` | Return against a confirmed sales bill. Cash refunds and big refunds wait for branch admin approval. | `noteNumber` (unique per shop), `settlement`, `refundMode`, `reason`, `taxableAmount`, `taxAmount`, `totalAmount`, `status`, `needsApproval`, `stockTo`, `decidedById` | FK Company, Branch, Shop, SalesBill, users. |
| `CreditNoteItem` | Line of a credit note. | `quantity`, `unitPrice`, `taxRate`, amounts | FK CreditNote (cascade), SalesBillItem, Product, Variant. |
| `PurchaseReturn`, `PurchaseReturnItem` | Goods sent back to a supplier. | `returnNumber`, `status` (DRAFT...), `takeStockFrom`, `settleAs`, `payableBefore/After`, line `boughtQty`, `inStockQty`, `returnQty` | FK Shop, optional PurchaseBill. |

#### F. Credit and ledger (customers and suppliers)

| Model | Purpose | Key fields | Relations |
|---|---|---|---|
| `ShopCustomer` | A customer of one shop (walk-in or credit, "udhaar"). Different from `User`. | `name`, `mobile` (unique per shop), `customerType`, `gstin`, `creditLimit`, `creditDays`, `openingDue`, `totalBought`, `balanceDue`, `isActive` | FK Company, Branch, Shop. |
| `CustomerCreditPayment` | Payment collected from a credit customer. | `receiptNumber`, `amount`, `mode` (CASH, UPI, CARD, NETBANKING, CHEQUE), `paidAt` | FK ShopCustomer (cascade), Shop. |
| `Supplier` | Supplier of a branch. | `name` (unique per branch), `gstin`, `paymentTerms`, `openingBalance`, `payable`, `isOverdue` | Has payments. |
| `SupplierPayment` | Payment to a supplier. | `receiptNumber` (unique per branch), `amount`, `paymentMode`, `utrChequeNo`, `tdsDeducted` | FK Supplier (cascade). |

#### G. Online orders and storefront

| Model | Purpose | Key fields | Relations |
|---|---|---|---|
| `Order` | A customer order from the store. | `orderNumber` (unique), `customerId`, `companyId`, `branchId`, `shopId?`, `status`, `paymentStatus`, `paymentMethod` (default COD), `subtotal`, `discount`, `couponDiscount`, `tax`, `shippingFee`, `totalAmount`, `shippingAddress` (JSON), `courierName`, `trackingNumber`, cancel request fields, `paymentDetails` (JSON), `couponCode` | FK User, Company, Branch, optional Shop. Has items, tasks, returns, status history, coupon usages. |
| `OrderItem` | Line of an order (copies name, sku, size, colour, image). | `quantity`, `unitPrice`, `totalPrice` | FK Order (cascade), Product, Variant. |
| `OrderStatusHistory` | Tracking trail of status changes. | `status`, `comment`, `updatedById` | FK Order (cascade). |
| `OrderTask` | A job for staff on an order (pick and pack, QC). | `task`, `assignedToId`, `isCompleted` | FK Order, User. |
| `ReturnRequest` | Customer return or exchange request. | `reason`, `returnStatus`, `refundAmount`, `refundStatus`, `resolution` (REFUND or EXCHANGE), `exchangeFor`, `images[]`, `returnItems` (JSON) | FK Order, User, Company, optional Shop. |
| `CustomerAddress` | Saved delivery address. | `recipient`, `phone`, `address1`, `city`, `state`, `postalCode`, `label` (HOME/WORK/OTHER), `isDefault` | FK User (cascade). |
| `Cart`, `CartItem` | The customer's bag. One cart per user. | `quantity`, `variantId` | Cart FK User (cascade). |
| `WishlistItem` | Saved-for-later product. | unique `(userId, productId)` | FK User, Product (cascade). |
| `Offer` | Discount campaign. | `type`, `discountValue`, `applicableOn`, `minOrderValue`, `maxDiscountLimit`, `startDate`, `endDate`, `priority` | Scope by company/branch/shop. Many-to-many with Category, Subcategory, Product. |
| `Coupon` | Code a customer types. | `code` (unique), `type`, `discountValue`, `minPurchaseAmount`, `usageLimit`, `perCustomerLimit`, `usedCount`, dates | Scope by company/branch/shop. Has usages. |
| `CouponUsage` | Record of a coupon being used. | `discountAmount`, `usedAt` | FK Coupon (cascade), User, Order. |
| `Notification` | Message to a customer (ORDER, PAYMENT, RETURN, OFFER, ACCOUNT). | `title`, `body`, `link`, `readAt` | FK User (cascade). |
| `SupportRequest` | "Contact us" message from the store help page. | `name`, `email`, `topic`, `message`, `status` (OPEN/CLOSED) | Optional FK User. |

#### H. Expenses and cash

| Model | Purpose | Key fields | Relations |
|---|---|---|---|
| `Expense` | Running cost. Cash expenses reduce the drawer. | `expenseNumber` (like `EX/26-27/0001`, unique per shop), `shopId?` (null = branch-level), `category`, `head`, `amount`, `mode`, `gstAmount`, `photoUrl` | FK optional Shop, creator User. |
| `CounterSession` | A counter day: opening cash until closed. | `openingCash`, `closingCash`, `denominations` (JSON), `expectedCash`, `difference`, `reviewStatus`, `depositAmount`, `keptFloat` | FK Shop. Has cash entries. |
| `CashEntry` | Manual cash in, out or bank deposit at the counter. | `type` (IN, OUT, BANK_DEPOSIT), `amount`, `particulars`, `bankName` | FK Shop, optional CounterSession. |
| `BankDeposit` | Branch admin's bank deposit of the day. | `depositDate`, `amount`, `bank`, `slipUrl` | None (ids only). |
| `Attendance` | A staff member's day. | `date`, `status` (IN, OUT, LEAVE, ABSENT), `inAt`, `outAt`; unique `(userId, date)` | FK User, Shop. |
| `StaffRequest` | A shop asks the branch admin for a new staff member. | `requestNumber` (unique), `fullname`, `employeeRole`, `shift`, `permissions[]`, `status` (PENDING, APPROVED, REJECTED) | FK Shop. |

#### I. Audit

| Model | Purpose | Key fields |
|---|---|---|
| `AuditLog` | Append-only record of important actions. | `actorId`, `actorName`, `actorRole`, `action`, `module`, `targetId`, `companyId`, `result`, `reason`, `before` (JSON), `after` (JSON), `ip`, `userAgent`. No relations; indexed by module + time, actor, company, target. |

Note: some models (`StockMovement.performedById`, `BankDeposit`, `Supplier`, `PhysicalStockAudit`, `StaffRequest`...) store ids as plain strings with no FK. The database does not enforce those links, the services do.

---

## 4. Migration timeline

Folder: `backend/prisma/migrations/`. Names start with a timestamp, so the order of the list is the order they run. `migration_lock.toml` says the provider is `postgresql`.

| # | Migration | What it added or changed |
|---|---|---|
| 1 | `20260826051511_` | First migration: `User`, `Admin` tables; `Role` (ADMIN, SUPERADMIN) and `accessType` enums. |
| 2 | `20261031090000_add_company` | `Company` table and `CompanyStatus`. |
| 3 | `20261031120000_permissions_audit_log` | `RolePermission`, `AuditLog`, `AuditResult`. |
| 4 | `20261031150000_company_district_area` | Added `district` and `area` to Company. |
| 5 | `20261031160000_drop_company_area` | Removed `area` again. |
| 6 | `20261031170000_company_admin_login` | Role `COMPANY_ADMIN`; `User.companyId` FK. |
| 7 | `20261031180000_roles_account_status` | `AccountStatus`; roles BRANCH_SUB_ADMIN, EMPLOYEE, CUSTOMER; company SUSPENDED; new User account columns. |
| 8 | `20261031190000_branches_employees` | `Branch` table and `BranchStatus`; renamed role to BRANCH_ADMIN; User gets `branchId` and employee fields. |
| 9 | `20261031195000_catalog_orders_roles` | Big one. Role enum rebuilt as SUPER_ADMIN, ADMIN, SUB_ADMIN, EMPLOYEE, USER. Added catalog (`Category`, `Brand`, `Product`, `ProductImage`, `ProductVariant`), stock (`Inventory`, `StockMovement`, `StockAdjustment`), orders (`Order`, `OrderItem`, `OrderTask`, `ReturnRequest`, `CustomerAddress`, `Cart`, `CartItem`, `ProductReview`) and their enums. |
| 10 | `20261031200000_shops` | `Shop` table, `ShopStatus`, `User.shopId`. |
| 11 | `20261031210000_shop_admin_role` | Role `SHOP_ADMIN`. |
| 12 | `20261102090000_shop_masters` | `Subcategory`, `Color`, `Size`; `User.employeeRole`. |
| 13 | `20261102100000_shop_products` | `Product.shopId`/`subcategoryId`; `ProductSize`, `ProductColor`, `ProductColorPreview`; `PreviewStatus`. |
| 14 | `20261102200000_offers_coupons_order_tracking` | Baseline for changes first made with `db push`: `Offer`, `Coupon`, `CouponUsage`, `OrderStatusHistory`, OrderStatus SHIPPED and more, order cancel and tracking fields, offer link tables. Existing databases mark it applied with `prisma migrate resolve`. |
| 15 | `20261103090000_bills_inventory_ledger` | `PurchaseBill`, `PurchaseBillItem`, `SalesBill`, `SalesBillItem`, `BillStatus`, `StockSourceType`; MovementType PURCHASE_REVERSAL and SALE_REVERSAL; `StockMovement.sourceType/sourceId`. |
| 16 | `20261104053812_shop_dashboard` | `BillPaymentStatus`; payment columns on bills; `Shop.billPrefix`; `SalesBillPayment`, `PurchaseBillPayment`, `SalesReturn`(+items), `CounterSession`, `Expense`. |
| 17 | `20261104054000_bill_payment_at_billing` | `atBilling` flag on both payment tables. |
| 18 | `20261104090000_sales_credit_edits` | `SalesBill.paidAmount`, credit amount, edit tracking; existing bills set as fully paid. |
| 19 | `20261104092000_shop_customer` | `ShopCustomer`. |
| 20 | `20261104120000_credit_notes` | `CreditNote`, `CreditNoteItem`, `ReturnSettlement`, `CreditNoteStatus`, `ReturnStockTo`. |
| 21 | `20261104150000_shop_type` | `Shop.shopType`. |
| 22 | `20261105120000_purchase_return_and_credit_payment` | `ShopCustomer.creditDays`; `CustomerCreditPayment`, `PurchaseReturn`, `PurchaseReturnItem`. |
| 23 | `20261105130000_supplier_and_payments` | `Supplier`, `SupplierPayment`. |
| 24 | `20261105140000_barcode_print_jobs` | `BarcodePrintJob`. |
| 25 | `20261105150000_stock_and_audit` | `Inventory.damagedQty`; `PhysicalStockAudit`. |
| 26 | `20261105160000_stock_adjustment_details` | More `StockAdjustment` columns (number, reference, photo, approval, before/after counts). |
| 27 | `20261105170000_staff_cash_transfer` | StockSourceType TRANSFER; `User.shift`; `CashEntry`, `Attendance`, `StaffRequest`, `StockTransfer`, `StockTransferItem`; counter-close columns. |
| 28 | `20261105170100_branch_bank_deposit` | `BankDeposit`. |
| 29 | `20261105170200_transfer_item_optional_dest` | `StockTransferItem.destVariantId` becomes optional. |
| 30 | `20261105171000_expense_details_and_user_profile` | Expense number, head, description, paidBy, GST, photo; `User.posPin`, `User.photoUrl`. |
| 31 | `20261105180000_fix_customer_credit_payment_columns` | Fixed credit-payment column names to match the schema; backfilled company and branch. |
| 32 | `20261105190000_company_masters` | `companyId` on Subcategory, Color, Size, with backfill (null = platform-wide). |
| 33 | `20261105200000_credit_note_adjust_due` | `ReturnSettlement` gets ADJUST_DUE. |
| 34 | `20261105210000_branch_admin_real_data` | `Expense.shopId` optional (branch expenses); `Product.priceChangedAt`. |
| 35 | `20261105220000_drop_sample_tables` | Dropped 10 old runtime sample tables (`BranchExpense`, `BranchPurchaseBill`, `CustomerCreditProfile`, etc.). |
| 36 | `20261106090000_storefront_wishlist` | `WishlistItem`; `CustomerAddress.label`. |
| 37 | `20261106120000_storefront_account` | User gender and birth date; review fit and photos; return resolution, exchange, photos; `Notification`; `SupportRequest`. |
| 38 | `20261106150000_backfill_sales_bill_payments` | Data fix: added missing counter payment rows for old sales bills. |
| 39 | `20261106160000_backfill_order_tax` | Data fix: worked out GST included in old online orders. |
| 40 | `20261107090000_sales_bill_tax_inclusive` | `SalesBill.pricesIncludeTax` and `roundOff` (new bills use the tag price with GST included). |
| 41 | `20261107120000_expense_number_per_shop` | Expense number unique per shop, not globally. |
| 42 | `20261107140000_order_item_colour_photo` | Data fix: order lines point to the colour photo. |
| 43 | `20261107150000_product_image_cleaned_from` | `ProductImage.cleanedFromId`. |
| 44 | `20261107170000_product_image_ai_style` | `ProductImage.aiStyle`. |

Tip: never edit an old migration. Change `schema.prisma`, then run `npm run prisma:migrate:dev`.

---

## 5. Permissions (`src/config/permissions.ts`)

| Export | What it is |
|---|---|
| `PERMISSIONS` | Strings for the Super Admin panel, like `companies.view`, `companies.edit`, `audit.view`. SUPER_ADMIN gets all of them on every server start. |
| `SHOP_MODULES` | The 10 shop modules: dashboard, billing, orders, customers, purchase, products, stock, accounts, reports, masters. |
| `MODULE_PERMISSIONS` | `<module>.view` and `<module>.edit` for each module. |
| `EMPLOYEE_PERMISSIONS` | Rights an admin can give an employee (stored in `User.permissions`), for example `pos.bill`, `sales.discount`, `cash.manage`, `billing.edit`. |
| `STAFF_RIGHTS` | The six columns of the "Staff & rights" page (billing, customers, purchase, products, stock, cash book), each as `<module>.edit`. |
| Types | `Permission`, `ShopModule`, `EmployeePermission`. |

Example: a route is guarded with `checkPermission('companies.edit')`. The user's permissions come from `RolePermission` (by role) and, for EMPLOYEE, also from `User.permissions`.

---

## 6. Middlewares (`src/middlewares/`)

| File | Exports | Behaviour |
|---|---|---|
| `auth.middleware.ts` | `verifyJWT`, `checkRole`, `checkPermission`, `checkAdmin`, `checkSuperAdmin`, `checkCompanyAdmin`, `checkBranchAdmin`, `checkShopAdmin` | `verifyJWT` reads the token from the `accessToken` cookie or `Authorization: Bearer ...`, verifies it, loads the user, rejects deleted users, rejects tokens issued before `sessionsRevokedAt`, checks the account may sign in (blocked, inactive, suspended company), then sets `req.user` with the role's permissions (employees also get their own). `checkRole(role or roles)` returns 403 if the role does not match. `checkPermission(...perms)` returns 403 if any permission is missing. The `check*` shortcuts: Admin and CompanyAdmin = `ADMIN`, SuperAdmin = `SUPER_ADMIN`, BranchAdmin = `SUB_ADMIN`, ShopAdmin = `SHOP_ADMIN`. |
| `employeeAccess.ts` | `employeeModuleGuard`, `moduleAccess` | For the `/employee` shop API. Maps the first path segment (for example `sales-bills`) to a module (`billing`). Reading needs `<module>.view` or `.edit`; changing needs `.edit`. A path not in the rules list (employees, staff rights, promotions) returns 403. `moduleAccess(permissions)` returns `{module: 'view' or 'edit'}` for the UI. |
| `rateLimiter.ts` | `authLimiter`, `loginLimiter`, `loginIpLimiter` | `authLimiter`: 20 requests per IP per 15 minutes (every request counts) on sign-up, password reset, support and password change. `loginLimiter`: 10 failed logins per IP and account per 15 minutes. `loginIpLimiter`: 50 login attempts of any outcome per IP per 15 minutes. All skipped when `NODE_ENV=test`. Return 429. |
| `xss.ts` | default `xss()` factory, `clean` | Cleans `body`, `query`, `params` with `xss-filters`. Currently NOT used in `app.ts` (commented out as TODO). |
| `validate.ts` | default `validate(schema)` | Runs a Zod schema on `{body, params, query, cookies}`. On failure replies 400 `{error: 'Invalid data', details: [...]}`. |
| `multer.middleware.ts` | `upload`, `imageUpload`, `customerPhotoUpload` | File upload. All save to `public/temp` (created if missing) with random file names, so a client name like `../../x.js` cannot escape. `upload`: many types (images, pdf, office files, csv, audio, video), 32 MB. `imageUpload`: JPG, PNG, WEBP, SVG, 2 MB (logos). `customerPhotoUpload`: JPG, PNG, WEBP only, 5 MB, 1 file (reviews and returns). |
| `error.middleware.ts` | `notFoundHandler`, `errorConverter`, `errorHandler` | 404 for unknown routes. `errorConverter` turns ZodError into 400 "Validation failed" with a list of fields, Prisma errors into `PrismaError`, any other error into a 500 `ApiError`. `errorHandler` logs only 5xx stacks and sends the `ApiResponse` JSON. |
| `index.ts` | re-exports the above | Exports error, rate limiter, auth, `validate`, `xss`, multer. `employeeModuleGuard` is not re-exported here (import it from `employeeAccess`). |

Standard error response shape:

```json
{"statusCode": 400, "status": false, "message": "Validation failed",
 "data": null, "errors": [{"field": "phone", "message": "Required"}]}
```

---

## 7. Utilities (`src/utils/`)

| File | Key exports | What it does |
|---|---|---|
| `ApiError.ts` | `ApiError` | Error with `statusCode`, `message`, `errors`. Example: `throw new ApiError(404, 'Not found')`. |
| `ApiResponse.ts` | `ApiResponse` | Standard success body: `statusCode`, `status` (true under 300), `message`, `data`, `errors`. |
| `PrismaError.ts` | `PrismaError` | Maps Prisma codes to friendly messages and HTTP status (for example P2002 duplicate gives 409, P2025 not found). |
| `catchAsync.ts` | `catchAsync` | Wraps an async handler so thrown errors go to `next()`. |
| `encryption.ts` | `encryptPassword`, `isPasswordMatch` | bcrypt hash and compare (`BCRYPT_SALT_ROUNDS`, default 12). |
| `exclude.ts` | `exclude` | Copy of an object without some keys (for example hide `password`). |
| `pick.ts` | `pick` | Copy of an object with only some keys. |
| `list.ts` | `listQuerySchema`, `searchWhere`, `listArgs`, `toListResult`, `ListQuery` | List helper. Every list endpoint takes `?page&limit&search&sortBy&sortDir` (limit max 100) and returns `{items, pagination: {page, limit, total, totalPages}}`. |
| `day.ts` | `dayKey`, `dayRange`, `dateOnly`, `round2` | Calendar-day helpers (`YYYY-MM-DD`, start and end of a day, a value for `@db.Date` columns, round to 2 decimals). |
| `fileStore.ts` | `storeUpload`, `storeGenerated`, `readStoredImage` | Keep files. Tries the hosted file server first; if it fails, saves to `public/uploads/<folder>` and returns a local URL. `readStoredImage` loads image bytes (local file or download). |
| `s3upload.ts` | `uploadFileToHostedServer`, `uploadBase64ToHostedServer` | POST a file or base64 image to `HOSTED_BACKEND_URL/upload`. Returns `{link, key}`. (Name says S3 but it uses the hosted server.) |
| `s3constants.ts` | `BUCKET_NAME`, `APP_BANNER`, `FRAME`, `MEDIA`, `ASSETS` | Old bucket names (legacy). |
| `constants.ts` | `FOLDER`, `PROJECT_NAME` | Small constants. |
| `recolour.ts` | `loadPhoto`, `segmentGarment`, `recolourGarment`, `compositeGarment`, `checkRecolour`, `toJpeg`, `studioPhoto`, `garmentColour` | Photo tools for AI-free colour previews and clean white-background photos, built on `sharp`. Cuts out the garment with the segmentation worker, changes only the garment colour, and checks the result before saving. |
| `index.ts` | `ApiError`, `PrismaError`, `catchAsync`, `encryptPassword`, `isPasswordMatch`, `exclude`, `pick`, `ApiResponse` | Re-exports only these. Import `list`, `day`, `fileStore`, `recolour` directly. |

---

## 8. Types (`src/types/`)

| File | What it does |
|---|---|
| `express.d.ts` | Adds `req.user` to Express: `id`, `fullname`, `role`, `phoneNumber`, `companyId`, `branchId`, `shopId`, `permissions[]` (set by `verifyJWT`), plus multer `file` and `files`. |
| `response.d.ts` | Types `TokenResponse`, `AuthTokensResponse`, `UserProfile`. |

---

## 9. Config files (`src/config/`)

| File | What it does | Key exports |
|---|---|---|
| `config.ts` | Validates env with Zod, builds the config object: `env`, `port`, `jwt`, `email`, `frontendUrl`, `storeUrl`, `trustProxy`, `ai`, `razorpay`, `cors`. | default config |
| `index.ts` | Barrel file. | `config`, `logger`, `morgan`, `swaggerRouter` |
| `logger.ts` | Winston logger; debug level in development, info otherwise; colours only in development; prints `DD-MM HH:mm level: message`. | default `logger` |
| `morgan.ts` | HTTP request log. Success below 400 goes to `logger.info`, errors to `logger.error` (with the error message). Shows the IP in production. | `successHandler`, `errorHandler` |
| `permissions.ts` | Permission catalog (section 5). | `PERMISSIONS`, `SHOP_MODULES`, `MODULE_PERMISSIONS`, `EMPLOYEE_PERMISSIONS`, `STAFF_RIGHTS` |
| `swagger.ts` | Swagger UI at `/api-docs`, reading comments from `src/routes/*.ts`. | default `swaggerRouter` |

---

## 10. CLI commands (`src/cli/`)

Run from `backend/`. They need a working `.env` and a migrated database.

### Create the super admin

```bash
npm run create:superadmin -- --phone 9876543210 --password "Str0ngPass" --name "Platform Owner" --email owner@example.com
```

| Flag | Meaning |
|---|---|
| `--phone` | Required. 10-digit Indian mobile (starts with 6 to 9). |
| `--password` | Required. Stored hashed. |
| `--name` | Optional. Default "Super Admin". |
| `--email` | Optional. Without it the super admin signs in by phone. |
| `--force` | Allow a second super admin, or converting another account. |

Each flag can come from `SUPERADMIN_PHONE`, `SUPERADMIN_PASSWORD`, `SUPERADMIN_NAME`, `SUPERADMIN_EMAIL`. Flags win. Running again with the same phone resets that password. It refuses to create a second super admin without `--force`. After saving, it runs `syncSuperAdmin()` to grant all permissions. Public sign-up can never create a SUPER_ADMIN, so this is the only way.

### Seed the starting accounts (super admin, company admin, branches)

```bash
cp seed.example.json seed.json   # fill in real names, phones and passwords
npm run seed:org                 # reads seed.json
npm run seed:org -- --file prod.json
```

- `seed.json` has three optional sections: `superAdmin` (same fields as the flags above), `company` (the Company form fields plus `adminName`, `adminEmail`, `adminPhone`, `adminPassword`), and `branches` (a list of Branch form fields; the `admin*` fields are optional and create a SUB_ADMIN login).
- Uses `createSuperAdmin()`, `companyService.createCompany` and `branchService.create`, with the same validation as the screens.
- Safe to run again: the super admin password is reset, a company with the same email is reused, and branches with an existing name are skipped.
- `seed.json` is git-ignored because it holds passwords.

### Seed demo data

```bash
npm run seed:demo               # create the demo company (skips if it exists)
npm run seed:demo -- --replace  # archive the old demo, then create a fresh one
npm run seed:demo -- --remove   # switch the demo off
```

- Goes through the real services, like the screens do: masters, products with photos, purchase bills (stock in), counter sales, customers, online orders moved through the order flow, returns, exchanges, reviews, coupons, notifications. Dates are spread over recent weeks.
- Demo company email is `demo.company@clothpro.in`. Demo customers use phones `9800000200` to `9800000203`. Every demo login uses the password `Demo@1234` (a demo-only password written in the file).
- Photos come from `public/uploads/products/demo` and are served by the API (set `ASSET_BASE_URL` if the API is not on `localhost:<PORT>`).
- `--replace` and `--remove` never delete rows: they switch the company off, unpublish products, block logins and rename them.

| File | What it does | Key exports |
|---|---|---|
| `src/cli/createSuperAdmin.ts` | Creates or resets the super admin. | `createSuperAdmin`, `SuperAdminInput` (runs the CLI only when started directly) |
| `src/cli/seedOrg.ts` | Seeds the super admin, a company with its admin, and branches from `seed.json`. | none (runs `main()`) |
| `src/cli/seedDemo.ts` | Builds the demo company, 596 lines. | none (runs `main()`) |

---

## 11. Scripts and the worker

### `backend/scripts/`

One-off helper files. They are not run by `npm` scripts.

| File | What it does |
|---|---|
| `migrateRoles.js` | Old data migration. Adds enum values SUPER_ADMIN, SUB_ADMIN, USER. Renames roles in existing users: SUPERADMIN to SUPER_ADMIN, COMPANY_ADMIN to ADMIN, BRANCH_ADMIN to SUB_ADMIN, CUSTOMER to USER. Deletes old-role rows in `RolePermission`. Run with `node scripts/migrateRoles.js`. |
| `replaceRoles.js` | Text replace of old role names in a fixed list of source files (paths written as `backend/src/...`, so run it from the repo root). |
| `updateAuthContext.cjs` | Updates the role names in `frontend/src/context/AuthContextProvider.tsx` (run from the repo root). |

These came from the one-time role rename. The current role names are the ones in the `Role` enum above.

### `backend/workers/segment.cjs`

- A separate Node process that cuts the garment out of a photo using `@imgly/background-removal-node` (model `medium`).
- Why separate: that package ships its own `sharp`, and loading it inside the API next to the app's `sharp` makes two libvips copies clash.
- Usage: `node workers/segment.cjs <input-image> <output-png>`. It writes a PNG whose alpha channel is the garment mask. On error it writes the message to stderr and exits with code 1.
- Called by `segmentGarment()` in `src/utils/recolour.ts` (about 8 to 15 seconds the first time, then cached).

---

## 12. Other files in scope

| Path | What it does |
|---|---|
| `backend/package.json` | Scripts (dev, build, start, lint, prettier, `prisma:*`, `create:superadmin`, `seed:demo`), module aliases, dependencies (express 5, prisma 5, zod, jsonwebtoken, bcryptjs, helmet, multer, sharp, winston, nodemailer, swagger). Uses husky and lint-staged. |
| `backend/.env.example` | Template of environment variables, no real values (section 2). |
| `backend/tsconfig.json` | Target ES6, CommonJS, strict mode, `rootDir` and `baseUrl` = `src`, path aliases, output to `dist`. |
| `backend/eslint.config.mjs` | ESLint flat config: recommended rules, TypeScript rules, Prettier as an error. |
| `backend/.prettierrc` | Single quotes, trailing commas, semicolons, 4 spaces, width 100, no spaces inside braces. |
| `backend/.prettierignore` | Ignores `node_modules`, `dist`, `.git`, `package.json`. |
| `backend/.gitignore` | Git ignore list. |
| `backend/README.md` | Setup steps, scripts table and conventions for new modules (validation with `field()`, list helpers, permissions, audit log). Its text still says "SUPERADMIN"; the enum value is now `SUPER_ADMIN`. |
| `backend/docs/colour-photos-setup.md` | Explains colour photos: local garment cut-out, recolour of the garment only, checks before saving, clean white background, and the optional Cloudflare AI "professional photo" styles. |
| `backend/prisma/schema.prisma` | The database schema (section 3). |
| `backend/prisma/migrations/*` | Migration history (section 4). |
| `backend/public/` | Static files served at the site root. `public/uploads/products/demo` holds 45 files: demo product photos plus `manifest.json` (which photos belong to which product colour) and `CREDITS.md`. `public/temp` is created at runtime for multer. `public/backup-test.html` is a standalone test page (dark UI) for the `/backup` and `/backup/restore` API; its base URL is a hard-coded dev tunnel, so change it before use. |

### Per-file table for `src/` root files

| Path | What it does | Key exports |
|---|---|---|
| `src/index.ts` | Starts the server: connect DB, sync SUPER_ADMIN permissions, listen, handle crashes and SIGTERM. | none |
| `src/app.ts` | Builds the Express app and middleware chain (section 1). | default `app` |
| `src/client.ts` | Single shared Prisma client. | default `prisma` |

---

## Summary (5 lines)

1. Explained the startup flow (`index.ts`, `app.ts`, `client.ts`), the middleware order, and a table of every environment variable (names only).
2. Documented every Prisma model in nine domains (organisation, users, catalog, inventory, billing, credit, orders, expenses and cash, audit) plus all enums.
3. Listed all 44 migrations in order with what each added or fixed.
4. Described config, middlewares (auth, employee guard, rate limit, xss, validate, upload, errors), utils and types with per-file tables.
5. Covered the CLI (create super admin, seed demo), the `scripts/` helpers, the segmentation worker, and the other config and public files.
