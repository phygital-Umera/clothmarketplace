# Admin Frontend: App Structure, Pages and Library

Scope: `frontend/` (the admin React + Vite + TypeScript app). Covers config files, boot, layouts, context, hooks, `src/lib`, and every file in `src/pages`. It does not cover `src/components`, `src/types`, `src/utils` or `src/routes` in detail (routes are only used here to build the routing table).

> Note for beginners: the app is called "Cloth Pro" in the UI and "Cloth Martketplace" (sic) in `index.html`. The package name `caterringmanagement` and the README are leftovers from an older catering project. Ignore them.

---

## 1. Tech stack and scripts

| Piece | What it is | Why it is used |
|---|---|---|
| React 18 + TypeScript | UI library and typed JavaScript | Builds screens from components |
| Vite 5 | Dev server and bundler | Fast start, hot reload |
| TanStack Router (file based) | Page routing | URL -> page. Routes are files in `src/routes`; Vite plugin generates `src/routeTree.gen.ts` |
| TanStack React Query v5 | Server-data cache | Loads, caches and refreshes API data |
| Axios | HTTP client | Talks to the backend, adds the login token |
| react-hook-form + zod | Forms + validation | Forms check input before sending |
| Tailwind CSS 3 | Styling | Design tokens ("L'Atelier Vestiaire": ivory, burgundy, sage, blush) |
| react-hot-toast | Pop-up messages | Success and error toasts |
| jwt-decode | Reads the login token | Gets the user's id and role from the token |
| lucide-react, react-icons | Icons | |
| exceljs, jspdf, jspdf-autotable, html2canvas, react-to-print, react-qr-code | Export and print | Excel/PDF exports, invoices, barcodes |
| ESLint, Prettier, Husky, lint-staged | Code quality | Auto-fix and lint on commit |

Scripts (`frontend/package.json`):

| Command | What it does |
|---|---|
| `npm run dev` | Starts Vite (`vite --host`, so phones on your network can open it) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves the built `dist/` locally |
| `npm run lint` | ESLint on ts/tsx, fails on any warning |
| `npm run format` | Prettier on `src/**/*.{js,jsx,ts,tsx}` |
| `npm run prepare` | Installs Husky git hooks (runs automatically after `npm install`) |

Environment: copy `.env.example` to `.env`. It has one value:

```
VITE_SERVER_URL=http://localhost:5692/api/v1
```

If missing, `utils/axios.ts` falls back to the same URL. Path alias: `@` means `src/` (e.g. `@/lib/roles`).

---

## 2. How the app boots

1. Browser opens `index.html`, which loads Google fonts (Hanken Grotesk, Playfair Display) and `/src/main.tsx`.
2. `main.tsx` renders `<App />` into `#root` and imports `index.css` (Tailwind) and `assets/css/style.css`.
3. `App.tsx` creates the router (from the generated `routeTree`, with `NotFound404` as 404 page) and nests:

```
AuthContextProvider          <- who is signed in (reads localStorage token)
  Toaster                    <- toast pop-ups
  QueryProvider              <- React Query cache (retry 1, no refetch on focus, 30 s stale)
    RouterProvider           <- shows the page for the URL
```

4. Router tree: `__root` (`RootLayout`, just an `<Outlet/>`) has two branches:
   - `_auth` -> `AuthLayout` (sign-in screens, public)
   - `_app` -> `AppLayout` (everything after sign-in: sidebar, header, access check)

Other config files:

| File | Purpose |
|---|---|
| `vite.config.ts` | Plugins (`TanStackRouterVite`, React), `@` alias, chunk warning limit 1500 |
| `tailwind.config.js` | Colours, fonts, font sizes, dark mode (`class`) for the brand design system; legacy TailAdmin colour names are remapped to the brand palette |
| `postcss.config.js` | Tailwind + autoprefixer |
| `.eslintrc.cjs` | ESLint rules (TS, react-hooks, prettier; unused vars and exhaustive-deps turned off) |
| `.prettierrc` | Single quotes, no bracket spacing, Tailwind class sorting |
| `tsconfig*.json` | TypeScript settings |
| `.husky/pre-commit` | Runs `npx lint-staged` before each commit |
| `scripts/updateAuthContext.js` | One-off helper that renamed role strings in `AuthContextProvider.tsx` to `SUPER_ADMIN` / `ADMIN`. Not part of the build |
| `vite.config.ts.timestamp-*.mjs` | Temporary files Vite left behind; safe to ignore/delete |
| `README.md` | Outdated catering-system text, not about this app |
| `.env.example` | Template for `VITE_SERVER_URL` |

---

## 3. Auth flow, roles and permissions (client side)

### Roles (`lib/roles.ts`)

| Role id | Shown as | Home page | URL prefix |
|---|---|---|---|
| `SUPER_ADMIN` | Super Admin (platform owner) | `/super-admin/dashboard` | `/super-admin` |
| `ADMIN` | Company Admin | `/company-admin/dashboard` | `/company-admin` |
| `SUB_ADMIN` | Branch Admin | `/branch-admin/dashboard` | `/branch-admin` |
| `SHOP_ADMIN` | Shop (shop login) | `/shop-admin/dashboard` | `/shop-admin` |
| `EMPLOYEE` | Employee / staff | `/employee/dashboard` | `/employee` |
| `USER` | Customer | `/account` | `/account` |

