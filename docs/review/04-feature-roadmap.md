# Feature Roadmap and Technical Health

Scope: gaps found by reading docs/ and grepping `backend/src`, `frontend/src`, `user/src`, `backend/prisma/schema.prisma`. Effort S (days) / M (1-3 weeks) / L (1+ month). Value High/Med/Low.

Already present (do NOT re-build): low-stock flags (`inventory.service.ts`), customer reviews with photos, self-service return/cancel, in-app notifications, wishlist, coupons, wa.me due reminders (`credit.service.getWhatsAppReminders`), barcode labels, audit log service, per-shop GSTIN and HSN/taxRate columns, manual courier/tracking fields on Order, Swagger router, helmet and rate limiter, jsPDF in admin.

## 1. Quick wins

| Feature | Why (evidence) | What to build | Effort | Value |
|---|---|---|---|---|
| GST reports and exports (GSTR-1 / GSTR-3B summary, HSN summary) | HSN, taxRate, gstin exist on bills/products, but no GSTR export; the only "gstr" hits are unrelated | Backend: `gstReport.service.ts` grouping confirmed bills + approved credit notes by rate/HSN/B2B-B2C, CSV/JSON in GSTR-1 shape; route under `/shop-admin` and `/branch-admin`. Frontend: new Reports page using the existing jsPDF libs | M | High |
| Automatic reorder alerts | Low stock is only a flag on the stock page (fixed threshold); no per-variant reorder level, no alert | Add `reorderLevel`/`reorderQty` to variant inventory (Prisma migration); extend `inventory.service` low-stock query; dashboard widget in `dashboard.service.getShopDashboard`; "Create purchase bill draft" button on the shop stock page | S | High |
| Real loyalty points | `bill.service.ts` hardcodes `loyaltyPoints: 0`; a field exists but nothing earns or redeems | Earn on confirmed bills (and online orders in `store/checkout.service`), redeem as a payment mode in `NewBillPOSPage.tsx`, reverse on credit note; show balance in storefront profile | M | High |
| Courier tracking link | `courierName` and `trackingNumber` are typed by hand (`ShippingModal.tsx`) | Courier to URL template map in `store/orders.service` so the customer order page shows a "Track shipment" link; no API needed | S | Med |
| Order-status email messages | `email.service.ts` (SMTP) exists but only auth mails; status changes only create in-app notifications | Hook `order.service` status updates and `store/checkout` to send email; for staff, extend wa.me links to "order ready/dispatched" | S | Med |
| Thermal receipt (58/80 mm) print view | "thermal" appears only in barcode label validation; sales bill print is A4 jsPDF | 80 mm print stylesheet / HTML for bill and credit note, reachable from bill list and POS success | S | High |
| Barcode scanner POS mode | Barcode labels exist; POS scan flow not documented as a keyboard-wedge mode | In `NewBillPOSPage.tsx` keep an always-focused scan input: Enter adds variant by barcode, beep on miss, qty increment on repeat scan | S | High |
| Size chart on product page | Sizes are a master list only; no chart or fit guidance on the storefront | Add `sizeChart Json` on Category/Product; admin editor in product form; modal in `user/` product detail | S | Med |
| CSV export on every list | Only some pages export; customers, bills, stock, ledger have none | Generic `exportCsv` util in `frontend/src/lib`; backend `?format=csv` on paginated list endpoints | S | Med |
| Audit trail UI | `audit.service.ts` writes append-only logs but no page lists them | `GET /company-admin/audit-logs` with filters (actor, entity, date); page under company-admin and super-admin showing before/after diff | S | Med |

## 2. Medium

