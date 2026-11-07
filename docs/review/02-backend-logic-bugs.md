# Backend logic bugs and data-integrity risks (read-only review)

Scope: `backend/src/services`, `controllers`, `routes`, `validations` and `backend/prisma/schema.prisma`. Findings were checked against the code. Items marked **unverified** rely on an assumption stated in the item. Paths are relative to `backend/src` unless they start with `prisma/`.

Format: **Title** | file:line | Scenario | Fix.

---

## HIGH

### H1. Stock adjustment writes an absolute quantity read earlier (lost update; stock double-counted or resurrected)
- Files: `services/stockAdjustment.service.ts:222-268` (raw `UPDATE ... SET physicalQty = $4`), `services/stock.service.ts:381-412` (`adjustStock`, `recordPhysicalStockCount`), `services/inventory.service.ts:739-774` and `871-902` (`adjustStock`, `batchAdjust`).
- Scenario: `physicalQty` is 10. An adjustment reads 10. A sale of 4 commits (6 left). The adjustment, an INCREASE of 2, then writes `physicalQty = 12`. The sale is erased and 6 units appear from nowhere. `applyStockChanges` is atomic, but these four paths read, compute and write absolute values.
- `stockAdjustment.service` and `stock.service` also run outside any transaction, so the Inventory write, the StockAdjustment insert and the StockMovement create can half-apply.
- `recordPhysicalStockCount` trusts the client's `systemQty` to decide whether there is a variance. `CORRECTION` then overwrites with `countedQty`, so any sale made during counting is lost.
- Fix: route all adjustments through `applyStockChanges` (atomic `physicalQty +/- delta`), or use `SELECT ... FOR UPDATE` inside one transaction. For audits, compute the delta from the server's current quantity.

### H2. Adjustment id and number collide across branches and concurrent requests
- File: `services/stockAdjustment.service.ts:36-48` and `:256`.
- Scenario: the number is count-based and `id = 'adj-' + adjustmentNumber`. The id is the global primary key but the number is per branch. Branch A and branch B both reach ADJ-0046, so the second branch hits a PK violation (HTTP 500). Concurrent requests in one branch collide the same way. The inventory update has already run (H1, no transaction), so the stock change is applied but the record is not saved.
- The number has a hard-coded seed offset (`Math.max(46, 40+count+1)`). `StockAdjustment.adjustmentNumber` has no unique index (`prisma/schema.prisma:1121-1146`).
- Fix: use uuid ids. Generate the number in a transaction with a unique `(branchId, adjustmentNumber)` and retry on P2002.

### H3. Legacy customer order path `POST /users/orders/checkout` bypasses all store safeguards
- Files: `routes/user.routes.ts:35`, `controllers/ecommerce.controller.ts:201-204`, `services/order.service.ts:910-1137`. The real path is `services/store/checkout.service.ts`.
- Scenarios (all reachable by any signed-in customer; the controller does no zod validation):
  1. Payment bypass. `paymentMethod: 'ONLINE'` with `paymentDetails: {transactionId: 'x'}` sets `PaymentStatus.PAID` (`order.service.ts:1047`). Razorpay is never consulted, so a free order is placed. Admin `updateStatus` then treats it as paid (`:443`).
  2. Negative quantity creates stock. `items[].quantity = -5` passes the stock check (`available < -5` is false). `delta = -(-5) = +5` increases inventory, and the subtotal goes negative (clamped to 0 by `Math.max(0, ...)`).
  3. Cross-tenant routing. `companyId`, `branchId` and `shopId` come from the request body (`:945-947`), so an order can be attached to any branch or company.
  4. Mixed shops. The branch and shop come from the first variant only. Items from other shops are ordered under it.
  5. No coupon limits. There is no `usageLimit`, `perCustomerLimit` or shop-scope check, so a coupon can be reused without limit.
  6. Wrong return refund. `requestCustomerReturn` (`:1265-1295`) always sets `refundAmount = order.totalAmount`. There is no returnable-quantity, return-window or duplicate-return check.
  7. Weak order number. `orderNumber` uses 5 base36 chars from `Math.random`. A collision gives HTTP 500 on the unique index.
- Fix: delete `createCustomerOrder`, `requestCustomerReturn`, `requestCustomerCancellation` and the `/orders/*` customer routes in `user.routes.ts`, or make them thin wrappers over `store/checkout.service` and `store/orders.service`. I did not check whether the frontend still calls them.

