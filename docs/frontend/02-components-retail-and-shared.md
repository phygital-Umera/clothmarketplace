# 02 - Components: Retail Features and Shared UI Kit

Audience: beginners. All paths are inside `frontend/src/components/`.
Everything below was read from the code. Where a claim says "used" or "unused", it comes from searching for imports across `frontend/src` (pages, routes, layouts and other components).

---

## 1. How the components folder is organised

A "component" is a reusable piece of screen written as a function that returns HTML-like JSX. Pages (in `src/pages/`) are assembled from components.

The folder holds **three families**:

| Family | What it is | Examples |
|---|---|---|
| **Retail / ERP feature components** (current) | Modals, forms, badges and tables for the cloth shop POS, orders, stock, promotions and the company/branch/shop/employee hierarchy. | Bills, CreditNotes, Orders, Inventory (partly), Promotions, Org, Company, ShopProduct, Catalog, Customers |
| **Shared UI kit** (current) | Small generic building blocks reused by many screens. | Forms, ui, Header, Sidebar |
| **Legacy catering-app leftovers** | Code from an earlier catering/event-management product (dishes, events, caterers, utensils, vendors, QR feedback). Mostly no longer reachable. | Admin, Customer, client, Staff, Profile, Settings, Update, Feedback, QrCode, NewData, Select, Breadcrumbs, Icons, common, parts of Forms |

Other folders in `components/` that are **outside this document's scope** and are catering leftovers: `Caterer, CaterorDisposal, CaterorSetting, CaterorUtensils, Dish, Disposal, Event, IncomeExpenditure, Language, Maharaj, NotificatioinDishes, Priority, Process, Quatation, Utensils, Vendor`.

Common conventions in the current code:

- **`panel` prop** (a string such as `shop-admin` or `branch-admin`): tells hooks which API area to call. The same component is reused by shop screens and branch screens by passing a different panel.
- **Server data** comes through React Query hooks in `@/lib/react-query/queriesAndMutations/...` (for example `useBill`, `useInventory`). Components rarely call the API directly (one exception: `Customers/OnlineBuyers.tsx`).
- **Forms** use `react-hook-form` plus `zod` validation, wrapped in `FormProvider` so the `Generic*` fields find the form automatically.
- **Look and feel** uses Tailwind classes with a design theme: `burgundy`, `espresso`, `ivory`, `outline`, `font-serif`, `text-label-caps`. Older legacy files use a different Tailwind admin-template theme (`stroke`, `strokedark`, `meta-4`, `bg-primary`), which is a quick way to recognise them.
- **Roles** (from `@/lib/roles`): `SUPER_ADMIN` (platform owner), `ADMIN` (company admin), `SUB_ADMIN` (branch admin), `SHOP_ADMIN` (shop owner/manager), `EMPLOYEE` (staff), `USER` (online customer).

---

## 2. Retail and ERP feature folders

### 2.1 Bills (`Bills/`)

Sales and purchase bills at the counter. Both kinds share the same screens: the `kind` prop is a `BillKind` (sales or purchase).

