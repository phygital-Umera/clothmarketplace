# Who Manages What, Which Products Show, Where Stock Lives

This page explains three things people find confusing in this app:

1. Who (company, branch, shop, employee) is allowed to manage what.
2. Which products appear on each screen, including the customer store.
3. Where stock is kept, what changes it, and which number each screen shows.

It also explains why customers sometimes see products that are not really available, and lists suggested fixes in priority order.

Everything here was read from the code in November 2026 (branch `feat/company-admin-shop-mode`). Nothing was changed. Items marked *unverified* were inferred from code but not run.

---

## 1. The model in one picture

```
Company (owner, role ADMIN)
 └─ Branch (role SUB_ADMIN, optional; a company with no branches gets one automatic "Main Branch")
     └─ Shop (role SHOP_ADMIN; employees, role EMPLOYEE, belong to one shop)
         └─ Product  (belongs to ONE shop: Product.shopId)
             └─ Variant (one size × colour: ProductVariant)
                 └─ Stock (one Inventory row per branch + variant)
```

Four rules explain most of the app's behaviour:

| Rule | What it means in practice |
|---|---|
| **A product belongs to one shop.** | Two shops that sell "the same" kurti have two separate products, two sets of variants and two stock numbers. A shop can only sell its own products at the POS (`bill.service.ts:131-137`). |
| **Stock is stored per branch, but is really per shop.** | `Inventory` is keyed by (branch, variant). Because a variant belongs to one shop's product, each shop effectively has its own stock. Two shops in one branch never share a number. |
| **The real stock number is the `Inventory` table.** | `Product.stockQuantity` is only a cached copy and is often wrong (see §4.3). The POS and the store read `Inventory`. |
| **A product shows online only if it has a shop.** | The store lists products that are PUBLISHED, not deleted, and whose shop and company are ACTIVE (`store/catalog.service.ts:56-61`). |

The company admin can also open one of their shops in **shop mode** ("Sell in my shop"). The company admin then works as that shop's admin, while the audit log records them as the company admin.

---

## 2. Who manages what

### 2.1 Today (from the code)

V = view, C = create, E = edit, D = delete, A = approve. "Shop mode" means the company admin, working inside one shop. "mod X" means the employee needs module X turned on.

| Thing | Super admin | Company admin | Branch admin | Shop admin | Employee |
|---|---|---|---|---|---|
| Company | C / E / D, all companies | V own | – | – | – |
| Branches | V all | C / E / on-off | E own contact and hours | – | – |
| Shops | V all | C / E / on-off; shop mode | C / E in own branch | – | – |
| Staff logins | Block anyone | C / E employees in any shop | Invite, approve, move between shops | C / E own employees, or request from branch | – |
| Brands | C / E global | C / E company brands | View | – | – |
| Categories, sizes, colours | Global categories | Shop mode only | (via the shop API, see §6) | **C / E / D for the whole company** | mod masters |
| Products | Unpublish only | C catalog products (no shop); E / D any product | C catalog products; E own-branch ones | C / E / D own shop's products | mod products (incl. delete) |
| Selling price | – | Any product | Branch "Products & Prices" overwrites all its shops' prices | Own products | mod products |
| Publish online | Unpublish | With checklist (photo, price, variant) | With checklist | **Plain status field, no checklist** | mod products |
| Stock adjust | – | Any branch | 3 different screens | 3 different screens | mod stock |
| Purchase bills, suppliers | – | Shop mode | View only; suppliers C | C / E / D / pay | mod purchase |
| Stock transfers | – | **Cannot approve** | Approve / reject | Request, send, receive (same branch only) | mod stock |
| POS sales bills | – | Shop mode | View, export | C / E / D | mod billing (incl. delete) |
| Refunds (credit notes) | – | Shop mode: auto-approved; approves staff refunds | Approves cash / over-limit refunds | Create; cannot approve | mod billing |
| Online orders and returns | V all | Update, company | Update, branch | Update, own | mod orders |
| Promotions | (API only) | C / E / D company-wide | (API only, no menu) | (API only, no menu) | – |
| Customers and credit limits | – | Shop mode | View dues; edit limit | C / E / collect | mod customers |
| Expenses | – | Shop mode | C (split across shops) | C own | mod accounts |
| Cash book, day close | – | Shop mode | Review, resolve, bank deposit | Close own day | mod accounts |
| Reports | Counts only | **Counts only, no sales or P&L report** | P&L | Shop P&L | mod reports |
| Audit log | Nobody can read it | – | – | – | – |