### H4. Purchase return (debit note) has no validation, no StockMovement, and can drive stock wrong
- File: `services/purchaseReturn.service.ts:184-310`. Validation is in `validations/purchaseReturn.validation.ts`.
- Client-trusted data. `unitCost`, `taxRate`, `variantId`, `productId` and `purchaseBillItemId` are used as sent. Nothing checks that the items belong to the bill or the shop, or that the variant belongs to the company. Any `variantId` can be used.
- Unlimited returns. There is no returnable-quantity check. Bought 5, return 50 (stock clamps to 0 at `:284`), then return 50 again.
- No StockMovement (known). `tx.inventory.update` is used directly, with no `StockMovement` row and no `Product.stockQuantity` sync. It is a non-atomic read-then-write (`:280-288`), and the `Math.max(0, ...)` clamp hides a shortage.
- Shop id used as branch id (known). `branchId = bill ? bill.branchId : scope.shopId` (`:237`, `:276`). With no bill the inventory lookup finds nothing and the return is marked CONFIRMED with no stock effect. `PurchaseReturn.branchId` then holds a shop id.
- Draft returns are dead. `status` defaults to `DRAFT` and there is no confirm or update endpoint (`routes/shopAdmin.routes.ts:131-136`). A DRAFT never changes stock or payable. `takeStockFrom` (damaged versus active) is ignored.
- 0% GST becomes 5%. `item.taxRate || 5` (`:203`, `:265`) turns a 0% line into 5% tax. `getBillsBySupplier` has the same `|| 5` (`:129`).
- Payable math. `payableAfter` is clamped to 0, so any excess return value is lost with no supplier credit. It uses a stale `bill.balanceDue` read outside the transaction. `paymentStatus` becomes `PART_CREDIT` even when nothing was paid, and `amountPaid + balanceDue != totalAmount` afterwards. A wrong or foreign `purchaseBillId` is silently ignored (`:222`).
- No lock against bill edits. Purchase bills can still be edited, cancelled or deleted after a return (nothing in `bill.service.ts` checks `PurchaseReturn`), so stock is reversed twice.
- Numbering. `DN/FY/(count+4)` has no retry. A concurrent create hits P2002 on `(shopId, returnNumber)` and returns HTTP 500.
- Fix: do it in one transaction. Validate each item against `purchaseBillItem` (variant, shop, returnable qty = bought minus already returned). Take cost and tax from the bill item. Call `applyStockChanges` with a purchase-return movement and `StockSourceType.RETURN`, and fail on shortage. Add confirm and cancel endpoints, a row lock on the bill, and a numbering scheme with retry.

### H5. Credit/Udhaar due collection has no locking and can over-collect or drift the customer ledger
- File: `services/credit.service.ts:364-471`.
- Scenario: two receipts, or a receipt plus a bill-level payment, run at once. `customer.balanceDue` is read outside the transaction (`:370-387`). The FIFO allocation reads each bill's `balanceDue` without a lock (`:410-419`) and writes absolute values (`:426-451`, `:457`). Customer owes 100. Two payments of 100 both pass the check, both write `balanceDue = 0`, and 200 of receipts exist.
- `receiptNumber` is `count + 44` (`:50-60`) with no unique index (`prisma/schema.prisma:1624-1643` has only a plain index) and no retry, so concurrent or post-delete runs give duplicate receipt numbers.
- The bill `version` is not bumped, so a concurrent `updateSales` or credit note does not conflict.
- Fix: do everything inside `$transaction` with `UPDATE ShopCustomer SET balanceDue = balanceDue - $x WHERE balanceDue >= $x`. Lock the bills as `billService.lock` does. Add `@@unique([shopId, receiptNumber])` and retry. Derive `balanceDue` from bills or reconcile it on a schedule.

### H6. `counterService.close` closes the counter with no count, bypassing day-close
- File: `services/counter.service.ts:30-39`.
- Scenario: `close(scope, actor, closingCash)` sets `closedAt` and `closingCash` only. `expectedCash`, `difference`, `denominations`, `depositAmount`, `keptFloat` and `reviewStatus` stay null. `dayClose.getDayClose` then reports `diff = session.difference ?? 0` and status `ACCEPTED`, so a real shortage never reaches branch review. `cashBook.getDay` uses `closingCash` as the next opening float (`:324`).
- Fix: remove this path or make it call `cashBookService.closeDay`.
- Unverified: I did not confirm whether any route still calls `counterService.close`. The method is exported and public.