| File | What it renders / does | Main props / hooks | Where used |
|---|---|---|---|
| `BillFormModal.tsx` (953 lines, the biggest) | Big modal to **create or edit a bill**: pick customer/supplier, search and add stock items, quantity, per-line discount (sales only), GST rate (0/5/12/18), bill discount, round-off, "paid now" amount and payment mode, due date, notes. Checks available stock. | `panel`, `kind`, `bill?` (edit if given), `onClose`. Hooks: `useSaveBill`, `useInventory`, `useMemo` for totals | `shop/bills/BillsPage`, `shop/dashboard/ShopDashboard` |
| `BillDetailsModal.tsx` | Read-only view of one bill: party, payment, items, taxable value, GST, round-off, discount, subtotal, cancellation info, linked stock movements. | `panel`, `kind`, `billId`, `onClose`. Hooks: `useBill`, `useStockMovements` | `BillsPage`, `ShopDashboard`, `branch/BranchSalesBillsPage` |
| `RecordPaymentModal.tsx` | Take a payment against an outstanding bill (customer udhaar or supplier dues): choose bill, amount, mode, note. | `panel`, `kind`, `party`, `bills[]` (first preselected), `onClose`. Hook: `useRecordPayment` | `BillsPage`, `ShopDashboard` |
| `CounterModals.tsx` | Two small modals: **OpenCounterModal** (opening cash in the drawer) and **ExpenseModal** (category, amount, paid by, notes). | `panel`, `onClose`. Hooks: `useOpenCounter`, `useCreateExpense` | `shop/accounts/CashBookPage`, `ShopDashboard` |
| `BillStatusBadge.tsx` | Coloured pill for a bill status. Also exports `SalesStateBadge`, `salesStateOf`, `salesStateLabel`, which derive PAID / PART_CREDIT / CREDIT / EDITED. | `status` or `bill` | `BillsPage`, `BranchSalesBillsPage` |
| `PaymentStatusBadge.tsx` | Pill for payment status (also a RETURN state). | `status` | `BillsPage`, `ShopDashboard` |

**What the user sees / can do:** a shop owner or cashier opens "New Bill" and gets a large modal to scan or search items and bill the customer (with GST and discounts), part-pay or leave the rest on credit, later record payments, open the counter with starting cash, and log shop expenses. Anyone can open a bill to see exactly what was sold and which stock moved. `utils/exportSalesExcel.ts` also imports from this folder.

### 2.2 CreditNotes (`CreditNotes/`)

Sales returns. A return produces a "credit note" that may need branch approval.

| File | What it renders / does | Main props / hooks | Where used |
|---|---|---|---|
| `NewReturnModal.tsx` | Modal: type a sales bill number, load what can still be returned, choose quantity per line, reason, what the customer wants, refund mode, where returned stock goes, reason note. Shows "Needs branch approval" when the amount exceeds `APPROVAL_LIMIT = 2000`. | `open`, `onClose`, `billNumber?` (preloads). Hooks: `useReturnableBill`, `useCreateCreditNote`. Uses `ui/Overlay` | `BillsPage`, `ShopDashboard`, `shop/returns/ShopSalesReturnsPage` |
| `CreditNoteTable.tsx` | Paged list of credit notes (credit note no, bill, reason, settlement, amount). | `notes`, `loading`, `error`, `selectedId`, `onSelect`, `showShop?`, `pagination`, `onPageChange` | `ShopSalesReturnsPage`, `branch/BranchSalesReturnsPage` |
| `CreditNoteDetail.tsx` | Side panel with one note's facts (bill, reason, GST reversed, stock destination). A branch admin can approve or reject with a comment. | `note`, `canDecide?`. Hook: `useDecideCreditNote` | same two pages |
| `CreditNoteBadges.tsx` | `CreditNoteStatusBadge` plus helpers `settlementText`, `itemsText`. | `status` / `note` | inside this folder |

**User view:** shop staff start a return from a bill row or from the Returns page. Small returns go through at once; large ones wait until a branch admin approves in the detail panel.

### 2.3 Orders (`Orders/`)

Online-store orders (website customers) as seen by shop and branch staff.