### 2.2 Where the confusion comes from

- **The same thing is managed at several levels, with different rules.**
  - *Products:* the company, branch and shop all edit the same product. Delete is "company only" in the catalog but allowed for shops and employees on the shop path. Publishing has a checklist in the catalog but not in the shop.
  - *Prices:* set in three places: the shop product form, branch "Products & Prices" and the company catalog.
  - *Stock adjustment:* three separate code paths and screens (`inventory.service`, `stock.service`, `stockAdjustment.service`).
  - *Staff onboarding:* four paths: company direct, shop direct, shop request → branch approval, branch invite. The shop's direct path skips the approval its own request path needs.
  - *Module access:* three editors with different module lists. The branch invite shows 10 modules, but the backend keeps only 6 (`staff.service.ts:224`).
  - *Refund approval:* two branch endpoints. Only one of them is audited.
  - *Masters (categories, sizes, colours):* edited from the **shop** panel, but they are **company-wide** (`master.service.ts:20-27`). One shop renaming "XL" changes it for every shop. The super admin's global categories are a separate list.
- **Two kinds of product** (see §3.1). Company and branch admins create products that can never be sold.
- **Online orders have no single owner.** The company, branch, shop and employees can all change the same order.
- **Menu text promises things that don't exist.**
  - Approvals: "Discounts, credit, refunds and cancellations"; only refunds exist.
  - Staff & Rights: "discount, credit and more".
  - Branch Stock Transfers: "Move stock between your shops"; the branch can only approve.
  - Company Profile: "Name, address, GST and logo on bills"; the page is read-only.
- **Menu items that fail.**
  - Branch "Purchase Return" always calls the shop API and gets 403 (`PurchaseReturnPage.tsx:24`).
  - Header "My Profile" sends company admins, super admins and employees to `/branch-admin/my-profile` ("Access denied") (`Header/DropdownUser.tsx:31-34`).

---

## 3. Which products show where

### 3.1 Two kinds of product

| Kind | Created in | `shopId` | Sold at POS? | Shown online? | Stock |
|---|---|---|---|---|---|
| **Shop product** | Shop → Products (or shop mode) | the shop | Yes | Yes, when PUBLISHED | The shop's branch `Inventory` |
| **Catalog product** | Company or Branch → Products | **empty** | **No** | **No, never** | Stock added goes to the company's first branch, where no one can sell it |

Catalog products are a dead end: they can be published, but no screen sells them. The company menu says "Products of all your shops", which suggests otherwise.

### 3.2 What each screen lists

| Screen | Products listed | Status filter |
|---|---|---|
| Company → Products | Every product in the company (shop and catalog) | All |
| Company → Inventory | Every product in the company; stock comes from one branch's row, not a total | All |
| Branch → Inventory | Every product in the **company**, with this branch's stock (other branches' products show 0) | All |
| Shop → Products | The shop's own products | All |
| Shop → Stock | **Every variant in the company**, including other shops', deleted products and inactive variants | All |
| POS item picker | The shop's own active variants with stock | **Ignores status**: draft or unpublished products can be billed |
| Customer store | PUBLISHED products of ACTIVE shops of ACTIVE companies, **from every company** (it is a marketplace) | PUBLISHED only |

---

## 4. Where stock lives and what moves it