### H7. Bills, credit notes and payments can be changed after the day is closed, which silently changes closed cash
- Files: `services/bill.service.ts:729-743` (`assertDayOpen`) is called only from `createSales` (`:747`). It is not called from `updateSales` (`:857`), `cancelSales` (`:929`), `deleteSales` (`:957`), `recordPayment` (`:981`), `createExchangeBill` (`:795`), `creditNote.create` or `credit.service.recordPayment`.
- Edit after close. A cash bill edited after close has its `atBilling` payments deleted and re-created with `paidAt = now()` (`:887`, `:904`). The sale's cash moves out of the old window, so the closed day's recomputed `cashSales` and the stored `expectedCash` disagree.
- Cancel after close. A confirmed cash bill cancelled after close drops out of the cash book (movements only count `status: CONFIRMED`, `cashBook.service.ts:88-95`) with no refund row.
- Inconsistent day-close rows. `dayClose.getDayClose` recomputes `cashSales`, `duesCollected` and `cashOut` live but uses the stored `expectedCash`, so a row can show numbers that do not add up.
- Fix: apply a "day is open" check to every mutating bill and payment operation. On edit, keep the original `paidAt` for unchanged payments. Cancelling a bill with cash should create an explicit cash-refund entry.

### H8. Shadowed `GET /shop-admin/customers` (known) returns the wrong data
- Files: `routes/shopAdmin.routes.ts:79` (`mountBills(router)`) registers `router.get('/customers', b.customers)` (`routes/bill.routes.ts:16`) before `router.get('/customers', customerController.list)` at `:88`.
- Scenario: the Customers page calls `GET /shop-admin/customers?page=1&search=...` and gets the billing quick-search (`billService.searchCustomers`, at most 10 names with `previousDue`). The paginated list, `metrics`, `customerType` and `creditLimit` are never returned.
- Fix: delete the `/customers` route from `bill.routes.ts` (it already has `/sales-bills/customers` at `:17`), or register `customerController.list` first.

### H9. Stock endpoints do not check that the branch or variant belongs to the caller
- Files: `services/inventory.service.ts:176-180` (`resolveBranchId`), `:829-858` (`batchAdjust`), `:946` (`updateThreshold`).
- Scenario: for company-admin and super-admin, `resolveBranchId` returns the caller-supplied `branchId` without checking it belongs to the company. `batchAdjust` never checks variant ownership (only `adjustStock` does, `:715`) and takes the branch from `variants[0]`. `updateThreshold` upserts `Inventory` for any `variantId`. A company admin can add or remove stock for another company's variants and branches.
- In `stockAdjustment.service.ts:212` and `stock.service.ts:371` the variant check is `companyId` only, so a shop admin can adjust other shops' products in the same company.
- Fix: validate branch and variant against `scope.companyId` (and `scope.shopId` for shop users) in one helper used by every stock entry point.

---

## MEDIUM

### M1. Admin cancellation approval can cancel and refund orders that already shipped or were delivered
- File: `services/order.service.ts:392-412` and `:640-680`.
- `cancelAndRestock` only guards `status notIn [CANCELLED, RETURNED, DELIVERED]`. `reviewCancellation` then runs an unconditional `tx.order.update` to `CANCELLED` and `REFUNDED`. A customer asks to cancel at `CONFIRMED`, the shop ships, and admin approves later. For `SHIPPED`, `DISPATCHED` or `OUT_FOR_DELIVERY`, stock is restored while the parcel is in transit. For `DELIVERED`, `cancelAndRestock` matches nothing, but the order is still set to `CANCELLED` + `REFUNDED` with no restock.
- Fix: in `reviewCancellation`, refuse approval unless the order is in a cancellable state, and use the `count` from `cancelAndRestock`.

### M2. Order status writes are not conditional (check-then-act race)
- File: `services/order.service.ts:428-503` (`updateStatus`), `:522-560` (`updateShipping`), `:566-615` (`updatePayment`).
- The order is read, validated, then `tx.order.update({where:{id}})` writes unconditionally. A customer-side cancel (`store/orders.service.ts:310`) committing between read and write is overwritten. The order goes back to `SHIPPED` after its stock was restored.
- `updatePayment` accepts any `PaymentStatus` from any state (for example `REFUNDED` to `PAID`, or `PAID` on a cancelled order).
- Fix: `updateMany` with `where: {id, status: order.status}` and a 409 on zero count. Add a payment-status transition table.