| File | What it renders / does | Main props / hooks | Where used |
|---|---|---|---|
| `OrderDetailsModal.tsx` | Full order view: items, coupon discount, payment mode, shipping and tracking, download Tax Invoice PDF. Has buttons that open the modals below. | `panel`, `order`, `isOpen`, `onClose`, `onRefresh?` | `orders/ShopOrdersPage` |
| `OrderStatusUpdateModal.tsx` | Move an order to the next allowed status (`NEXT_STATUS` map), with comment and courier/tracking when shipping. | `panel`, `order`, `isOpen`, `onClose`, `onSuccess?`. Hook: `useUpdateOrderStatus` | `ShopOrdersPage` |
| `ShippingModal.tsx` | Enter courier (a common list is built in) and tracking number. | same shape. Hook: `useUpdateOrderShipping` | `ShopOrdersPage` |
| `CancellationReviewModal.tsx` | Approve or reject a customer's cancellation request with a reason. | Hook: `useReviewCancellation` | `ShopOrdersPage` |
| `ReturnReviewModal.tsx` | Manage a customer's return request: status steps, refund status, notes, restock tick-box. | Hook: `useUpdateReturnStatus` | `ShopOrdersPage` |
| `OrderStatusBadge.tsx` | Coloured status pill (`size` sm/md). | `status`, `size?` | `ShopOrdersPage`, `customer/MyOrdersPage` |
| `PaymentStatusBadge.tsx` | Payment status pill (a different file from the Bills one, do not mix them up). | `status`, `size?` | `ShopOrdersPage`, `MyOrdersPage` |

**User view:** staff see online orders, open one, confirm/pack/ship it (courier + tracking), handle cancellation and return requests, and download the invoice. Customers only see the two badges on their own "My Orders" page.

### 2.4 Inventory (`Inventory/`)

Stock levels, adjustments and history.

| File | What it renders / does | Main props / hooks | Where used |
|---|---|---|---|
| `BatchStockModal.tsx` | Add (INWARD) or remove (OUTWARD) stock for many variants at once, with reason and reference. | `isOpen`, `mode`, `panel`, `targetProduct?`, `onClose`, `onSuccess?`. Hooks: `useInventory`, `useBatchAdjustStock` | `ecommerce/InventoryList` |
| `ProductVariantsModal.tsx` | Table of a product's variants: physical, reserved, available, threshold, status; buttons for inward / outward / history / threshold. | `isOpen`, `product`, `canAdjust?`, four click callbacks | `InventoryList` |
| `ProductHistoryModal.tsx` | Paged list of stock adjustments for a product ("Stock Flow"). | `isOpen`, `product`, `panel`, `onClose`. Hook: `useStockMovements` | `InventoryList` |
| `ThresholdModal.tsx` | Set the low-stock alert level of a variant. | `target`, `panel`, `onClose`, `onSuccess?`. Hook: `useUpdateThreshold` | `InventoryList` |
| `InventoryDashboardView.tsx` | Cards (Total Products, Total Stock, In Stock, Low Stock, Out of Stock) plus "Stock Alerts" and "Recent Stock Adjustments". | `panel`. Hook: `useInventoryDashboard` | **No page imports it** |
| `StockAdjustModal.tsx` | Adjust one variant (action, quantity, reason, notes; shows physical/reserved/available). | `target`, `panel`, `onClose`, `onSuccess?` | Only by `InventoryDashboardView`, so effectively unused |
| `StockMovementsView.tsx` | Searchable paged list of all stock movements. | `panel` | **No page imports it** |
| `Inventory.tsx`, `UpdateInventory.tsx`, `AddInventory.tsx` | Old table, quantity-edit form, and a placeholder (`<div>AddInventory</div>`). | `useGetInventoryData`, etc. | **Legacy, not used** |

**User view:** on the Inventory page a manager opens a product, sees each size/colour variant's stock, can receive or remove stock, set low-stock alerts and read the history. Only the first four files are live.

### 2.5 Promotions (`Promotions/`)

Discount offers and coupon codes. All four files are used only by `promotions/PromotionsPage`.