### 4.1 What changes stock

All of these use the safe engine `applyStockChanges` (`inventory.service.ts:71-151`), unless marked ⚠. That engine is atomic, logs a stock movement and refuses to go below zero.

| Event | Effect on stock |
|---|---|
| Purchase bill confirmed / edited / cancelled | In / difference / back out (blocked if already sold) |
| POS bill confirmed / edited / cancelled | Out / difference / back in |
| Refund (credit note) approved, "restock" | Back in. ⚠ "Damaged" changes nothing, so the units vanish from all counts |
| Stock transfer | Nothing on request or approval; out of the sending shop on dispatch; into the receiving shop on receive. Short-received units vanish |
| Online order placed | **Out immediately**, for both COD and online payment, before payment |
| Online order cancelled | Back in, once |
| Online return | Back in only if staff tick "restock" |
| ⚠ Manual adjust (3 paths) | **Overwrites** the number. 2 of the 3 paths have no transaction or lock |
| ⚠ Purchase return (debit note) | Direct write, no movement logged; does nothing when not linked to a bill |
| Product created with "Stock Quantity" | **Nothing.** See §4.3 |

There is no stock reservation: `reservedQty` is never written, so it is always 0.

### 4.2 Which stock number each screen shows

| Screen | Number shown | Correct? |
|---|---|---|
| POS item picker | Live `Inventory` for the shop's own variants | ✅ |
| Customer store | Live `Inventory` of the product's shop's branch, per size | ✅ |
| Shop dashboard | Per-shop figures | ✅ |
| Shop → Products list and detail | `Product.stockQuantity` (cached copy, or the typed-in value) | ❌ often wrong |
| Shop → Stock page | Starts from **hard-coded demo totals** (1,560 pcs, ₹9.8 L, `stock.service.ts:180-186`) plus hard-coded rows for 6 demo barcodes (`:130-141`) | ❌ fake numbers |
| Company → Products | Sum over all branches | ✅ for shop products |
| Company / Branch → Inventory | One branch's row per variant; branch view lists the whole company | ⚠ misleading |
| Branch dashboard | Sum over every row, including deleted products | ⚠ too high |

### 4.3 The "Stock Quantity" field on the shop product form is not real

- The shop product form makes you type a **Stock Quantity** (`shopProductSchema.ts:39`). It is saved only onto the product row (`shopProduct.service.ts:276`). No `Inventory` row is filled and no movement is logged.
- So right after creating a product:
  - The shop's product list says, for example, 10 in stock.
  - The POS shows 0 and refuses to bill it.
  - The store shows "Out of stock".
- Later, saving the edit form with an old value overwrites the cached number again, while the real stock is different.

---

## 5. Why customers see products that are not really available

There is **no mock data or caching** in the store app. Every product comes from the API, so the causes are in the rules and the data. They are ranked most likely first.