| Feature | Why | What to build | Effort | Value |
|---|---|---|---|---|
| Courier integration (Shiprocket/Delhivery) | Delhivery only appears as a dropdown/seed value; AWB and status are manual | `shipping.service.ts` adapter: create shipment, fetch label, webhook endpoint updating `OrderStatus` (SHIPPED, OUT_FOR_DELIVERY, DELIVERED, RETURNED); pincode serviceability replaces static `/store/delivery/:pincode`; "Create shipment" button in `OrderStatusUpdateModal.tsx` | M | High |
| WhatsApp/SMS Business notifications | Reminders are only `wa.me` click-to-send links; no unattended sending | Provider adapter (Meta Cloud API / MSG91) behind a `notification.service`; queue with retries (a Job table plus existing `workers/`); templates for order, dispatch, due reminder; opt-out flag on Customer | M | High |
| Demand forecasting and smart reorder | Weighted-average cost and sales history exist but no forecast | Nightly job (in `workers/`) computing sell-through per variant over 30/60/90 days; suggested purchase quantity; dead-stock and fast-mover reports | M | High |
| Colour swatches, size availability and facets | Colour photos setup exists (`backend/docs/colour-photos-setup.md`); storefront filters are basic | Facets endpoint (size, colour, price, brand, discount) on `/store/products`; swatches in `ProductCard`; "only sizes in stock" | M | High |
| Recommendations and better search | Search is suggestions only | "You may also like" (same category/brand + co-purchase from order items), recently viewed, trending; consider Postgres `pg_trgm` for typo-tolerant search | M | Med |
| Customer self-serve exchange | Returns exist; exchange (swap size) does not | Add `EXCHANGE` resolution to `/store/orders/:id/return`: pick replacement variant, reserve stock via `inventory.applyStockChanges`, handle price difference | M | High |
| Wallet / store credit | Credit-note refunds are cash or approval only; no storefront wallet | `WalletLedger` table; credit-note refund-to-wallet option; use at POS and checkout; balance in storefront profile | M | Med |
| Company and super-admin analytics | Dashboards exist per shop and branch only | Company-level service aggregating branches; charts (sales trend, category mix, top products, staff performance, GST payable) on company-admin home | M | Med |
| Backups and restore | No backup script found | `pg_dump` cron script plus documented restore; sync uploads to object storage | S-M | High |
| Segment campaigns | `workers/segment.cjs` exists | UI to build segments (dormant, high spenders, dues) and send a coupon via the notification service | M | Med |
| Review moderation | Reviews can be posted; no moderation or shop reply seen | Admin moderation queue, verified-purchase badge, shop reply, rating histogram | S-M | Med |

## 3. Big bets

| Feature | Why | What to build | Effort | Value |
|---|---|---|---|---|
| Offline-capable POS (PWA) | No service worker, manifest, or offline queue anywhere; poor internet stalls billing | `vite-plugin-pwa` for `frontend/`; IndexedDB cache of catalogue/barcodes/customers; queue offline bills with idempotency keys; per-device number series (current "highest + 1" numbering must change first) | L | High |
| Storefront PWA, push and multi-language | `user/` has no manifest or i18n; Hindi font is only embedded in admin PDFs | `vite-plugin-pwa`, install prompt, web push/FCM for order updates; `react-i18next` with Hindi/Marathi/Gujarati packs | L | High |
| E-invoice (IRN/QR) | No e-invoice code; mandatory above the turnover threshold | IRP integration via a GSP for B2B bills: payload from bill + shop GSTIN, store IRN/ack/QR, print QR, 24h cancel | L | Med (High for B2B) |
| Accounting export (Tally/Zoho) | Ledgers, cash book, purchases, expenses exist but nothing leaves the system | Voucher export (sales, purchase, receipt, payment) in Tally XML/CSV; ledger mapping setting | M-L | High for accountants |
| Multi-warehouse | Stock is per shop; transfers exist, no warehouse entity | `Location` model (SHOP/WAREHOUSE); warehouse receives purchases and allocates to shops through the existing transfer flow; storefront fulfils from nearest location | L | Med |
| Marketplace settlements | Multiple shops/companies sell, but money lands in one Razorpay account | Razorpay Route split payments, per-shop settlement ledger, commission rules, payout reports | L | High |

