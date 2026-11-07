# Project Overview: Phygital Cloth Marketplace + Shop ERP

## 1. What this product is

"Phygital" = physical + digital. One system serves two worlds:

- **In the physical shop**: a point-of-sale (POS) and ERP (business management) tool for clothing companies, branches and shops: products, stock, billing, purchase bills, returns, expenses, cash book, reports, staff.
- **Online**: a customer storefront ("Cloth Pro") where shoppers browse products from local stores, order, pay online or cash on delivery, and track delivery and returns.

Both sides share one backend and one database, so stock and orders stay in sync.

## 2. The three apps

| App | Folder | Tech | Who uses it | Default dev address |
|---|---|---|---|---|
| Backend API | `backend/` | Node.js, Express 5, TypeScript, Prisma, PostgreSQL | Used by both front ends | `http://localhost:<PORT>/api/v1` (the example env uses 3500) |
| Admin panel | `frontend/` | React, Vite, TanStack Router/Query, Tailwind | Staff roles | Vite default `http://localhost:5173` |
| Customer storefront | `user/` | React, Vite, TypeScript, TanStack Router/Query, Tailwind | Customers | `http://localhost:5174` |

### How they talk

```
 Admin panel (frontend/) --\                          /-- PostgreSQL (via Prisma)
                             >-- JSON over HTTP --> Backend (Express) -- uploaded files (public/uploads or hosted file server)
 Storefront (user/) -------/     /api/v1/...          \-- Razorpay (payments), SMTP email, Cloudflare AI (product previews)
```

- Both front ends send JSON requests with a **JWT** (login token) in the `Authorization: Bearer` header. Tokens are renewed with a refresh token.
- Every reply looks like `{statusCode, data, message}`.
- The backend groups its routes under `/api/v1`:

| Prefix | For |
|---|---|
| `/users` | Register, login, refresh, logout, current user |
| `/companies` | Company data |
| `/super-admin` | Platform owner features |
| `/company-admin` | Company-level features |
| `/branch-admin` | Branch-level features |
| `/shop-admin` | Shop-level features |
| `/employee` | Shop staff features |
| `/store` | Customer storefront: public catalogue + signed-in customer (cart, orders, etc.) |

Other route files exist for bills, catalogue, promotions, shop operations and staff cash. See `backend/src/routes/`.

## 3. User roles

The database role list (`Role` in `backend/prisma/schema.prisma`) has six values. The guards in `backend/src/middlewares/auth.middleware.ts` map them like this:

| Role | Database value | Admin-panel area (`frontend/src/routes/_app/`) | What they do (summary) |
|---|---|---|---|
| Super admin | `SUPER_ADMIN` | `super-admin/` | Owns the platform: companies, brands, categories, branches; sees all orders |
| Company admin | `ADMIN` | `company-admin/` | Runs one company: branches, shops, brands, products, employees, inventory, promotions, orders |
| Branch admin | `SUB_ADMIN` | `branch-admin/` | Runs one branch: shops, staff, stock, bills, approvals, expenses, day close, reports, barcode labels |
| Shop admin | `SHOP_ADMIN` | `shop-admin/` | Runs one shop: products, categories/sizes/colours, new bill (POS), purchase bills, returns, credit, cash book, expenses, staff, reports |
| Shop staff | `EMPLOYEE` | `employee/` | Day-to-day shop work (dashboard); login is tied to a shop |
| Customer | `USER` | none (uses the `user/` storefront) | Shops online. The storefront refuses staff logins, and the `/store` customer routes accept only `USER` |

Note: in code the "company admin" is `ADMIN` (`checkCompanyAdmin`) and the "branch admin" is `SUB_ADMIN` (`checkBranchAdmin`).

## 4. Feature list (high level)

**Admin panel (staff)**
- Sign-in, change password, my profile, role dashboards
- Companies, branches, shops, employees and staff
- Brands, categories, sub-categories, sizes, colours
- Product catalogue (create/edit, photos, AI product previews)
- Inventory and stock: stock view, adjustments, transfers
- Billing: new sales bill (POS), sales bills, sales returns
- Purchasing: suppliers, purchase bills, purchase returns
- Money: expenses, cash book, credit, day close, approvals
- Promotions and coupons
- Barcode labels, customer lists, online order management
- Reports (Excel and PDF export libraries are installed)

**Customer storefront** (details in `docs/storefront.md`)
- Home, product list with search and filters, product detail
- Sign-up, sign-in, password reset
- Wishlist, bag, coupons, addresses
- Checkout with online payment (Razorpay) or cash on delivery
- Orders: tracking, cancel, return, buy again, invoice
- Reviews with photos, notifications, profile, help and support

## 5. Repo map