| # | Cause | How to reproduce | Smallest fix |
|---|---|---|---|
| 1 | **Panel stock and store stock are different numbers.** The panel shows the typed "Stock Quantity"; the store reads `Inventory` (§4.3). | Create a product with Stock Quantity 10, Published. The panel shows 10; the store shows Out of stock. | Remove the field from the form and the API. Show stock from `Inventory`, as Company → Products already does (`product.service.ts:70-75`). |
| 2 | **Demo or other companies' products are listed.** The store is a marketplace with no company filter, and `npm run seed:demo` creates a whole demo company with published products. A company admin never sees these in their own panel. | Run the demo seed and open the store. | On real environments run `npm run seed:demo -- --remove`. |
| 3 | **A product made in Company → Products never shows** (no shop). | Create and publish a catalog product; it is not in the store. | Remove "Add product" from the company and branch panels, or add a required shop picker. |
| 4 | **A switched-off branch still sells online.** The store never checks branch status, while the panel hides those shops. | Deactivate a branch. Its shops' products stay listed and can be ordered. | Add `branch: {status: 'ACTIVE', deletedAt: null}` to the `LISTED` rule (`catalog.service.ts:56-61`). |
| 5 | **Wishlist and bag use weaker checks than the listing.** | Suspend a company. Its products leave the listing, but "Move to bag" from the wishlist still works and checkout places the order. | Use the one `LISTED` rule in cart add (`customer.service.ts:221-239`), bag lines (`:93`) and wishlist (`:341`, `:350`). |
| 6 | **Renaming a product changes its link.** The slug is rebuilt on rename or SKU change (`shopProduct.service.ts:348`). | Copy a product URL, rename the product, open the URL: "This product is not available". | Keep the slug from creation; don't rebuild it on update. |
| 7 | **Stock added to the wrong shop.** Stock adjustments check only the company, not the shop. | Shop A adjusts shop B's variant (the picker lists all company variants). Shop B's item then shows stock it doesn't hold. | Limit all adjust paths to `product.shopId = own shop`. |
| 8 | **Stock transfers create published copies.** When a shop receives an item it doesn't carry, the product is copied with the source's PUBLISHED status (`stockTransfer.service.ts:526-544`). | Receive a transfer of a new item. A duplicate product card appears online straight away. | Create the copy as DRAFT. |
| 9 | **Unpaid online orders hold stock forever.** Stock leaves when the order is placed, and nothing expires unpaid orders. | Start an online-payment checkout and abandon it. The stock never comes back. | A small job that cancels unpaid orders after, say, 30 minutes, using the existing cancel-and-restock code. |
| 10 | **Open store tabs never refresh.** `refetchOnWindowFocus: false` (`user/src/main.tsx:11`). | Leave the home page open, unpublish a product, then click it: not available. | Turn refetch-on-focus on for the home, listing and search queries. |
| 11 | **Out-of-stock items are shown everywhere**, only greyed out. "New arrivals" and search suggestions don't put in-stock items first. | Sell out an item; it stays on the home page. | Sort in-stock first in those two queries (`catalog.service.ts:502, 527`). |

Ruled out: backend caching, persisted or mocked frontend data, service workers, and a wrong server URL.

---

## 6. Other bugs found

**Security and scope**
- `/shop-admin` also accepts **super admin and branch admin** without opening a shop (`shopAdmin.routes.ts:178`).
  - The super admin gets an empty scope there, so it can change any order's status or payment, list every employee on the platform, and adjust stock in any branch.
  - The branch admin can create, rename and delete company-wide masters.
- A shop can view and change other shops' data:
  - Stock: adjust another shop's items.
  - The Stock page: every company product with cost.
  - Suppliers: see and pay other shops' purchase bills.
  - Barcode labels: all branch bills.
- An employee with billing edit can **delete a confirmed sales bill** without approval. The stock goes back and the sale disappears, while a refund of the same size would need approval.
- A branch admin's right to edit a product follows the creator's **current** branch (`product.service.ts:58`), so moving an employee moves edit rights over their products.
- 20 controllers write without an audit entry: orders, stock, promotions, suppliers, pricing, expenses, credit limits and others.

**Stock and data**
- Stock adjustment numbers are counted per branch, but the database id must be unique system-wide (`stockAdjustment.service.ts:44, 256`). The second branch to reach a number fails *after* stock was already changed (*unverified*, inferred from code).
- Purchase return ignores "take stock from", double-removes damaged goods, and writes no movement. A purchase bill can be cancelled after a debit note, so the stock comes out twice.
- Renaming a size or colour master and then saving a product turns off the old variants, along with their stock, and creates new ones at 0 (`shopProduct.service.ts:215-248`).
- Approving a cancel request after dispatch puts stock back while the goods are with the courier.
- Online exchanges never take the replacement size out of stock.
- The company admin cannot approve stock transfers, so in a branch with no branch admin (such as the automatic Main Branch) requests stay stuck.