| File | What it renders / does | Main props |
|---|---|---|
| `OfferFormModal.tsx` (642 lines) | Create/edit an offer: name, description, dates, discount type and value, min order, max discount, which categories / subcategories / products it applies to, banner image, active switch. Loads masters via `useCategories`, `useMasterSubcategories`, `useProducts`. | `isOpen`, `offer?`, `panel`, `onClose`, `onSuccess?` |
| `OfferDetailsModal.tsx` | Read-only offer card with banner, discount, min order, max limit, and an "Edit" button. | `offer`, `onClose`, `onEdit?` |
| `CouponFormModal.tsx` | Create/edit a coupon: code, name, dates, discount type, limits, banner, "Enable Coupon" switch. | `isOpen`, `coupon?`, `panel`, `onClose`, `onSuccess?` |
| `CouponValidateModal.tsx` | "Test Coupon Discount": type a code and simulate the checkout discount (`useValidateCoupon`). | `isOpen`, `panel`, `initialCode?`, `onClose` |

**User view:** a manager creates store-wide offers and coupon codes, previews them, and can test a code before customers use it.

### 2.6 Org (`Org/`) - company hierarchy forms

Shared by Super Admin, Company Admin and Branch Admin screens for branches, shops, employees and users.

| File | What it renders / does | Main props / hooks | Where used |
|---|---|---|---|
| `Editors.tsx` | Exports `BranchEditor`, `ShopEditor`, `EmployeeEditor`: load the record (if `id`), show the form inside an `EditorPanel`, save. | `id?`, `onDone` (`ShopEditor` and `EmployeeEditor` also take `panel`). Hooks: `useBranch/useSaveBranch`, `useShop/useSaveShop`, `useEmployee/useSaveEmployee` | `org/BranchList`, `ShopList`, `EmployeeList` |
| `BranchForm.tsx` | Fields: name, email, phones, pincode (auto-fills state/district/city), address, opening/closing time, weekly holidays, optional admin login. | `BranchFormProps`; uses `usePincodeAutofill` | via `Editors` |
| `ShopForm.tsx` | Fields: branch, name, email, phone, address, GSTIN, bill prefix, hours, status, shop login, notes. | `ShopFormProps` | via `Editors` |
| `EmployeeForm.tsx` | Employee details, work info (branch, shop, role, job title, department, joining date), login and module access. | `EmployeeFormProps`; `useBranchOptions`, `useShopOptions` | via `Editors` |
| `ModuleAccessField.tsx` | Per-module access-level picker (form field `permissions`). | `name?` | `EmployeeForm` |
| `EditorPanel.tsx` | Titled frame with loading/error states for forms shown above a list. | `title`, `loading?`, `error?`, `onCancel`, `children` | `Editors` |
| `ListToolbar.tsx` | Status tabs + extra filters + search box. Also exports `FilterSelect`. **One of the most reused files** (about 16 pages). | `tabs?`, `tab?`, `onTab?`, `searchText`, `onSearch`, `placeholder`, `children?` | BillsPage, ProductList, BrandList, master pages, Org lists |
| `useAccountActions.tsx` | Hook returning row actions Activate / Deactivate / Block / Revoke sessions plus a confirm dialog (reason required for deactivate/block). | `panel` | `org/EmployeeList`, `UserList` |

**User view:** admins add or edit a branch, shop or employee in a panel above the list, search and filter lists by status, and block or unblock logins. Forms ask "Discard changes?" when you leave with unsaved edits.

### 2.7 Company (`Company/`)

Client companies (tenants) managed by Super Admin.

| File | What it renders / does | Main props | Where used |
|---|---|---|---|
| `CompanyForm.tsx` | Create/edit form: admin details, company name/email/phone, logo upload, location with pincode autofill, status. | `mode`, `defaultValues?`, `existingLogo?`, `hasAdminLogin?`, `adminFirst?`, `onSubmit`, `onCancel` | `companies/CompanyFormPage` |
| `CompanyDetailsDrawer.tsx` | Right-side drawer: contact, location, administrator, created/updated; Edit and Delete buttons (permission-checked). | `company`, `onClose`, `onDelete` | `CompanyList`, `SuperAdminDashboard` |
| `CompanyAvatar.tsx` | Logo or initials circle. | `company` | list / drawer |
| `StatusBadge.tsx` | Re-export of `ui/StatusBadge`. | | |
| `format.ts` | `formatDate(iso)` helper. | | |
| `index.ts` | Barrel exporting the four components and `formatDate`. | | `myCompany/MyCompany`, org lists |