## 4. Technical health

| Item | Evidence | Action | Effort |
|---|---|---|---|
| Automated tests | No test script in any `package.json`; no jest/vitest config | Vitest on backend for money-critical services: `inventory.applyStockChanges` (no oversell), `bill.service` totals/rounding, `creditNote.service` approval, `stockTransfer.service`, `store/checkout` price trust and Razorpay verify; test Postgres via docker; Playwright smoke for POS bill and storefront checkout | M |
| CI | No `.github/` directory | GitHub Actions: install, `tsc --noEmit`, eslint, prettier check, tests, `prisma validate`, build all three apps | S |
| Containers | No Dockerfile or compose | Dockerfile per app plus compose with Postgres; documented env vars | S |
| Unify duplicate flows | Docs section 4: two stock systems (`stock.service`, `stockAdjustment.service`, `purchaseReturn.service` bypass `applyStockChanges`), two return systems (`SalesReturn` vs credit notes), two order paths (`order.service.createCustomerOrder` vs `store/checkout`) | Route all stock writes through `applyStockChanges`; migrate and drop `SalesReturn`; remove old order path after checking callers | M |
| Numbering safety | Counters are "highest + 1 with retry", not DB sequences; GST needs gap-free series and offline POS needs device series | Per-shop-per-FY counter table with row lock | S-M |
| Money type | Prisma uses `Float` for subtotal, tax, total | Move to `Decimal(12,2)` or integer paise; gradual migration with a shared `round2` | M |
| Legacy catering cleanup | `frontend/README.md` still "Catering Management System"; `frontend/my-three-app`, Event components, catering validation schemas, `vite.config.ts.timestamp-*.mjs`, backend package name "restaurant", dead pages (`BranchDashboard`, `ComingSoon`, `BranchSuppliersPage`, `BranchProfile`) | Delete after usage check; ignore `*.timestamp-*` in `.gitignore`; rename package | S |
| README and docs | No root README; `chat.txt` in repo root | Root README (what, run order, env, `seed:demo`, roles); remove or gitignore `chat.txt`; rewrite frontend README | S |
| API documentation | Swagger router exists (`config/swagger.ts`) but is probably stale against the many routes | Generate OpenAPI from zod validations so docs cannot drift; serve at `/docs` in non-prod | M |
| Monitoring | morgan only; no Sentry, health checks or metrics | Sentry for the three apps, `/health` and `/ready`, structured logs (pino), uptime check, slow-query logging | S |
| Security hardening | `xss()` commented out in `app.ts`; JSON limit 16 MB globally; limiter on few routes | Re-enable sanitising or rely on output escaping; lower body limit except upload routes; limiter on login, password reset, checkout; dependency audit in CI | S |
| Storage | Uploads in `backend/public/uploads` (local disk) | S3/R2-compatible abstraction so several instances can run | M |

## 5. Suggested order

**Phase 1 (weeks 1-4): trust and daily-use wins.** CI plus first tests on stock/billing/checkout, legacy cleanup and root README, backups, reorder alerts, GST reports (GSTR-1/HSN), thermal receipts, scanner POS mode, audit-log UI, size charts, CSV exports. Protects the money paths and gives shop owners and accountants immediate value.

**Phase 2 (weeks 5-12): engagement and fulfilment.** Notification service (WhatsApp/SMS/email) with order and due templates, courier integration with webhooks, loyalty points and wallet, exchanges, storefront facets and recommendations, demand forecasting, company dashboards, review moderation. In parallel: unify stock/return/order paths, Decimal money, numbering counters, OpenAPI from zod, Sentry and health checks.

**Phase 3 (quarter 2+): scale and differentiation.** Offline POS PWA (needs the numbering rework), storefront PWA with push and multi-language, e-invoice, Tally/Zoho export, multi-warehouse, marketplace settlements with Razorpay Route and commissions.
