# Hard-Coded Values to Fix

These are values written into the code that should come from the database, settings or environment. They were found by reading `backend/`, `frontend/` and `user/` in November 2026; nothing was changed. Only live code is listed: the old catering folders are not reachable from any route. Line numbers can move as files change. Items marked *unverified* were inferred from the code and not run.

No secrets (keys, tokens, passwords) were found in source files.

## The main cause: screens built from a design mock-up

Seven screens were built against a design mock-up and still contain its sample data. They special-case the mock-up's names and show its numbers when real data is missing or loading:

| Screen | Mock-up data still in the code |
|---|---|
| Shop / Branch → **Stock** | Totals 1,560 pcs, ₹9.8 L, ₹21.4 L, "612 item-sizes"; fixed costs for 6 demo barcodes; "This month (1-3 Nov)" |
| **Stock Adjustment** | Numbers start at ADJ-0046; "before" counts 9 / 2 |
| **Purchase Return** (debit note) | Supplier "Tiruppur Knits - 33"; bill "PB/26-27/0040"; prefilled note, quantities and reason for "Ivory" items; ₹18,900; "DN/26-27/0006" |
| **Credit / Udhaar** | Totals ₹28,650 / ₹24,650 / ₹9,200; picks customer "Kavita"; ₹2,000 payment; "RC/26-27/0044" |
| **Suppliers** | Picks "Tiruppur"; "PY/26-27/0019"; "Statement 01 Oct – 03 Nov 2026" |
| **Barcode Labels** | Prints "MATOSHRI FASHIONS"; fake barcode bars; picks bill "0042"; sample item "Cotton Kurta Indigo" |
| **My Profile** | PIN 1234; email "priya.s@matoshri.in"; ADMIN shown as "Branch Manager" |

To find them all, search the code for: `Tiruppur`, `kavita`, `Ivory`, `MATOSHRI`, `matoshri`, `0042`, `26-27`, `1560`, `980000`, `1-3 Nov`, `screenshot`, `baseline`, `realistic`, `matching reference`.

---

## 1. Fix first (wrong money, wrong documents, security)

| # | Where | What is hard-coded | What goes wrong | Fix |
|---|---|---|---|---|
| 1 | `frontend/src/pages/profile/MyProfilePage.tsx:30, 87` | POS PIN defaults to `'1234'` | **Every user without a PIN gets 1234 the moment they save their profile.** | Leave the PIN empty; send it only when the user types one. |
| 2 | `frontend/src/pages/shop/barcode/BarcodeLabelsPage.tsx:361, 811`, `:46-74`, `:370-378` | Shop name "MATOSHRI FASHIONS"; the barcode is 36 identical decorative bars | Labels carry another business's name and **will not scan at the POS**. | Shop name from the logged-in shop; real Code128/EAN-13 (e.g. `jsbarcode`). |
| 3 | `backend/src/services/order.service.ts:578-585, 651, 863` | Message "₹X has been refunded. Banks take 5–7 working days" | Sent when staff only change a status. **No Razorpay refund call exists**, so customers are told money is back when it is not. | Call the Razorpay refund API, or change the text to "Refund approved". |
| 4 | `frontend/src/pages/shop/returns/PurchaseReturnPage.tsx:37, 250, 272` | Default supplier "Tiruppur Knits - 33" | If the user doesn't re-pick, **the debit note is saved with the fake supplier**. | Start empty; set it from the loaded suppliers. |
| 5 | Same page `:46, 86-97, 144, 223`; `frontend/src/lib/api/purchaseReturn.ts:18` | Prefilled note, quantities, reason and amounts; `DN/26-27/0006` | Invented text and amounts can go to suppliers. | Delete the prefills; show "—" while loading. |
| 6 | `backend/src/services/purchaseReturn.service.ts:116` | HSN `'6206'` for every line (the product has no HSN field) | Wrong HSN on every debit note, which is a GST document. | Add HSN to the product; require it. |
| 7 | `backend/src/services/purchaseReturn.service.ts:129, 203, 265`; `validations/purchaseReturn.validation.ts:14` | `taxRate \|\| 5`, `.default(5)` | A 0% item gets 5% GST on the debit note. | Use `??` and the rate from the purchase bill line. |
| 8 | `backend/src/services/stock.service.ts:67-93, 125-156, 180-186, 233-347, 464`; `frontend/src/pages/shop/stock/StockPage.tsx:224-311` | All the Stock page numbers in the table above; the date filter is ignored; "slow-moving" is decided by two fixed barcodes | Every shop and branch sees the same made-up stock value and KPIs. | Compute from `Inventory` and movements; delete the constants and fallbacks. |
| 9 | `frontend/src/pages/shop/pos/NewBillPOSPage.tsx:738` | Header shows `…/26-27/00232` | **Every new bill shows the same fake bill number.** | Show the real next number (the backend already exposes `nextBillNumber`) or "New bill". |
| 10 | `frontend/src/pages/shop/credit/CreditUdhaarPage.tsx:57, 73, 87, 171-228, 438`; `lib/api/credit.ts:35` | Totals ₹28,650 etc.; picks "Kavita"; ₹2,000; `RC/26-27/0044` | Fake dues while loading or on error; the wrong customer is pre-selected. | `?? 0` or "—"; select the first customer; empty amount. |
| 11 | `backend/src/services/purchaseReturn.service.ts:46`; `credit.service.ts:59` | Numbers start at `count + 4` and `count + 44` ("realistic numbering") | Fake series; duplicates when two users save at once or after deletes. | `accountService.nextCode` with no offset. |
| 12 | `backend/src/app.ts:36` | CORS `origin: '*'` (the comment says `CORS_ORIGINS` is used) | Any website can call the API from a browser; the env var does nothing. | Use `config.cors.origins`. |
| 13 | `backend/public/backup-test.html:320` | Dev-tunnel URL in a public page | Exposes a dev tunnel and a fake tool at `/backup-test.html`. | Delete the file. |
| 14 | `backend/src/utils/s3upload.ts:5` | `HOSTED_BACKEND_URL` defaults to an external upload server | With no setting, every photo is sent to that server. | Put it in the config schema with no default. |
| 15 | `frontend/src/pages/profile/MyProfilePage.tsx:88`; `pages/shop/accounts/ShopExpensesPage.tsx:109` | `photoUrl = file.name` | Profile photos and expense bills are never uploaded; only the file name is saved. | Upload through the existing file endpoint. |
| 16 | `frontend/src/utils/axios.ts:8, 12` | Falls back to `http://localhost:5692/api/v1` | A production build without `VITE_SERVER_URL` silently calls localhost. | Fail the build when it is unset. |