### M3. Online payment can land on a cancelled order
- File: `services/store/checkout.service.ts:246-282` (`verify`), `:317-329` (`switchToCod`).
- Scenario: the customer cancels an unpaid online order (stock restored, `store/orders.service.ts:309-326`) while the Razorpay window is open, then pays. `verify` marks it `PAID` and leaves the status `CANCELLED`, with no refund flow. `switchToCod` has no cancelled-order check (`retry` does, `:310`). `verify` after `switchToCod` marks a COD order paid, so the customer can be charged twice.
- Fix: in `verify`, if any order is cancelled, refund or reject. In `switchToCod`, reject cancelled orders. Use conditional updates.

### M4. Unpaid online orders hold stock forever
- File: `services/store/checkout.service.ts:207-215`. There is no expiry job anywhere in `src` (no cron or `setInterval`).
- Scenario: stock is deducted at checkout. An `ONLINE` order that is never paid stays `PENDING` and blocks the units. `reservedQty` is never incremented by any code path (only read), so the column is dead.
- Fix: a scheduled job that cancels and restocks unpaid online orders after N minutes.

### M5. Coupon limits can be exceeded under concurrency, and coupon use is never released on cancel
- Files: `services/store/customer.service.ts:137-174` (`couponFor`), `services/store/checkout.service.ts:218-222`.
- Scenario: `usageLimit` is 1. Two customers check out at once, both pass the pre-check, and both increments succeed, so `usedCount` becomes 2. The per-customer limit has the same race. Cancelling an order (customer cancel, admin cancel, approved cancellation) never decrements `usedCount` or deletes the `CouponUsage`, so cancelled orders consume the limit.
- Fix: `UPDATE Coupon SET usedCount = usedCount + 1 WHERE id = $1 AND (usageLimit IS NULL OR usedCount < usageLimit)` inside the order transaction. Reverse it on cancel and refund.

### M6. Credit note on an unpaid or part-paid bill refunds cash that was never received; exchange and store credit gaps
- File: `services/creditNote.service.ts:226-243`, `:245-294`.
- Scenario: a bill of 1000 on credit (nothing paid, `balanceDue` 1000). A return of 1000 settled as `REFUND` / `UPI` pays money out, while the bill's `balanceDue` stays 1000 and the customer still owes it. Only `ADJUST_DUE` reduces `balanceDue`. The refund is not capped by `amountPaid`.
- `EXCHANGE` with no `exchangeItems` (`:245`) is accepted. The note is approved and stock restocked, but no exchange bill, refund or credit exists. The validation does not require items (`validations/creditNote.validation.ts:40-60`).
- `STORE_CREDIT` notes are totalled (`summary`, `:424-432`), but there is no redemption path anywhere (a grep for `STORE_CREDIT` finds only a label in `dashboard.service.ts` and validation). Store credit can never be spent and the liability only grows.
- Per-line unit price is `round2(price * factor)` times quantity, so returning every unit of a bill can differ from the bill total by a few paise.
- Fix: cap `REFUND` at `amountPaid` minus earlier refunds and reduce `balanceDue` for the rest. Require exchange items for `EXCHANGE`. Build a redemption mode for store credit.

### M7. Editing a sales bill that has later collections can leave payments above the total
- File: `services/bill.service.ts:209-233` (`settle`), `:883-905` (`updateSales`).
- Scenario: bill total 1000, 400 collected later through `recordPayment` (`atBilling = false`). An edit lowers the total to 300. `paidNow` is computed against the new total only (`salesPaidNow`), so `paidNow = 300` plus `later = 400`. `amountPaid` is capped to 300, but the `SalesBillPayment` rows sum to 700. The cash book counts the rows (700) while the bill says 300, and no refund is recorded for the extra 400.
- Fix: compute `paidNow` against `total - collected`. If collected exceeds the new total, require an explicit refund entry.