**User view:** a platform owner adds client companies with their admin login and logo, opens a drawer to view details, then edits or deletes.

### 2.8 ShopProduct (`ShopProduct/`) and Catalog (`Catalog/`)

`ShopProduct` is for the shop owner's own products; `Catalog` is for the shared catalog (super-admin/company panels).

| File | What it renders / does | Main props / hooks | Where used |
|---|---|---|---|
| `ShopProduct/ShopProductImages.tsx` | Image gallery: upload, set main, remove, "clean white background", and AI professional photo (Ghost 3D, Mannequin, Model). Max 8 images. Also exports `PendingImages` (pick files before the product is saved). | `product`, `editable?`; hooks `useShopProductImages`, `useAiStatus` | `ShopProductDetail`, `ShopProductForm` |
| `ShopProduct/AiColorPreview.tsx` | Generates AI previews of the product in its colours; regenerate or remove. | `product`, `editable?`; hook `useShopProductPreviews` | `ShopProductDetail` |
| `ShopProduct/ChipMultiSelect.tsx` | Pick several options (for example colours, with swatch) as chips, bound to a form field. | `name`, `label`, `options`, `loading?`, `required?`, `emptyHint` | `ShopProductForm` |
| `ShopProduct/useProductMasters.ts` | Hook loading active categories, subcategories, colours and sizes (limit 100). | none | `ShopProductForm`, `ShopProductList` |
| `Catalog/ProductImages.tsx` | Same idea for catalog products: upload (validated by `checkFile`), set main, remove. | `panel`, `product` | `catalog/ProductFormPage` |
| `Catalog/VariantEditor.tsx` | Editable table of variants: size, color, MRP, price, stock, active, remove; "same colour for all sizes" helper. Uses `useFieldArray`. | form context | `ProductFormPage` |

**User view:** an owner adds a product, picks sizes and colours, uploads up to 8 photos, can ask the AI to clean the background or make a model photo, and sees colour previews.

### 2.9 Customers (`Customers/`) and Customer (`Customer/`)

| File | What it does | Status |
|---|---|---|
| `Customers/OnlineBuyers.tsx` | Table of website buyers (customer, contact, orders, spent, last order) with search. Calls `GET /shop-admin/customers/online` directly through `api`. | **Current**, used in `shop/customers/CustomerPage` |
| `Customer/CustomerList.tsx`, `Customer/UpdateCustomerList.tsx` | Old "Client" list and edit form (Client Name, Caste, Secondary Phone). | **Legacy**, not imported anywhere |

### 2.10 Layout pieces: Header and Sidebar

| File | What it renders / does | Where used |
|---|---|---|
| `Header/index.tsx` | Top bar: mobile menu button, "Cloth Pro" name, for shop staff the shop, branch and GSTIN, and the user menu. Hook `useCurrentUser`. | `layouts/AppLayout` |
| `Header/DropdownUser.tsx` | Avatar, name and role; opens a menu with sign out (calls `logoutUser`, then `logout()`). | `Header/index.tsx` |
| `Header/DropdownMessage.tsx`, `DropdownNotification.tsx`, `DarkModeSwitcher.tsx` | Template-era message/bell/dark-mode widgets. The notification one still has `console.log` calls and uses a catering notification hook. | **Not imported** by the new Header |
| `Sidebar/index.tsx` | Left menu. Holds a `NAV` object with one list of groups per role (table below), highlights the current route, closes on mobile. Always adds a "Settings > Change Password" group. Employees see "My Work" plus the shop menu. | `layouts/AppLayout` |
| `Sidebar/SidebarLinkGroup.tsx` | Tiny 17-line wrapper from the template. | Not used by the new Sidebar (not verified further) |

Sidebar menus by role:

| Role | Groups |
|---|---|
| Super Admin | Overview, Businesses (companies, branches, shops, users), Catalog, Sales, Business setup |
| Company Admin (`ADMIN`) | Overview, Sales, Catalog and stock, Business setup |
| Branch Admin (`SUB_ADMIN`) | Overview (Dashboard, Approvals), Sales, Stock, Purchase, Accounts, Setup |
| Shop Admin | Sell at the counter (New Bill POS, Sales Bills, Returns), Online store, Customers, Products and stock, Purchase, Money (cash book, expenses, reports), Team, Setup (categories, subcategories, colours, sizes) |
| Employee | "My Work" plus the shop menu |
| User (online customer) | My Account |

**User view:** the header shows who is logged in and where; the sidebar shows only the items that role needs, each with a hover hint. (The backend still checks every request.)

### 2.11 Small remaining files

| File | What it does | Status |
|---|---|---|
| `ClickOutside.tsx` | Wrapper that calls a handler when the user clicks outside it. | Used by `Header/Dropdown*`, `Forms/Input/GenericInputFieldList` and a legacy Dish dropdown |
| `Loader/Loader.tsx` | Lottie animated loader. | Only used by legacy `Event/` |
| `Loader/LoadingErrorNoData.tsx` | Shows loading / error / "No data available" for a query. | Exported, but no current page uses it |
| `Icons/AuthIcon.tsx` | Large SVG illustration for login pages (template). | Not imported |
| `Breadcrumbs/index.tsx` | Breadcrumb built from the URL path (`useLocation`). Replaced by `ui/PageHeader` breadcrumbs. | Not imported |
| `Select/index.tsx` | Template searchable select (hard-coded text "select from list"). | Not imported |

---

## 3. Shared UI kit (how to reuse it)

There are **two generations** of the kit. Prefer the first for new work.

### 3.1 `ui/*` - the current design-system pieces

Import from the barrel: `import {Field, PageHeader, Overlay, ConfirmDialog, StatusBadge, StatCard, KpiCard} from '@/components/ui'`. `FormDialog`, `FormLayout` and `ViewDetailsDialog` are not in the barrel; import them by file path.

| Component | Use it for | Key props |
|---|---|---|
| `PageHeader` | Top of every page: breadcrumbs, title, subtitle, action buttons (about 42 pages use it). | `breadcrumbs: {label, to?}[]`, `title`, `subtitle?`, `actions?`, `compact?` |
| `Overlay` | Base for any dialog (`center`) or side drawer (`right`). Closes with Esc or scrim click and locks page scroll. | `open`, `onClose`, `label`, `placement?`, `children` |
| `ConfirmDialog` | "Are you sure?" popups. Can force the user to type a reason (min 5 characters) for suspend/block. | `open`, `title`, `message`, `confirmLabel`, `tone?`, `isLoading?`, `requireReason?`, `reasonLabel?`, `onConfirm(reason?)`, `onCancel` |
| `FormDialog` | Small add/edit form in a dialog (brands, categories). Handles Save/Cancel and error text. | `open`, `title`, `onClose`, `onSubmit`, `saving`, `error?`, `saveLabel?` |
| `ViewDetailsDialog` | Read-only label/value details popup. | `open`, `title`, `badge?`, `items: {label, value, fullWidth?}[]`, `onClose` |
| `Field` | Label + control wrapper with required star, hint and error; exports `describedBy` for accessibility. | `label?`, `htmlFor`, `required?`, `error?`, `hint?` |
| `FormLayout` | `FormGroup` (titled fieldset section) and `FormError` (form-level alert). | `title`, `message` |
| `StatusBadge` | Pill for ACTIVE / INACTIVE / SUSPENDED / BLOCKED / PENDING_INVITATION. | `status` |
| `StatCard` | Dashboard figure; shows "-" while loading. | `label`, `value?`, `display?`, `sub?` |
| `KpiCard` | Dashboard figure with a toned note, optionally clickable. | `label`, `value`, `note?`, `tone?`, `onClick?` |