| Path | What is inside |
|---|---|
| `backend/` | API: `src/` (routes, controllers, services, middlewares, validations, config, `cli/` scripts), `prisma/` (schema, migrations), `public/` (uploads), `scripts/` (one-off role migration scripts), `workers/` (`segment.cjs`), `docs/` |
| `frontend/` | Admin panel: `src/` (routes, pages, components, context, hooks, layouts, lib, types, utils), `scripts/`, `my-three-app/` (a separate small app with its own package.json), `.env.example` |
| `user/` | Customer storefront (see `docs/storefront.md`) |
| `docs/` | Documentation (`backend/` and `frontend/` subfolders, plus these files) |
| `chat.txt` | Not code. A saved QA test report and planning transcript (dated 2026-10-30) for backend and frontend: lists critical/high/medium/low issues from a manual code review, a recommended fix order, a re-test checklist, and later notes on existing auth models and planned changes. Treat it as historical notes |
| `.gitignore` | Ignores `node_modules/`, build output (`dist/`, `build/`), all `.env` files except `.env.example`, logs, editor and OS files, `.cache/`, `.temp/` |

Also in `frontend/`: two stray `vite.config.ts.timestamp-*.mjs` files (temporary files Vite leaves behind; not needed).

## 6. Run everything locally

**Prerequisites**: Node.js 20.6 or newer (the backend scripts use `node --env-file`), npm, and a running PostgreSQL.

### Step 1: Backend

```
cd backend
npm install
copy .env.example .env        (Mac/Linux: cp)  then fill in the values
npm run prisma:generate
npm run prisma:migrate:dev
npm run create:superadmin -- --email <email> --phone <10 digits> --password <8+ chars>
npm run seed:demo             (optional demo data)
npm run dev
```

Environment variable **names** in `backend/.env.example` (use your own values; never commit `.env`):

| Group | Names |
|---|---|
| Server | `NODE_ENV`, `PORT`, `CORS_ORIGINS`, `FRONTEND_URL`, `STORE_URL`, `TRUST_PROXY` |
| Database | `DATABASE_URL` |
| Auth | `JWT_SECRET`, `JWT_ACCESS_EXPIRATION_MINUTES`, `JWT_REFRESH_EXPIRATION_DAYS`, `JWT_RESET_PASSWORD_EXPIRATION_MINUTES`, `JWT_VERIFY_EMAIL_EXPIRATION_MINUTES`, `BCRYPT_SALT_ROUNDS` |
| Super admin (optional) | `SUPERADMIN_EMAIL`, `SUPERADMIN_PHONE`, `SUPERADMIN_PASSWORD`, `SUPERADMIN_NAME` |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `EMAIL_FROM` |
| Uploads | `IS_OFFLINE`, `HOSTED_BACKEND_URL`, `ONLINE_BACKEND_URL` |
| AI previews | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_API_TOKEN`, `CLOUDFLARE_AI_MODEL` |
| Payments | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (test keys start with `rzp_test_`) |
| Old / unused | `SOP_URL`, `CLOUDINARY_*`, `AWS_*` (the example file says current code does not read them) |

Set `CORS_ORIGINS` to include both front-end addresses, for example `http://localhost:5173,http://localhost:5174`.

| Backend script | Does |
|---|---|
| `npm run dev` | Dev server with auto-restart |
| `npm run build`, then `npm start` | Compile to `dist/` and run it |
| `lint`, `lint:fix`, `prettier`, `prettier:fix`, `format` | Code quality |
| `prisma:generate`, `prisma:migrate:dev`, `prisma:migrate:deploy`, `prisma:studio`, `prisma:db:seed`, `prisma:reset` | Database tools (`prisma:reset` wipes the database) |
| `create:superadmin`, `seed:demo` | Create the first super admin; load demo data |

### Step 2: Admin panel

```
cd frontend
npm install
npm run dev
```
Create `frontend/.env` from `.env.example` first. It has one variable, `VITE_SERVER_URL` (the backend API URL, e.g. `http://localhost:3500/api/v1`).

| Script | Does |
|---|---|
| `dev` | Vite dev server (`--host`) |
| `build` | Production build |
| `lint`, `format` | ESLint (no warnings allowed), Prettier |
| `preview` | Serve the build |

### Step 3: Customer storefront

```
cd user
npm install
npm run dev
```
Create `user/.env` first with `VITE_SERVER_URL=http://localhost:<backend PORT>/api/v1`. Opens on port 5174. Full details: `docs/storefront.md`.

### Quick check
1. Open the admin panel and sign in as the super admin you created; set up a company, branch, shop and products.
2. Open `http://localhost:5174`, sign up as a customer, add a product to the bag and check out with cash on delivery.

Customers cannot sign in to the admin panel, and staff cannot sign in to the storefront.