### M8. `SalesBill.paidAmount` / `creditAmount` disagree with `amountPaid` / `balanceDue`
- File: `services/bill.service.ts:197-203`, `:762-766`, `:893-897`.
- Scenario: a split payment sends `payments: [{CASH, 500}]` on a 1000 bill with the default `paymentMethod = 'CASH'` and no `paidAmount`. `payment()` returns `paid = total`, so `creditAmount = 0`, while `settle()` computes `balanceDue = 500`. The credit statement uses `creditAmount > 0 ? creditAmount : total - paid` (`credit.service.ts:282`). The `ON_CREDIT` filter and the `onCredit` KPI read `creditAmount` (`bill.service.ts:1049-1050`, `:1162`). The customer ledger reads `balanceDue`. Later collections and `ADJUST_DUE` credit notes never update `creditAmount`. Partly unverified: the exact mismatch depends on what the POS frontend sends in `paymentMethod`.
- The customer statement leaves out payments recorded through `bill.service.recordPayment` (no `CustomerCreditPayment` row) and `ADJUST_DUE` credit notes. Its running balance therefore does not match `ShopCustomer.balanceDue`, and it clamps each line at 0 (`credit.service.ts:332`).
- Fix: drop `paidAmount` and `creditAmount`, or derive them from `amountPaid` and `balanceDue`. Build the statement from `SalesBillPayment` and credit notes.

### M9. Customer ledger (`ShopCustomer`) drifts and can duplicate
- File: `services/customerLedger.ts:42-90`.
- `Math.max(0, ...)` clamps hide negative drift. After a clamp, later reversals under-subtract and the stored `balanceDue` can no longer be reconciled with bills. The customer is found with `findFirst` then created, so two simultaneous first bills for one phone race on `@@unique([shopId, mobile])` and the second bill fails. Phone numbers are matched by `trim()` only: `98765 43210` and `9876543210` become two customers. `customer.service.create` (`:102-121`) has the same check-then-create race.
- Fix: normalise phone numbers, upsert with `ON CONFLICT`, use atomic `increment`. Add a reconciliation check of `balanceDue` against `openingDue + SUM(open bill balanceDue)`.

### M10. `searchCustomers` understates `previousDue`
- File: `services/bill.service.ts:1186-1227`.
- It reads only the 20 latest matching bills (`take: 20`), sums `balanceDue` per phone and returns 10. A customer with 30 credit bills shows only the most recent ones, and only from `CONFIRMED` bills. The POS "previous due" prompt is wrong.
- Fix: read `ShopCustomer.balanceDue` or aggregate by phone in SQL.

### M11. Stock transfer: short receipts vanish, no cancel path, reject race
- File: `services/stockTransfer.service.ts:428-473`, `:574-656`, `:739-805`.
- Dispatch removes `approvedQty` from the source. Receive adds only `receivedQty`. A short transfer (`SHORT`) leaves the difference with no movement, no return to the source and no write-off, so units disappear from the books (`shortUnits` is only reported).
- A `DISPATCHED` transfer that never arrives cannot be cancelled or reversed, and nothing can be reversed after `APPROVED`.
- `decide` with `REJECT` uses an unconditional `update` after reading `REQUESTED` (`:750-753`). A concurrent approve and dispatch can end up `REJECTED` after stock moved.
- Approval checks availability once with no reservation, so dispatch can fail later with "Insufficient stock". Approved quantity is not capped at the requested quantity.
- Fix: add a resolve-shortage action (write-off or return to source) with movements, an admin cancel for `APPROVED` and `DISPATCHED`, and a conditional `updateMany` for reject.

### M12. Cancelling a bill silently removes its cash; bills can be back-dated
- File: `services/cashBook.service.ts:88-95`, `:144-156`; `services/bill.service.ts:629-658`.
- Cash book movements only count payments of `CONFIRMED` bills. Cancelling a cash purchase bill removes the cash outflow from the drawer (the money went to the supplier, with no refund row). Cancelling a cash sale removes the inflow. Expected cash changes with no ledger entry, which hides or fakes a shortage.
- Purchase bill edit, cancel and delete never check purchase returns (see H4).
- `billDate` can be set to any past date by the client (`validations/bill.validation.ts:28-31` only forbids the future), so bills can be back-dated into closed days.