---

## 2. Tax and document numbers

| Where | What is hard-coded | Problem | Fix |
|---|---|---|---|
| `backend/src/validations/bill.validation.ts:24`, `creditNote.validation.ts:36`, `catalog.validation.ts:84`, `shopProduct.validation.ts:79,104`; UI menus in `BillFormModal.tsx:42`, `ProductFormPage.tsx:229`, `ShopProductForm.tsx:314` | GST slabs 0 / 5 / 12 / 18 | From 22 Sep 2025 the slabs are 5 / 18 / 40 and the 12% slab is gone. Clothing is 5% up to ₹2,500 per piece and 18% above. **Confirm with your CA.** | One tax-slab setting; the server picks the rate from the product and the sale value. |
| `frontend/src/pages/shop/pos/NewBillPOSPage.tsx:295`; backend `bill.validation.ts:25`, `bill.service.ts:338, 431` | The POS sends the GST rate (`?? 5`); the server trusts it (`default(0)`) | A missing rate bills 0% or 5% regardless of the product. | The server reads `product.taxRate`; the UI only displays it. |
| POS `:355-395`, `BillFormModal.tsx`, `salesBillInvoice.ts`, `user/src/routes/invoice.$id.tsx:26-33` | GST maths copied in 4+ places with different rounding | Screen, receipt and store invoice can disagree by paise. | The backend returns the GST breakup; the UIs print it. |
| POS `:1337-1343`, `BillDetailsModal.tsx:253-264`, `PurchaseReturnPage.tsx:450, 583`, `user/src/routes/invoice.$id.tsx:33` | Always CGST+SGST; "IGST 5% reversed"; IGST chosen by comparing state-name text | Wrong tax heads; a spelling difference flips the tax type. | Compare GST state codes (table in `salesBillInvoice.ts:63`) on the server. |
| `frontend/src/pages/shop/pos/NewBillPOSPage.tsx:285, 1043` | HSN fallback `'6204'` | Shown as if it were the product's HSN. | Show "—"; require HSN on the product. |
| `backend/src/services/bill.service.ts:166`; `validations/org.validation.ts:119` | Number format `{prefix or shop code}/{FY}/00001` | Can reach 18–28 characters; GST invoice numbers may be at most 16. *(Verify.)* | Limit the length; make the series configurable. |
| `bill.service.ts:74`, `expense.service.ts:20`, `credit.service.ts:39`, `purchaseReturn.service.ts:26` | Financial-year helper copied 4 times | Four places to fix. | One helper. |
| `backend/src/services/stock.service.ts:464` | `AUD-26-27/` typed in | Wrong from 1 Apr 2027. | Use the FY helper. |
| `frontend/src/utils/invoiceGenerator.ts:25-239`; `user/src/routes/invoice.$id.tsx:64` | Online-order "TAX INVOICE" with no seller GSTIN, HSN or rate; tagline "PREMIUM APPAREL…"; "GST Registered Store"; Discount ₹0.00; two different invoice numbers (`INV-ORD-…` vs `INV-…`) | Not a valid GST invoice; one order has two numbers. | The backend issues one sequential invoice number; print the shop's GSTIN, HSN and GST breakup. |
| `backend/src/services/shop.service.ts:275, 339`; `frontend/src/pages/branch/BranchShopsPage.tsx:395` | Next-bill preview `SB-YYYYMMDD-0001` / `SB-0001` | Never matches the real format. | Reuse `billService.nextBillNumber`. |
| `backend/src/services/expense.service.ts:173`; `stockAdjustment.service.ts:185` | Made-up `EX/…/{id}`, `ADJ-{id}` for rows with no number | Lists show numbers not in the DB. | Show "—". |