### 3.2 `Forms/*` - form fields and the data table

Import from `@/components/Forms` (barrel `index.ts`). The field components are **react-hook-form aware**: wrap the form in `<FormProvider {...methods}>`, give each field a `name`, and it reads/writes the form value and shows errors by itself.

| Component | Purpose | Key props |
|---|---|---|
| `GenericInputField` | Text/number/email input with label, hint, prefix (e.g. "+91") and `kind` for built-in rules (phone, email, pincode...). | `name`, `label?`, `type?`, `placeholder?`, `required?`, `disabled?`, `hint?`, `rules?`, `prefix?`, `maxLength?`, `kind?`, `className?` |
| `GenericPasswordField` | Password with show/hide. | `name`, `label`, `autoComplete?` |
| `GenericTextArea` | Multi-line text, optional "12 / 500" counter. | `name`, `rows?`, `maxLength?` |
| `GenericDropdown` | Native select; clears itself when a parent field changes. | `name`, `options: {value,label}[]`, `placeholder?`, `loading?`, `dependsOn?` |
| `GenericSearchDropdown` | Searchable select (type to filter). Used in 50+ files. | `name`, `options`, `dependsOn?`, `loading?` |
| `GenericDatePicker`, `GenericDateRangeFilter` | Single date field (yyyy-mm-dd, `min`/`max`), and a from/to filter that is not form-bound (`value`, `onChange`). | |
| `GenericSwitch`, `SwitchControl` | On/off toggle with description; `SwitchControl` works without a form (`checked`, `onChange`). | |
| `GenericCheckboxGroup` | Group of checkboxes bound to one form field. | `name`, `label`, `options` |
| `GenericFileUpload` | File/image picker with preview, existing URL and remove; default rule is image, 2 MB. | `label`, `file`, `onFileChange`, `existingUrl?`, `rule?` |
| `GenericButton` | The one button style set. Variants: `primary`, `ghost`, `text`, `danger`, `icon`; `loading` shows a spinner and blocks double submit. | `variant?`, `type?`, `loading?`, `leftIcon?` |
| `GenericTabs` | Tab bar (`underline` or `vertical`). | `tabs`, `value`, `onChange`, `label` |
| `GenericTable` | The main data table: sorting, client or server pagination, loading/empty/error states, row click, row actions (permission-aware), responsive column hiding. Generic over the row type. | `columns: Column<T>[]` (`header`, `key` or `render`, `sortable`, `hideBelow`, `align`), `data`, `rowKey?`, `loading?`, `error?`, `onRetry?`, `rowActions?`, `pagination?`, `onPageChange?`, `onLimitChange?`, `sort?`, `onSortChange?`, `emptyTitle?` |

Intended pattern:

```tsx
const methods = useForm({resolver: zodResolver(schema)});
<FormProvider {...methods}>
  <form onSubmit={methods.handleSubmit(save)}>
    <FormGroup title="Shop">
      <GenericInputField name="name" label="Shop Name" required />
      <GenericDropdown name="status" label="Status" options={opts} />
    </FormGroup>
    <GenericButton type="submit" loading={saving}>Save</GenericButton>
  </form>
</FormProvider>
```

Forms files that look **legacy** (my import search found only catering-folder users): `GenericInputFieldList` (dish name suggestions), `RawMaterialNameInput`, `GenericExpandTable` (category/children table), `GenericRadioButton`, `GenericCheckBox`, `GenericMultiselectDropdown`, `GenericSimpleDrpdown`, `GenericResetButton` (28 uses, all in legacy files or the old forms). Some props are marked `@deprecated` in code (`validation`, `defaultOption`, `control`, `accessor`, `buttons`); use the newer ones.

### 3.3 `common/*` - older shared pieces