**Dead and leftover code**
- 190 catering-app files in `frontend/src/components/`.
- Unused pages: `BranchSuppliersPage`, `BranchDashboard`, `ComingSoon`, `BranchProfile`.
- Pages with no menu entry: branch `stock`, `stock-adjustment`, `promotions`; shop `promotions`.
- Unused permission strings (`config/permissions.ts:84-97`).
- A fake fallback debit-note number (`purchaseReturn.ts:18`).

---

## 7. Suggestions

### 7.1 A simple rule for "who manages what"

Make each job belong to exactly one level and let the other levels only view it:

| Level | Owns | Only views |
|---|---|---|
| **Company admin** (owner) | Branches, shops, all logins, brands, **categories, sizes and colours**, promotions, company reports. Approves when there is no branch admin. Works inside a shop through shop mode. | Everything below |
| **Branch admin** (supervisor) | Approvals (refunds, transfers), suppliers, day close review, branch reports | Its shops' bills, stock, products, prices |
| **Shop admin** | Products, prices, photos, publishing, purchase bills, POS, returns, customers, cash book, its own employees | Masters (read-only) |
| **Employee** | Whatever modules are turned on, inside its shop. Never deletes confirmed bills. | – |

With this split:
- Masters move out of the shop panel into the company panel. Shops pick from them.
- Company and branch stop creating products. Products are always created inside a shop; the company admin uses shop mode.
- Online orders belong to the shop that sells them. The branch and company watch.
- Prices are edited only by the shop. Branch "Products & Prices" becomes a view, or a bulk tool that clearly says which shops it changes.

### 7.2 One stock number, one "show online" rule

- **Stock = the `Inventory` table, nothing else.**
  - Remove the typed "Stock Quantity".
  - Show `Inventory` everywhere.
  - Merge the three adjust paths into the one safe engine.
  - Remove the hard-coded numbers from the Stock page.
- **Shown online** = PUBLISHED, not deleted, shop and **branch** and company ACTIVE, at least one active variant. Define it once (`LISTED`) and use it for the listing, detail, cart, bag and wishlist.
- **Opening stock:** the product form can offer "Opening stock" that posts a real movement through `applyStockChanges`, or tell the user to add stock with a purchase bill.

### 7.3 Fix order

**Now: wrong numbers, wrong products online, security**
1. Remove the hard-coded demo numbers and rows from `stock.service.ts` and `stockAdjustment.service.ts`.
2. Remove the typed "Stock Quantity"; show real stock on the shop product list and detail.
3. One shared `LISTED` rule with the branch check, used by cart, bag and wishlist too (§5 #4, #5).
4. Stock adjustments: only your own shop's products; one transaction; a unique id.
5. `/shop-admin`: allow only shop admins and the company admin in shop mode. First check which branch-admin pages call it (masters lists, Purchase Return).
6. Run `npm run seed:demo -- --remove` on any shared environment.

**Next: the confusion**

7. Remove "Add product" from the company and branch panels, or add a shop picker. Show existing catalog products as "Not in any shop".
8. Move categories, sizes and colours to the company panel; shops read only.
9. Stable product links (don't rebuild the slug).
10. Shop Stock page shows only the shop's own items.
11. Transfer copies start as DRAFT.
12. Company admin can approve stock transfers when the branch has no branch admin.
13. Fix the menu text (§2.2) and the two broken links (branch Purchase Return, header My Profile).
14. Expire unpaid online orders and put their stock back.

For fake data, tax rates and other hard-coded values, see [hard-coded-values.md](hard-coded-values.md). Its "Fix first" list overlaps with items 1 and 4 above.

**Later**

15. Purchase return fixes; record damaged stock properly (credit note "damaged", transfer shortages).
16. Approval for deleting confirmed bills; audit entries for all writes; an audit log page.
17. Company sales and P&L report.
18. Delete the catering leftovers and unused pages and permissions.