---

## 3. Business rules that should be settings

These are fixed for every company today. Most belong in one **company settings** record (or shop settings where noted).

| Setting | Hard-coded today | Where | Notes |
|---|---|---|---|
| Refund approval limit | ₹2,000 | backend `creditNote.service.ts:31`; UI `NewReturnModal.tsx:21`, `BranchSalesReturnsPage.tsx:51` | The UI copy should read the `approvalLimit` the API already returns. |
| Discount needing approval | 10% | UI `BranchSalesBillsPage.tsx:200`; backend `bill.service.ts:1253` | |
| Low-stock level | 5, in about 10 places; the store "Limited" badge at 3 | `inventory.service.ts` (5 places), `stock.service.ts`, `shopProduct.service.ts:21`, `stockTransfer.service.ts:223`, `store/catalog.service.ts:180` | `LOW_STOCK` filters ignore each item's own threshold, so lists disagree. |
| Delivery fee / free delivery / express | ₹49 / above ₹999 / ₹99 | backend `store/catalog.service.ts:557-559`; store `checkout.tsx:21-23`, `Layout.tsx:177`, `help.tsx:26` | The store should use the `deliveryFee` the cart API already returns. |
| Delivery time | Estimate 4 days (express 1); order ETA 5 days (express 2); COD always yes | backend `store/catalog.service.ts:537-553`, `store/orders.service.ts:161` | The two disagree. Use real courier data or say "usually". |
| Return window | "7-day returns" | `catalog.service.ts:550`; store `Layout.tsx:177`, `signup.tsx:20`, `account/returns.tsx`, `help.tsx:29`; `invoiceGenerator.ts:239` | Products already have `returnPeriodDays`; use it. |
| Credit days and ageing | `creditDays \|\| 15`; buckets 0-15/16-30/30+ vs 0-30/30+ | `credit.service.ts:200, 218` vs `customerDue.service.ts:50, 76`; POS `:174` | The shop Credit page and the branch Dues page disagree. Use `??` and one setting. |
| Minimum margin | 25% | `branchPricing.service.ts:16` | |
| Shift times | 09:30 / 21:00 / 15:00 | `staff.service.ts:23-26` | Shop setting. |
| "New" product | Badge at 21 days, filter at 30 | `store/catalog.service.ts:179, 260` | One value. |
| Large adjustment approval | Never pending (always AUTO/APPROVED) | `stockAdjustment.service.ts:259` | Add a real rule or remove the status. |
| Time zone | Not set. Mix of server-local, UTC and one IST offset | `utils/day.ts`, `bill.service.ts:163`, `creditNote.service.ts:115`, `store/checkout.service.ts:63`, `supplier.service.ts:27`, … | On a UTC server, bills between 00:00 and 05:29 IST get yesterday's date. Smallest fix: `TZ=Asia/Kolkata` in the backend env. |
| Size chart | One XS–XXL chart for every product | `user/src/routes/product.$id.tsx:15-22` | Per category, or hide it. |
| States list | 22 of 36 states/UTs; default "Maharashtra" | `user/src/components/AddressForm.tsx:7-11, 20` | Customers in missing states cannot save an address. Use the full list, no default. |
| Store menu categories | "Ethnic", "Accessories", "Offers = 20% off" | `user/src/routes/index.tsx:37`, `user/src/components/Layout.tsx:16-18` | These exist only in the demo seed; build the menu from real categories. |
| Row caps that hide data | Store 2,000 products; customer orders 50 (no paging); exports 5,000/1,000; transfers 200; returns 10 | `store/catalog.service.ts:207`, `store/orders.service.ts:262`, `bill.service.ts:1150`, `stockTransfer.service.ts:217`, `purchaseReturn.service.ts:158` | Paginate, or warn when the cap is hit. |
| WhatsApp country code | Always prefixes `91` | `customerDue.service.ts:173`, `credit.service.ts:494` | Numbers saved as +91… break; normalise once. |

---

## 4. Environment and branding