| File | What it is | Status |
|---|---|---|
| `Calendar.tsx` (544 lines) | Month calendar of catering **events** (`useGetAllEvents`, `useDeleteEvent`, date-fns) | Legacy |
| `ExpiryPopup.tsx` | Subscription-expiry popup (days remaining), used by Calendar | Legacy |
| `Loader.tsx` | Full-screen CSS spinner | Used only by legacy Admin / Customer |
| `Search.tsx` | Plain "Search..." input (template theme) | Legacy |
| `Pagination/Pagination.tsx`, `PageLimitSelector.tsx` | "Showing X of Y pages" bar and "entries per page" select | Used only by `common/Tables/DisplayTable` |
| `Tables/DisplayTable.tsx` | Older table with detail/edit/delete icons | Superseded by `Forms/GenericTable` |
| `modal/Modal.tsx`, `modal/ModalComponent.tsx` | Old yes/no modals (success/delete/inform types, call `refetch` after) | Superseded by `ui/ConfirmDialog` |

Rule of thumb: **new screens should use `ui/*` and `Forms/*`, not `common/*`.**

---

## 4. Legacy / unused folders (catering-app leftovers)

Based on searching all imports, nothing outside legacy code reaches these:

| Folder | What it was | Evidence |
|---|---|---|
| `Admin/` (`Home`, `StatCard`, `ExpiryDate`) | Old admin dashboard and caterer expiry table; most of `Home` is commented out | Not imported anywhere; uses `useGetCaterors` |
| `Customer/`, `client/` (`CreateClient`, `DisplayClient`, `UpdateClient`) | Caterer's "clients" (fields like Caste) | Only `Update/Update.tsx` imports `UpdateClient` |
| `Staff/` (`Staff`, `DisplayStaff`, `UpdateStaff`) | Caterer staff | `cateror/staff` hooks; only `Update.tsx` imports `UpdateStaff` |
| `Update/Update.tsx` | Router switch for about 25 old catering update screens | Reads route `_app/_edit/update.$name.$id`, which does not exist in `routes/` now |
| `Profile/`, `Settings/` | Caterer profile / settings forms | Not imported |
| `Feedback/`, `QrCode/` | Event QR code and guest feedback form | Use `cateror/event`; route `_external/qr.$id` is gone |
| `NewData/` | "New Data" tables (caterer / super admin) | Not imported |
| `Breadcrumbs/`, `Select/`, `Icons/` | Template pieces | Not imported |
| `Loader/` | Lottie loader | Only legacy `Event/` |
| `common/` | See 3.3 | Legacy only |
| `Header/DropdownMessage`, `DropdownNotification`, `DarkModeSwitcher`; `Inventory/Inventory`, `UpdateInventory`, `AddInventory`, `InventoryDashboardView`, `StockMovementsView`, `StockAdjustModal` | Template widgets and unwired inventory screens | No imports found |

These are probably safe to delete after a build check, but nothing was removed. Confirm with the team first.

---

## 5. Summary

1. `components/` mixes current cloth-shop ERP components with a large block of old catering-app code; theme classes (`burgundy/espresso/ivory` vs `stroke/meta-4/primary`) tell them apart.
2. Live retail features: Bills, CreditNotes, Orders, four Inventory modals, Promotions, Org, Company, ShopProduct, Catalog, Customers/OnlineBuyers, Header, and the role-based Sidebar.
3. Reusable kit for new screens: `ui/*` (PageHeader, Overlay, ConfirmDialog, FormDialog, Field, badges, KPI cards) plus `Forms/*` (react-hook-form fields, GenericTable, GenericButton).
4. Most reused files: `ui/PageHeader` (about 42 pages), `Forms/GenericTable`, `Org/ListToolbar` (about 16 pages), `ui/FormDialog`.
5. Legacy or unused: Admin, Customer, client, Staff, Update, Profile, Settings, Feedback, QrCode, NewData, Select, Breadcrumbs, Icons, Loader, common, three Header dropdowns, six Inventory files, and several old `Forms/` files.