`SHARED_PATHS = ['/change-password']` is open to every signed-in role.

### Sign-in step by step

1. User opens `/signin` (`pages/Signin.tsx`), types email or mobile + password.
2. `useLoginUser` -> `POST /users/login` (unauthenticated axios instance).
3. Backend returns `accessToken`, `refreshToken` and the user's role.
4. `AuthContextProvider.login()` saves the tokens in `localStorage` under key `token`, decodes the JWT (`jwtDecode`) and stores `user`, `role`, `isAuthenticated`.
5. `landingFor(role)` picks the first page and the app navigates there.
6. Sign-up (`/signup`) always creates a CUSTOMER and signs in straight away.

### Staying signed in

- On start-up `AuthContextProvider` reads the stored token synchronously (so guards work on first render). An expired access token is kept if a refresh token exists.
- `utils/axios.ts` request interceptor: if the access token is expired it calls `POST /users/refresh` once (shared by all waiting requests), stores the new tokens and continues. If refresh fails, or any response is 401, it clears the token and sends the browser to `/signin`.
- Axios response interceptor returns `res.data` directly, so API functions get `{statusCode, data, message}`.
- For role `EMPLOYEE`, any request to `/shop-admin/...` is rewritten to `/employee/...` (same screens, backend limits them to the employee's modules).

### Guards

| Guard | File | What it does |
|---|---|---|
| Public-only | `layouts/AuthLayout.tsx` | If already signed in, redirects to the role's landing page |
| Session check | `layouts/AppLayout.tsx` | Not signed in -> `/signin`. Calls `GET /users/me` (`useCurrentUser`). Shows a spinner, then "You are signed out" on error, or "No access" if the token's role differs from the real role |
| Root redirect | `AppLayout` | `/` redirects to the role's home |
| Path check | `AppLayout` + `canOpen()` | A role may open only its own prefix (plus shared paths). Otherwise an "Access denied" panel with a link home |
| Employee module check | `lib/shopModules.ts` | Employees may also open `/shop-admin/...` screens of modules they were given |
| View-only banner | `AppLayout` | Employee with `view` access sees "You can view this page. Ask your shop admin if you need to make changes." |

Remember: the client only hides things. The backend always re-checks and returns 403.

### Employee shop modules (`lib/shopModules.ts`)

Permissions are strings like `billing.view` or `billing.edit`. `edit` includes view.

| Module key | Label | Shop screens it unlocks (`/shop-admin/...`) |
|---|---|---|
| `dashboard` | Dashboard | dashboard |
| `billing` | Billing | new-bill, sales-bills, sales-returns |
| `orders` | Online orders | orders |
| `customers` | Customers | customers, credit |
| `purchase` | Purchase | purchase-bills, purchase-return, suppliers |
| `products` | Products | products |
| `stock` | Stock | inventory, stock-adjustment, stock-transfer, barcode-labels |
| `accounts` | Accounts | cash-book, expenses |
| `reports` | Reports | reports |
| `masters` | Masters | categories, subcategories, colors, sizes |

Not in any module (shop login only): `staff`, `employees`, `promotions`, `profile`, `my-profile`. Screens that need `edit`: `new-bill`, `products/new`, `products/edit/...`.

Helpers: `levelOf`, `moduleOfPath`, `employeeCanOpen`, `withLevel`. `hooks/usePermissions.ts` exposes `can('x.edit')` to hide buttons.

### Context and hooks

`AuthContext` gives: `user, role, token, isAuthenticated, isSuperAdmin, isCompanyAdmin, login, logout` (plus setters). Note: `mustChangePassword` exists on the user object and login response but no page in `src/pages` forces a redirect on it.

---

## 4. Routing table

Routes are files under `frontend/src/routes` (`*.lazy.tsx` = code-split). `App.tsx` itself contains no route list; it just receives the generated tree. Every `/_app/...` URL is behind `AppLayout`.

Legend: "Role" is the role whose prefix matches. Shop-admin URLs can also be opened by EMPLOYEE with the module in column 4.

### Public (`AuthLayout`)

| URL | Page file | Role / module |
|---|---|---|
| `/signin` | `pages/Signin.tsx` | Public (redirects away if signed in) |
| `/signup` | `pages/Signup.tsx` | Public |
| `/forgot-password` | `pages/ForgotPassword.tsx` | Public |
| `/reset-password?token=...` | `pages/ResetPassword.tsx` | Public |

### Any signed-in role

| URL | Page file | Role |
|---|---|---|
| `/` | none (redirects to role home) | Any |
| `/change-password` | `pages/ChangePassword.tsx` | Any |
| (unknown URL) | `layouts/NotFound404.tsx` | Any |

### Customer and employee

| URL | Page file | Role |
|---|---|---|
| `/account` | `pages/dashboards/AccountDashboard.tsx` (tabs: My Orders = `customer/MyOrdersPage.tsx`, Profile) | USER |
| `/employee/dashboard` | `pages/employee/EmployeeHomePage.tsx` | EMPLOYEE |

### Super admin (`/super-admin`, role SUPER_ADMIN)

| URL | Page file |
|---|---|
| `/super-admin/dashboard` | `dashboards/SuperAdminDashboard.tsx` |
| `/super-admin/companies` | `companies/CompanyList.tsx` (filters kept in URL) |
| `/super-admin/companies/new` | `companies/CompanyFormPage.tsx` |
| `/super-admin/companies/:companyId/edit` | `companies/CompanyFormPage.tsx` |
| `/super-admin/branches` | `org/BranchList.tsx` (read-only overview) |
| `/super-admin/shops` | `org/ShopList.tsx` (read-only overview) |
| `/super-admin/users` | `org/UserList.tsx` |
| `/super-admin/categories` | `catalog/CategoryList.tsx` |
| `/super-admin/brands` | `catalog/BrandList.tsx` |
| `/super-admin/products` | `catalog/ProductList.tsx` |
| `/super-admin/products/:productId` | `catalog/ProductFormPage.tsx` |
| `/super-admin/orders` | `ecommerce/OrderList.tsx` |

### Company admin (`/company-admin`, role ADMIN)

| URL | Page file |
|---|---|
| `/company-admin/dashboard` | `dashboards/ScopedDashboard.tsx` (panel `company-admin`) |
| `/company-admin/profile` | `myCompany/MyCompany.tsx` |
| `/company-admin/branches` | `org/BranchList.tsx` (add/edit own) |
| `/company-admin/shops` | `org/ShopList.tsx` |
| `/company-admin/employees` | `org/EmployeeList.tsx` |
| `/company-admin/brands` | `catalog/BrandList.tsx` |
| `/company-admin/products` | `catalog/ProductList.tsx` |
| `/company-admin/products/new` | `catalog/ProductFormPage.tsx` |
| `/company-admin/products/:productId` | `catalog/ProductFormPage.tsx` |
| `/company-admin/inventory` | `ecommerce/InventoryList.tsx` |
| `/company-admin/orders` | `orders/ShopOrdersPage.tsx` |
| `/company-admin/promotions` | `promotions/PromotionsPage.tsx` |

### Branch admin (`/branch-admin`, role SUB_ADMIN)

| URL | Page file |
|---|---|
| `/branch-admin/dashboard` | `branch/BranchDashboardPage.tsx` |
| `/branch-admin/profile` | `branch/BranchProfileSetupPage.tsx` |
| `/branch-admin/my-profile` | `branch/BranchMyProfilePage.tsx` (wraps `profile/MyProfilePage.tsx`) |
| `/branch-admin/shops` | `branch/BranchShopsPage.tsx` |
| `/branch-admin/employees` | `branch/BranchStaffPage.tsx` |
| `/branch-admin/shop-assignment` | `branch/BranchShopAssignmentPage.tsx` |
| `/branch-admin/approvals` | `branch/BranchApprovalsPage.tsx` |
| `/branch-admin/products` | `branch/BranchProductPricingPage.tsx` |
| `/branch-admin/products/new` | `catalog/ProductFormPage.tsx` (panel `branch-admin`) |
| `/branch-admin/products/:productId` | `catalog/ProductFormPage.tsx` |
| `/branch-admin/inventory` | `ecommerce/InventoryList.tsx` |
| `/branch-admin/stock` | `shop/stock/StockPage.tsx` |
| `/branch-admin/stock-adjustment` | `shop/stock/StockAdjustmentPage.tsx` |
| `/branch-admin/stock-transfers` | `branch/BranchStockTransfersPage.tsx` |
| `/branch-admin/barcode-labels` | `shop/barcode/BarcodeLabelsPage.tsx` |
| `/branch-admin/suppliers` | `shop/suppliers/SuppliersPage.tsx` |
| `/branch-admin/purchase-bills` | `branch/BranchPurchaseBillsPage.tsx` |
| `/branch-admin/purchase-return` | `shop/returns/PurchaseReturnPage.tsx` |
| `/branch-admin/sales-bills` | `branch/BranchSalesBillsPage.tsx` |
| `/branch-admin/sales-returns` | `branch/BranchSalesReturnsPage.tsx` |
| `/branch-admin/customers` | `branch/BranchCustomerDuesPage.tsx` |
| `/branch-admin/orders` | `orders/ShopOrdersPage.tsx` |
| `/branch-admin/expenses` | `branch/BranchExpensesPage.tsx` |
| `/branch-admin/day-close` | `branch/BranchCashDayClosePage.tsx` |
| `/branch-admin/reports` | `branch/BranchReportsPage.tsx` |
| `/branch-admin/promotions` | `promotions/PromotionsPage.tsx` (panel `branch-admin`) |

### Shop (`/shop-admin`, role SHOP_ADMIN; EMPLOYEE with module)

| URL | Page file | Employee module |
|---|---|---|
| `/shop-admin/dashboard` | `shop/dashboard/ShopDashboard.tsx` | dashboard |
| `/shop-admin/new-bill` | `shop/pos/NewBillPOSPage.tsx` | billing (edit) |
| `/shop-admin/sales-bills` | `shop/bills/BillsPage.tsx` (kind `sales`) | billing |
| `/shop-admin/sales-returns` | `shop/returns/ShopSalesReturnsPage.tsx` | billing |
| `/shop-admin/orders` | `orders/ShopOrdersPage.tsx` | orders |
| `/shop-admin/customers` | `shop/customers/CustomerPage.tsx` | customers |
| `/shop-admin/credit` | `shop/credit/CreditUdhaarPage.tsx` | customers |
| `/shop-admin/purchase-bills` | `shop/bills/BillsPage.tsx` (kind `purchase`) | purchase |
| `/shop-admin/purchase-return` | `shop/returns/PurchaseReturnPage.tsx` | purchase |
| `/shop-admin/suppliers` | `shop/suppliers/SuppliersPage.tsx` | purchase |
| `/shop-admin/products` | `shop/products/ShopProductList.tsx` | products |
| `/shop-admin/products/new` | `shop/products/ShopProductForm.tsx` | products (edit) |
| `/shop-admin/products/:productId` | `shop/products/ShopProductDetail.tsx` | products |
| `/shop-admin/products/edit/:productId` | `shop/products/ShopProductForm.tsx` | products (edit) |
| `/shop-admin/inventory` | `shop/stock/StockPage.tsx` | stock |
| `/shop-admin/stock-adjustment` | `shop/stock/StockAdjustmentPage.tsx` | stock |
| `/shop-admin/stock-transfer` | `shop/stock/StockTransferPage.tsx` | stock |
| `/shop-admin/barcode-labels` | `shop/barcode/BarcodeLabelsPage.tsx` | stock |
| `/shop-admin/cash-book` | `shop/accounts/CashBookPage.tsx` | accounts |
| `/shop-admin/expenses` | `shop/accounts/ShopExpensesPage.tsx` | accounts |
| `/shop-admin/reports` | `branch/BranchReportsPage.tsx` (panel `shop-admin`) | reports |
| `/shop-admin/categories` | `master/CategoryMaster.tsx` | masters |
| `/shop-admin/subcategories` | `master/SubcategoryMaster.tsx` | masters |
| `/shop-admin/colors` | `master/ColorMaster.tsx` | masters |
| `/shop-admin/sizes` | `master/SizeMaster.tsx` | masters |
| `/shop-admin/staff` | `shop/staff/StaffRightsPage.tsx` | shop login only |
| `/shop-admin/employees` | `org/EmployeeList.tsx` | shop login only |
| `/shop-admin/promotions` | `promotions/PromotionsPage.tsx` | shop login only |
| `/shop-admin/profile` and `/shop-admin/my-profile` | `profile/MyProfilePage.tsx` | shop login only |

Several pages are shared between roles through a `panel` prop (`'super-admin' | 'company-admin' | 'branch-admin' | 'shop-admin' | 'employee'`). The panel string becomes the first part of the API URL (see section 5), so one page works for many roles.

Files in `pages/` not reachable from any route: `dashboards/BranchDashboard.tsx` (older branch home, imported by `BranchDashboardPage.tsx`), `dashboards/ComingSoon.tsx` (placeholder, unused).

---

## 5. How data fetching works

Three layers, one file per topic in each:

```
Page (src/pages/...)
  calls a hook          ->  src/lib/react-query/queriesAndMutations/<topic>.ts
  hook calls a function ->  src/lib/api/<topic>.ts
  function calls axios  ->  src/utils/axios.ts  (adds token, refreshes, unwraps data)
  backend /api/v1/...
```

| Layer | Role | Example |
|---|---|---|
| `lib/api/<topic>.ts` | Plain functions, one per endpoint. No React | `getBills(panel, kind, params)` -> `GET /{panel}/{kind}-bills` |
| `lib/react-query/queriesAndMutations/<topic>.ts` | `useQuery` for reads, `useMutation` for writes, a key constant per topic, toasts on success/error, cache invalidation | `useBills(...)`, `useSaveBill()`; saving a bill invalidates stock/inventory/dashboard queries |
| Page | Calls the hook, shows loading / data / error | `BillsPage` calls `useBills` |

Rules of thumb:

- Reads use `useQuery` with a key like `['shop_bills', params]`. Same key = cached data reused for 30 s. Changing a filter changes the key and fetches again.
- Writes use `useMutation`. On success the hook calls `queryClient.invalidateQueries({queryKey: [...]})` so lists refresh by themselves.
- Errors: `getErrorMessage(error, fallback)` pulls the backend message. Auth pages show errors inline; most others use toasts.
- `hooks/useListState.ts` keeps page, page size, debounced search (300 ms), sort and filters for server-paginated lists.
- Exceptions: `lib/api/pincode.ts` calls the public India Post API directly (no backend). `lib/api/Auth/auth.ts` uses `unAuthenticatedApi` for login/register/forgot/reset.

Mini example (reading shops):

```ts
// lib/api/org.ts
export const getShops = (params) => api.get('/shops', {params});
// lib/react-query/queriesAndMutations/org.ts
export const useShops = (params) => useQuery({queryKey: ['shops', params], queryFn: () => getShops(params)});
// page
const {data, isPending} = useShops(listState.params);
```

---

## 6. Per-file reference

### 6.1 Config and root files

| Path | Purpose |
|---|---|
| `frontend/package.json` | Dependencies, scripts, lint-staged rules |
| `frontend/vite.config.ts` | Vite plugins, `@` alias |
| `frontend/tailwind.config.js` | Brand colour tokens, fonts, type scale, dark mode |
| `frontend/postcss.config.js` | PostCSS plugins (Tailwind, autoprefixer) |
| `frontend/.eslintrc.cjs` | ESLint config |
| `frontend/.prettierrc` | Prettier config |
| `frontend/index.html` | HTML shell, fonts, `#root`, hides number spinners |
| `frontend/.env.example` | `VITE_SERVER_URL` template |
| `frontend/.husky/pre-commit` | Runs lint-staged |
| `frontend/README.md` | Stale catering-system text |
| `frontend/scripts/updateAuthContext.js` | One-off role-rename script |
| `frontend/src/main.tsx` | Mounts React, imports global CSS |
| `frontend/src/App.tsx` | Providers + router creation |
| `frontend/src/globals.css` | Three Tailwind directives (not imported by `main.tsx`) |
| `frontend/src/index.css` | Tailwind directives (imported by `main.tsx`) |
| `frontend/my-three-app/` | Separate, stand-alone Vite + React 19 + three.js / react-three-fiber playground. Its `src/App.jsx` is still the default Vite counter template. Not used by the admin app or the build |

### 6.2 `src/layouts`

| Path | Purpose |
|---|---|
| `layouts/index.ts` | Re-exports AuthLayout, RootLayout, AppLayout |
| `layouts/RootLayout.tsx` | Top-level `<Outlet/>` |
| `layouts/AuthLayout.tsx` | Split-screen sign-in shell; redirects signed-in users to their landing page |
| `layouts/AppLayout.tsx` | Signed-in shell: session check, role/permission check, Sidebar + Header + page outlet, access-denied view |
| `layouts/NotFound404.tsx` | "Page not found" screen |

### 6.3 `src/context`, `src/hooks`, `src/icons`, `src/assets`

| Path | Purpose |
|---|---|
| `context/AuthContext.ts` | Creates the auth context and `useAuthContext()` |
| `context/AuthContextProvider.tsx` | Holds token/user/role in state and localStorage; `login`, `logout` |
| `hooks/useColorMode.tsx` | Light/dark mode saved as `color-theme`; toggles `dark` class on body |
| `hooks/useCurrentUser.ts` | `GET /users/me` query (role, status, company/branch/shop, permissions); cached 60 s |
| `hooks/useDebounce.tsx` | Delays a changing value (used for search boxes) |
| `hooks/useInlineEditor.ts` | State for add/edit form shown on the list page (`'new'`, an id, or closed) |
| `hooks/useListState.ts` | Page, size, search, sort, filters for paginated lists |
| `hooks/useLocalStorage.tsx` | `useState` that persists to localStorage |
| `hooks/usePermissions.ts` | `can(permission)` helper from `/users/me` permissions |
| `hooks/usePincodeAutofill.ts` | Fills state/district/city after a 6-digit pincode is typed |
| `icons/index.ts` | Re-exports react-icons under friendly names (DashboardIcon, WalletIcon...) |
| `assets/css/` | `style.css` (template styles), `loader.css` (spinner), `satoshi.css` (font-face for Satoshi) |
| `assets/fonts/` | Satoshi font files (eot, ttf, woff, woff2 in many weights) |
| `assets/images/` | Static images by folder: `Bill/` (invoice corner art), `brand/`, `cards/`, `country/`, `cover/`, `icon/`, `logo/` (logos, sidebar, menu images), `menucard/`, `pricing/` (pack images), `product/`, `task/`, `user/` (avatars), `favicon.ico`. Many are leftovers from the admin template |
| `assets/js/` | `hindiFontBase64.ts`, `nirmalaBase64.ts` (fonts embedded for Hindi text in PDFs), `us-aea-en.js` (map data) |

### 6.4 `src/lib` (core)

| Path | Purpose |
|---|---|
| `lib/roles.ts` | Role list, home pages, `canOpen`, `landingFor`, `homeFor` |
| `lib/shopModules.ts` | Employee shop modules and the screen->module map |
| `lib/contants/index.ts` | Initial auth state and old default constants (typo in folder name is real) |
| `lib/react-query/QueryProvider.tsx` | Creates the single React Query client |
| `lib/react-query/queryKeys.ts` | Enums of query-key names (many old catering keys; `AUTH_KEYS`, `QUERY_KEYS.TOKEN` = localStorage key `token` are the live ones) |

### 6.5 `src/lib/api` (one function per endpoint)

| Path | Purpose |
|---|---|
| `api/Auth/auth.ts` | Register, login, logout, `/users/me`, update profile, change/forgot/reset password |
| `api/barcodeLabel.ts` | Purchase bills/items/products for labels, reprint batches, record print job |
| `api/bill.ts` | Sales and purchase bills: list, get, create, update, confirm, cancel, delete, record payment, customer search, branch sales summary/export |
| `api/branchExtras.ts` | Branch expenses, approvals, profit and loss report, staff overview/invite, shop assignment, branch profile setup |
| `api/branchPricing.ts` | Branch product prices, save prices, bulk/scheduled price change |
| `api/branchPurchase.ts` | Branch view of purchase bills and summary |
| `api/cashBook.ts` | Cash book, cash in/out, bank deposit, close cash day |
| `api/catalog.ts` | Categories, brands, products (platform/company catalogue), status, images |
| `api/company.ts` | Companies CRUD |
| `api/credit.ts` | Credit (udhaar): metrics, customers, statement, receive payment, WhatsApp reminders |
| `api/creditNote.ts` | Sales returns / credit notes: list, create, decide (approve/reject) |
| `api/customer.ts` | Shop customers CRUD and bulk import |
| `api/customerDue.ts` | Branch view of customer dues, credit limit, reminders, export |
| `api/dayClose.ts` | Day close data, resolve cash difference, bank deposit |
| `api/ecommerce.ts` | Panel-based products, categories, brands, inventory, stock adjust, movements, orders |
| `api/expenses.ts` | Shop expenses list/create, next expense number |
| `api/master.ts` | Masters: categories, subcategories, colors, sizes |
| `api/Notification.ts` | Leftover catering notification calls (not used by pages) |
| `api/order.ts` | Order admin (status, shipping, payment, cancellations, returns, invoice data) and customer orders (checkout, list, cancel) |
| `api/org.ts` | Dashboards, company/branch profile, branches, shops, shop options |
| `api/pincode.ts` | India Post pincode lookup (direct, no backend) |
| `api/promotion.ts` | Offers and coupons: dashboard, CRUD, toggle, validate |
| `api/purchaseReturn.ts` | Purchase returns (debit notes) |
| `api/shopOps.ts` | Shop dashboard, open/close counter, create expense |
| `api/shopProduct.ts` | Shop products CRUD, images, AI clean/professional photos, AI colour previews |
| `api/staff.ts` | Staff list, rights, shift, attendance, new-staff requests and decisions |
| `api/stock.ts` | Stock summary, adjust, physical count |
| `api/stockAdjustment.ts` | Stock adjustment numbers, variants, history, create |
| `api/stockTransfer.ts` | Transfers between shops: request, dispatch, receive, approve, overview |
| `api/supplier.ts` | Suppliers, ledger, create, record payment |
| `api/supplierPayment.ts` | Branch supplier list, summary, payments |

### 6.6 `src/lib/react-query/queriesAndMutations` (hooks over the api files)

Each file wraps the api file of the same name (case-insensitive) in `useQuery` / `useMutation` hooks, e.g. `bill.ts` -> `useBills`, `useSaveBill`, `useConfirmBill`; `org.ts` -> `useShops`, `useBranches`, `useEmployees`, `useUsers`, `useSaveShop`. Extra notes:

| Path | Purpose |
|---|---|
| `auth.ts` | Login, register, change/forgot/reset password mutations (errors shown inline) |
| `barcodeLabel.ts`, `bill.ts`, `branchExtras.ts`, `branchPricing.ts`, `branchPurchase.ts`, `cashBook.ts`, `catalog.ts`, `company.ts` (also `usePincode`), `credit.ts`, `creditNote.ts`, `customer.ts`, `customerDue.ts`, `dayClose.ts`, `ecommerce.ts`, `expenses.ts`, `master.ts`, `order.ts`, `org.ts`, `promotion.ts`, `purchaseReturn.ts`, `shopOps.ts`, `shopProduct.ts`, `staff.ts`, `stock.ts`, `stockAdjustment.ts`, `stockTransfer.ts`, `supplier.ts`, `supplierPayment.ts` | Query and mutation hooks for the matching api file, with cache invalidation and toasts |
| `notification.ts` | Leftover catering notification hooks |

(`bill.ts` also exports `invalidateStock(queryClient)`, which refreshes every stock-related view after any bill change.)

### 6.7 `src/lib/validation` (zod schemas)

Live schemas (used by current screens):

| Path | Purpose |
|---|---|
| `fieldRules.ts` | Shared rules by field kind (email, phone, pincode, numbers, dates, images) and `applyServerErrors` so every form validates the same way |
| `authSchemas.ts` | Sign-in and sign-up schemas |
| `companySchema.ts` | Company form (backend generates the code) |
| `orgSchemas.ts` | Branch, shop and employee forms |
| `productSchema.ts` | Platform/company product form and `toProductBody` |
| `shopProductSchema.ts` | Shop product form, `fromShopProduct`, `toShopProductBody` |
| `profileSchemas.ts` | Profile form schema (older, broad) |

Leftovers from the old catering project (no current page depends on them): `cartererSchema.ts`, `clientSchemas.ts`, `custom.validation.ts`, `dishSchemas.ts`, `disposalSchema.ts`, `epinSchema.ts`, `eventSchema.ts`, `incomeSchema.ts`, `inventorySchema.ts`, `languageSchema.ts`, `maharajSchema.ts`, `processSchema.ts`, `rawmaterialSchema.ts`, `settingSchema.ts`, `staffSchema.ts`, `utensilSchema.ts`, `vendorSchema.ts`.

### 6.8 `src/pages` (all 74 files)

Auth and shared

| Path | Purpose |
|---|---|
| `pages/index.ts` | Re-exports SignIn, SignUp, ForgotPassword, ResetPassword, ChangePassword |
| `pages/Signin.tsx` | Email/mobile + password sign-in, links to forgot password and sign-up |
| `pages/Signup.tsx` | Public customer registration (name, email, phone, password, accept terms) |
| `pages/ForgotPassword.tsx` | Asks for a reset link (same reply whether the account exists or not) |
| `pages/ResetPassword.tsx` | Sets a new password from the emailed `?token=` link |
| `pages/ChangePassword.tsx` | Change own password; optionally signs out other devices; stores fresh tokens |
| `pages/profile/MyProfilePage.tsx` | Own profile (name, address, phone, POS PIN, photo) and password forms |

Dashboards

| Path | Purpose |
|---|---|
| `dashboards/index.ts` | Re-exports SuperAdminDashboard, AccountDashboard |
| `dashboards/SuperAdminDashboard.tsx` | Platform counts: companies, branches, shops (total and active), users |
| `dashboards/ScopedDashboard.tsx` | Company admin counts (branches, branch admins, shops, employees) |
| `dashboards/BranchDashboard.tsx` | Older branch home: sales today/month, cash, UPI/card, purchases, stock value, low stock |
| `dashboards/AccountDashboard.tsx` | "My account": Orders and Profile tabs for customers; own details for others |
| `dashboards/ComingSoon.tsx` | Placeholder for unbuilt menu items (unused) |
| `employee/EmployeeHomePage.tsx` | Employee home: details, workplace, list of modules they can open, change-password link |
| `customer/MyOrdersPage.tsx` | Customer's orders: view, cancel, return |
| `myCompany/index.ts` | Re-exports MyCompany |
| `myCompany/MyCompany.tsx` | Company admin's company details (read-only) |

Companies, organisation, catalogue (platform and company levels)

| Path | Purpose |
|---|---|
| `companies/index.ts` | Re-exports CompanyList, CompanyFormPage |
| `companies/CompanyList.tsx` | Company table with search, status filter, sort, paging in URL, delete |
| `companies/CompanyFormPage.tsx` | Add and edit company |
| `org/BranchList.tsx` | Branches (company admin edits; super admin views, filter by company) |
| `org/BranchProfile.tsx` | Read-only branch profile (not mapped to a route) |
| `org/ShopList.tsx` | Shops with inline add/edit form (including shop login) |
| `org/EmployeeList.tsx` | Employees with inline add/edit, password and account actions |
| `org/UserList.tsx` | All platform accounts with status actions |
| `catalog/BrandList.tsx` | Brands (global for super admin; company admin sees global read-only plus own) |
| `catalog/CategoryList.tsx` | Category tree (super admin) |
| `catalog/ProductList.tsx` | Products for any panel; edit/publish/delete shown as backend allows |
| `catalog/ProductFormPage.tsx` | Create/edit product (read-only if user cannot edit); images and publish |
| `catalog/ProductStatusBadge.tsx` | Small status chip (live / being prepared / off) |
| `ecommerce/index.ts` | Re-exports InventoryList, OrderList |
| `ecommerce/InventoryList.tsx` | Inventory by product/variant with movement history and adjustments |
| `ecommerce/OrderList.tsx` | Simple order list with status update (super admin) |
| `orders/ShopOrdersPage.tsx` | Online orders: dashboard counts, order list, details, status, returns, tax invoice |
| `promotions/PromotionsPage.tsx` | Offers and coupons with All/Active/Scheduled/Expired tabs |
| `master/CategoryMaster.tsx` | Shop category master with inline form |
| `master/SubcategoryMaster.tsx` | Subcategory master |
| `master/ColorMaster.tsx` | Colour master with colour picker |
| `master/SizeMaster.tsx` | Size master |

Branch admin pages

| Path | Purpose |
|---|---|
| `branch/BranchDashboardPage.tsx` | Branch home: shops today, approvals, purchases, customer dues |
| `branch/BranchProfileSetupPage.tsx` | Edit branch profile/setup details |
| `branch/BranchMyProfilePage.tsx` | Wrapper that shows `MyProfilePage` |
| `branch/BranchShopsPage.tsx` | Shop cards with add/edit panel and shop login |
| `branch/BranchStaffPage.tsx` | Staff overview, add/invite staff, decide on shop staff requests |
| `branch/BranchShopAssignmentPage.tsx` | Move employees between shops |
| `branch/BranchApprovalsPage.tsx` | Approve/reject refund credit notes |
| `branch/BranchProductPricingPage.tsx` | View and edit prices, bulk and scheduled price change |
| `branch/BranchStockTransfersPage.tsx` | Approve/reject transfers, pick source shop |
| `branch/BranchPurchaseBillsPage.tsx` | All shops' purchase bills by month, with summary |
| `branch/BranchSalesBillsPage.tsx` | All shops' sales bills (view only), filters, summary, export |
| `branch/BranchSalesReturnsPage.tsx` | Returns/credit notes of all shops with summary |
| `branch/BranchCustomerDuesPage.tsx` | Customer dues, credit limits, reminders, CSV export |
| `branch/BranchExpensesPage.tsx` | Branch expenses list and add |
| `branch/BranchCashDayClosePage.tsx` | Each shop's day close, differences, bank deposit |
| `branch/BranchReportsPage.tsx` | Profit and loss by date range (also used by shop login) |
| `branch/BranchSuppliersPage.tsx` | Supplier summary and payments (not mapped to a route; branch route uses `shop/suppliers/SuppliersPage`) |

Shop pages

| Path | Purpose |
|---|---|
| `shop/dashboard/ShopDashboard.tsx` | Sales today, cash in drawer, gross profit, online orders, counter open/close |
| `shop/pos/NewBillPOSPage.tsx` | Billing counter (POS): search/scan, customer, discounts, GST split, payments, hold bill, keyboard shortcuts |
| `shop/bills/BillsPage.tsx` | Sales or purchase bills list; create/edit/confirm/cancel/delete/record payment |
| `shop/returns/ShopSalesReturnsPage.tsx` | Sales returns of this shop |
| `shop/returns/PurchaseReturnPage.tsx` | Purchase return (debit note) against a supplier bill, printable voucher |
| `shop/customers/CustomerPage.tsx` | Customers: tabs All / With due / B2B, add/edit, import |
| `shop/credit/CreditUdhaarPage.tsx` | Credit customers, statement, receive payment, WhatsApp reminders |
| `shop/suppliers/SuppliersPage.tsx` | Suppliers, ledger, add supplier, record payment |
| `shop/products/ShopProductList.tsx` | Product list with filters and delete |
| `shop/products/ShopProductDetail.tsx` | Product detail with images and AI colour previews |
| `shop/products/ShopProductForm.tsx` | Create/edit product, photos, optional AI photo tools |
| `shop/stock/StockPage.tsx` | Stock summary, adjust, physical audit |
| `shop/stock/StockAdjustmentPage.tsx` | Formal stock adjustment with number and history |
| `shop/stock/StockTransferPage.tsx` | Request, dispatch, receive stock between shops; pick list print |
| `shop/barcode/BarcodeLabelsPage.tsx` | Make barcode labels from a purchase bill or picked products, reprint |
| `shop/accounts/CashBookPage.tsx` | Cash book, cash in/out, bank deposit, day close |
| `shop/accounts/ShopExpensesPage.tsx` | Add and list shop expenses |
| `shop/staff/StaffRightsPage.tsx` | Staff rights, shift, attendance, request new staff |

---

## 7. What each user can do (plain language)

### Auth (not signed in)
- Sign in with email or mobile number and password; each role lands on its own start page.
- Create a customer account (name, email, phone, password).
- Ask for a password reset link, then set a new password from the email link.
- After sign-in: change password (and optionally sign out other devices), edit own profile.
- Light/dark mode choice is stored in the browser.

### Customer (`/account`)
- See own account details.
- See orders; cancel an order or request a return.

### Employee (`/employee/dashboard`)
- See own details and workplace and which shop modules were given (view or edit).
- Open the shop screens of those modules; view-only users see a notice and cannot save.

### Super admin
- See platform counts (companies, branches, shops, users).
- Add, edit, search, filter and delete companies.
- View all branches and shops (filter by company); view all user accounts and change status.
- Maintain the global category tree and global brands.
- View and edit products of all companies; publish or unpublish.
- See and update status of all online orders.

### Company admin
- See company dashboard counts and own company details.
- Add and edit own branches, shops (with shop login) and employees (with password).
- Manage own brands (global brands read-only); manage products, with images and publishing.
- View inventory and online orders; run offers and coupons.

### Branch admin
- Branch dashboard: today's sales by shop, pending approvals, purchases, customer dues.
- Edit branch profile; add and edit shops and shop logins; invite staff; approve or reject staff requests; move employees between shops.
- Approve or reject refund credit notes and stock transfers (choose source shop).
- Set product prices (single, bulk, scheduled); add products.
- View stock, adjust stock, print barcode labels, manage suppliers and purchase returns.
- View all shops' purchase bills, sales bills (read-only), returns, customer dues (set credit limits, send reminders, export).
- Handle online orders; see and add branch expenses; review each shop's day close and record bank deposit.
- Profit and loss report; offers and coupons.

### Shop (shop login, or employee with modules)
- Dashboard: sales today, cash in drawer, gross profit, online order queue; open and close the counter.
- Bill customers at the POS (search/scan items, discounts, GST, cash/UPI/card/credit, hold bills with F8, shortcuts F1/F4/F6).
- Manage sales and purchase bills (confirm, cancel, edit, record payments); take sales returns and purchase returns.
- Manage customers (tabs, import) and credit/udhaar (statements, receipts, WhatsApp reminders); manage suppliers and ledgers.
- Manage products (with photos and AI photo helpers) and masters (categories, subcategories, colours, sizes).
- Stock: view, adjust, physical audit, request/dispatch/receive transfers, print barcode labels.
- Accounts: cash book, bank deposit, day close, expenses; profit and loss report.
- Handle online orders; manage staff rights, shifts and attendance, request new staff; manage employees and promotions (shop login only).

---

## 8. Things to know before changing code

- Add a page: create a file in `src/routes/_app/<role>/...lazy.tsx`, run `npm run dev` (regenerates `routeTree.gen.ts`), then add the screen in `src/pages`.
- Add an endpoint: api function -> React Query hook -> use in page. Invalidate related query keys after writes.
- Role prefixes decide access, so put a new page under the right prefix; shop pages for employees also need an entry in `SCREEN_MODULE`.
- Dead or legacy code exists (catering validation schemas, notification API, `queryKeys.ts` enums, `README.md`, `my-three-app`, `BranchDashboard.tsx`, `ComingSoon.tsx`, `BranchSuppliersPage.tsx`, `BranchProfile.tsx`). Check usages before deleting.
- Some POS/stock/supplier pages contain hard-coded sample defaults in comments (e.g. auto-selecting a sample customer or supplier name when present); data itself comes from the API.

## Summary

1. The admin app is React + Vite + TanStack Router (file routes) + React Query + Axios + Tailwind, booted from `main.tsx` -> `App.tsx` with auth, toast, query and router providers.
2. Six roles (SUPER_ADMIN, ADMIN, SUB_ADMIN, SHOP_ADMIN, EMPLOYEE, USER) each own a URL prefix; `AppLayout` checks the session via `/users/me`, and employees reach shop screens only through per-module view/edit permissions.
3. Data flows page -> React Query hook -> `lib/api` function -> axios (token, auto refresh, `/shop-admin` to `/employee` rewrite) -> backend; shared pages take a `panel` prop to serve many roles.
4. All 74 page files, the lib folders, hooks, layouts and config are tabulated above with their purpose and URL mapping.
5. Legacy catering leftovers (validation schemas, notification API, README, `my-three-app`) are unused and can confuse newcomers.