| Where | What | Fix |
|---|---|---|
| "Cloth Pro": `user/src/routes/invoice.$id.tsx:51`, `payment.tsx:51`, `Layout.tsx`, `MobileTabBar.tsx:154`; admin `Header/index.tsx:39`, `Sidebar/index.tsx:663, 718`, `AuthLayout.tsx:17`, `exportSalesExcel.ts:15`; backend `credit.service.ts:481` | Brand name in many places, including **above the seller on tax invoices** and in customer WhatsApp messages | One app-name setting; invoices and messages use the company or shop name. |
| `frontend/index.html:11` | Title "Cloth Martketplace" (typo) | Fix the title. |
| `backend/src/services/user.service.ts:22`; `config/config.ts:15,19` | Reset link fixed at 30 minutes; the two JWT expiry env vars are parsed but unused | Use the config values. |
| `backend/src/services/store/account.service.ts:129`, `user.service.ts:288` | A missing `STORE_URL` sends customer reset links to the admin panel | Require `STORE_URL` for customer emails. |
| `backend/src/utils/s3upload.ts:51` | Every upload is labelled `image/jpeg` | Use the detected type. |
| `user/src/lib/api.ts:9` | No fallback and no `user/.env.example` | Add `.env.example`. |
| `user/src/components/AuthShell.tsx:10-12` | Sign-in photos from `/uploads/products/demo/…` | Bundle the images in the app. |
| `backend/src/config/swagger.ts:8-13` | "My Express API"; empty in the built `dist`; `/api-docs` public | Fix it, or turn it off in production. |
| `backend/src/utils/s3constants.ts`, `utils/constants.ts`; `email.service.ts:68, 113` | Leftovers from other projects (bucket name, `http://link-to-app`) | Delete. |
| `backend/package.json` | Name "restaurant"; `prisma:db:seed` has no seed config, so it fails | Fix it. |
| `frontend/src/lib/api/pincode.ts:5` | The browser calls a public pincode API directly | Proxy it through the backend (low priority). |

---

## 5. Small things

- **Fake fallbacks for actor ids.** `'user-admin'`, `'admin'`, `'system'` in `credit.controller.ts:46`, `purchaseReturn.controller.ts:44`, `barcodeLabel.controller.ts:63`, `supplier.controller.ts:48`, `stock.controller.ts:23,30` and `stockAdjustment.controller.ts:36`. Use `req.user!.id`.
- **"First branch of the company" fallbacks.** `stock.service.ts:53-57`, `stockAdjustment.service.ts:25-30` and `barcodeLabel.controller.ts:21-25`. Throw instead. *(Unverified whether they are reachable.)*
- **Fake printer message.** `barcodeLabel.service.ts:186-197` says "Print job … queued successfully". Nothing is queued.
- **Empty approval tabs.** `branchApproval.service.ts:101` counts discount, credit, cancel-bill and write-off approvals as 0. Hide those tabs until they exist.
- **Invented cancellation reason.** `CancellationReviewModal.tsx:60` shows "Customer requested order cancellation before dispatch." Show "No reason given".
- **Wrong role labels.** `MyProfilePage.tsx:39-46` shows ADMIN as "Branch Manager". `BranchShopAssignmentPage.tsx:13` is missing Tailor and Helper. Use `ROLES` and `STAFF_ROLES`.
- **Buttons that don't do what they say.**
  - `CreditUdhaarPage.tsx:413-421`: "SHARE PDF" only prints.
  - `StockPage.tsx:207`: "Purchase" opens a shop-only page from the branch panel.
- **Wrong counts and data.**
  - `credit.service.ts:197`: `billsCount || 1` shows "1 bill" when there is none.
  - `stock.service.ts:86`: "All time" starts in 2020.
  - `StockAdjustmentPage.tsx:120-128`: saves the photo as base64 inside the record.
- **Ids that can collide.** `barcodeLabel.service.ts:176` and `stock.service.ts:425, 465` build ids from the time. Use `randomUUID` or `nextCode`.
- **XSS cleaning off.** `app.ts:28-29` has it turned off with a `TODO`.
- **Dead files.** These can be deleted: `components/common/Calendar`, `ExpiryPopup`, `modal/ModalComponent` (Lorem ipsum), `utils/TabularContent.tsx`, `pages/dashboards/ComingSoon.tsx`.

## 6. Suggested order

1. **Today, small and safe:** items 1, 2 (shop name only), 3 (the message text), 4, 9, 12 and 13 in §1; set `TZ=Asia/Kolkata`.
2. **This week:** delete the mock-up data from the seven screens (§1 #5, #8, #10, #11 and the Suppliers and Stock Adjustment rows); fix GST rate handling with your CA (§2); real barcodes.
3. **Next:** one company-settings record for §3; the backend issues invoice numbers and GST breakups; tidy up branding and environment (§4).