### M13. Day-close extras
- File: `services/dayClose.service.ts:59-72`, `:173-217`; `services/cashBook.service.ts:445-492`.
- Only the latest session per shop per day is shown (`sessions.find` over `openedAt desc`). If the counter was closed and re-opened the same day, the earlier session's cash, difference and deposit disappear from the branch view.
- `closeDay` takes an advisory lock, but bill creation and payments do not. A payment committed after `drawer()` is computed, with `paidAt < closedAt`, is missing from `expectedCash` and appears in later recomputations.
- `resolveDifference` has no conditional update (two admins can both accept) and accepts zero-difference days. It takes `actorId` and discards it (`void actorId`), so nobody is recorded as having accepted.
- `recordDeposit` (`BankDeposit`, branch level) and `cashBook.bankDeposit` (`CashEntry`, per shop) are two unlinked deposit records. They are never compared with each other or with `CounterSession.depositAmount`, and a branch deposit can be recorded for any amount.
- `supplierPays` is matched with `contains 'cash'` on `paymentMode` or `paidFrom` (`cashBook.service.ts:163-166`). Values such as "Cash credit account" or "cashless" are treated as cash.

### M14. Supplier payments and ledger
- File: `services/supplier.service.ts:264-351`, `:39-69`, `:233-242`.
- A payment against a bill reads `balanceDue` and then writes `amountPaid` and `balanceDue` as absolute values with no lock or version bump (`:270-306`). Two concurrent payments both pass the `amount > balanceDue` check, so the supplier is overpaid and the stored balance is wrong. `Supplier.payable` is a stored copy refreshed after the transaction (`:342-343`) and can be stale.
- Suppliers are tied to bills only by name (`billsOf`, `supplierName equals ... insensitive`). There is no foreign key, so a typo or rename on a bill splits the ledger and the payable. `createSupplier` checks the name case-insensitively but `@@unique([branchId, name])` is case-sensitive, and the check-then-create is racy.
- `getNextReceiptNumber` sorts `receiptNumber` as text. After `...9999` the next number is `...10000`, which sorts lower than `9999`, so the following call computes `10000` again and collides with the existing row. It is also race-prone (the unique index gives a 500, no retry).

### M15. Stock adjustment helpers
- File: `services/stockAdjustment.service.ts:53-92`, `:259`, `:97-137`.
- `getAdjustmentVariants` computes `searchFilter` and never uses it, so search does nothing and only the first 50 variants of the whole company are listed. The query has a hard-coded sample SKU (`'PRD0110-MAR-M'`) in its `ORDER BY` and is not limited to the shop.
- `approvalStatus` is only ever `AUTO` or `APPROVED`, never `PENDING`, so no real approval exists. `WRITE_OFF` records a movement with `prevPhysical == newPhysical` and `quantity = qty`. None of these adjustments update `Product.stockQuantity` (only `inventory.service` does), so product-level stock and inventory diverge.
- `getAdjustmentHistory` builds SQL by interpolating `branchId` and `query.limit` (`:101-136`). `branchId` comes from the signed-in scope. Unverified: whether `limit` is validated as a number in `validations/stockAdjustment.validation.ts`. If it is not, this is SQL injection.

### M16. Sales summary overstates net sales
- File: `services/bill.service.ts:1078-1183`.
- `netSales` and `taxAmount` add `totalAmount` of confirmed bills only. Credit notes are not subtracted, so "net sales" is really gross sales and the return rate is detached from it.

---

## LOW

- **L1. Return flow can refund twice for the same lines.** `store/orders.service.ts:330-391` computes `returnableQty` before the transaction, so two concurrent requests for the same item both pass. Admin `updateReturnStatus` (`order.service.ts:780-897`) lets `refundStatus` be set to `PROCESSED` repeatedly and in any order, and never re-validates `refundAmount`. `RETURNED` is set only when one request covers the whole order, so two part-returns that add up to the whole order never close it. Restock needs `restock: true` in the same call as `RECEIVED` or `COMPLETED`.
- **L2. Order dashboard revenue** (`order.service.ts:186-201`) counts a `RETURNED` order that is still `PAID` through the second branch. Admin `updateStatus` can mark a `PAID` online order `CANCELLED` and leave `paymentStatus` as `PAID` (no refund state).
- **L3. Money is stored as `Float`** in all bill, order, ledger and cash models (`prisma/schema.prisma`). Services round with `Math.round(v*100)/100`, but comparisons such as `data.amount > bill.balanceDue` still run on floats. Use `Decimal` or integer paise, and compare with a tolerance.
- **L4. Numbering mixes UTC and local dates.** Purchase bill, credit note and similar numbers use `toISOString().slice(0,10)` (UTC), while the financial year uses local `getMonth()`. In IST a bill saved between 00:00 and 05:30 gets the previous day in its number.
- **L5. Last-line discount share can go negative** (`bill.service.ts:384-391`): when the last line's net is 0 and rounding left paise in the pool, `pays = -0.01`.
- **L6. Exchange bill ignores the day-closed check** (`createExchangeBill`, `:795-855`). `ShopCustomer.creditLimit` is stored but never enforced at billing (only displayed, `customerDue.service.ts:93`), so credit sales can exceed the limit.
- **L7. Schema gaps that allow bad data** (`prisma/schema.prisma`):
  - No `CHECK` on `Inventory.physicalQty >= 0` or `reservedQty <= physicalQty`.
  - `CustomerCreditPayment.receiptNumber` and `StockAdjustment.adjustmentNumber` have no unique index, and their numbering schemes are count-based.
  - `CouponUsage` has no `@@unique([couponId, orderId])`. `ReturnRequest.returnItems` is JSON, so returned quantities cannot be enforced in the DB.
  - Missing foreign keys: `StockAdjustment` (`variantId`, `branchId`, `shopId`, `companyId`), `PurchaseReturn` (`branchId`, `purchaseBillId`, supplier by name only), `PurchaseBill.supplierName` (free text), `SalesBillPayment.receivedById`, `CustomerCreditPayment.receivedById`, `CashEntry.createdById`, `CounterSession.openedById` and `closedById`, `StockMovement.performedById`.
  - No partial unique index to guarantee one open `CounterSession` per shop (only an advisory lock, `counter.service.ts:19`).
  - `Order.orderNumber` is unique but built from 3 random bytes per day (checkout) or 5 base36 chars (legacy). A collision returns a 500 instead of a retry.
  - `ShopCustomer` is tied to bills only by the `mobile` string (no customer id on `SalesBill`).
- **L8. Dead and duplicate code.** Stock adjustment is implemented three times (`inventory.service.ts`, `stock.service.ts`, `stockAdjustment.service.ts`), and `stock.service.ts` also writes a physical audit with a hard-coded `AUD-26-27` financial year. `Inventory.reservedQty` is read but never incremented. `PurchaseReturn.takeStockFrom` and `Order.discount` are write-only. `purchase.findByNumber` in `bill.controller.ts:31-39` fetches sales bills.
- **L9. Misc.** `confirm`, `cancel`, `delete` and `recordPayment` call `lock()` without a version, so a stale client can cancel a bill it has not reloaded. `exportSales` returns up to 5000 bills silently. `credit.service.getMetrics` and `getCustomersWithDue` run one query per customer (N+1).

---

## Duplicate order paths (summary)

| Path | Where | Status |
|---|---|---|
| Store checkout (Razorpay, per-shop split, coupon share, GST) | `services/store/checkout.service.ts`, `routes/store.routes.ts` | Intended path |
| Legacy checkout | `order.service.createCustomerOrder`, `POST /users/orders/checkout` | Insecure, see H3 |
| Store cancel (instant for unpaid) | `store/orders.service.ts:287` | OK, but see M3, M5 |
| Legacy cancel request | `order.service.requestCustomerCancellation` | Duplicate, no auto-cancel |
| Store return (per line, window check) | `store/orders.service.ts:330` | OK except the L1 race |
| Legacy return | `order.service.requestCustomerReturn` | Refunds full total, no checks |

## Verified as handled correctly (no bug found)

- Sales and purchase bill stock posting uses the atomic guarded decrement in `inventoryService.applyStockChanges`. Edits post only the difference, cancel and delete reverse the posted lines, and the bill row is locked through `lock()` (version bump). Oversell is prevented for bills, orders and transfers.
- Credit note quantity checks run under a bill lock, and edit, cancel and delete of a bill with non-rejected notes is blocked (`assertNoReturns`).
- Day-close `closeDay` is idempotent through `updateMany ... closedAt: null`. Counter open is serialised by an advisory lock.
- Stock transfer approve, dispatch and receive are idempotent through status-conditional `updateMany`.
- Order status transitions are table-driven (`NEXT_STATUS`) and cancelled orders cannot be reopened. The gaps are M1 and M2.
