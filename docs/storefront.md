# Customer Storefront (`user/`)

The storefront is the website customers use to browse clothes, save favourites, fill a bag, pay and track orders. It is branded **"Cloth Pro"** (page title: "Cloth Pro - Shop clothing from local stores"). It never talks to the database directly: every action is a call to the backend's `/store` API (plus a few `/users` calls for sign-in).

> Note: `user/README.md` is a leftover from an old "Catering Management System" template. It does not describe this app. Ignore it.

## 1. Tech stack

| Piece | Tool | What it does (plain words) |
|---|---|---|
| UI | React 18 + TypeScript | Builds the pages |
| Build tool | Vite 5 | Dev server and production build |
| Routing | TanStack Router (file-based) | Each file in `src/routes/` becomes a page. `src/routeTree.gen.ts` is generated automatically (not committed) |
| Server data | TanStack React Query | Fetches, caches and refreshes API data (30 s cache, 1 retry) |
| HTTP | axios | Sends requests, adds the login token |
| Styling | Tailwind CSS 3 (+ PostCSS) | Utility classes in the markup |
| Forms | react-hook-form + zod (installed) | Form helpers (the screens read here mostly use plain React state) |
| Toasts | react-hot-toast | Small pop-up messages |
| Icons | lucide-react | Icon set |
| Login token | jwt-decode | Reads the token's expiry so it can be renewed early |
| Online payment | Razorpay checkout script | Loaded from `checkout.razorpay.com` only when the customer pays online |
| Code quality | ESLint, Prettier, Husky + lint-staged | Pre-commit hook runs `npx lint-staged` |

The `@` import alias points to `user/src`.

## 2. Scripts and setup

Run from the `user/` folder.

| Command | What it does |
|---|---|
| `npm install` | Install packages |
| `npm run dev` | Start dev server at **http://localhost:5174** (`--host`, so reachable from your phone on the same Wi-Fi) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built site on port 5174 |
| `npm run typecheck` | TypeScript check with no output files |

Environment variable (create `user/.env`, it is git-ignored):

| Name | Meaning |
|---|---|
| `VITE_SERVER_URL` | Backend API base URL, e.g. `http://localhost:3500/api/v1` (match the backend `PORT`). **Required**: `lib/api.ts` reads it at start-up and the app breaks without it |

The backend must also allow the storefront's address: put `http://localhost:5174` in the backend `CORS_ORIGINS`, and set `STORE_URL` (used in links such as password-reset emails).

## 3. How the app starts (`main.tsx`)

1. Creates a React Query client.
2. Wraps everything in `AuthProvider` (knows who is signed in).
3. Starts the router, which shows `Layout` (header, footer, mobile tab bar) around every page (`routes/__root.tsx`). Unknown URLs show a "Page not found" screen.
4. Adds a toast area at the top centre.

## 4. Pages (routes)

"Sign-in needed" means the page is wrapped in `RequireAuth`: a signed-out visitor is sent to `/signin?redirect=<where they were>` and returned afterwards. (Verified in code for `/bag`, `/checkout`, `/payment`, `/order-placed`, `/invoice/:id` and `/account/*`.)

| URL | File | Sign-in needed? | Purpose |
|---|---|---|---|
| `/` | `routes/index.tsx` | No | Home: banners, categories, product rows |
| `/products` | `routes/products.tsx` | No | Product list with search, filters, sorting |
| `/product/:id` | `routes/product.$id.tsx` | No to view (cart/wishlist actions need an account) | Product detail: photos, colour/size picker, price, reviews |
| `/bag` | `routes/bag.tsx` | Yes | Bag: change quantity, remove, move to wishlist, coupon, totals, free-delivery progress |
| `/checkout` | `routes/checkout.tsx` | Yes | Step 2: choose or add delivery address and delivery speed |
| `/payment` | `routes/payment.tsx` | Yes | Step 3: online (Razorpay) or cash on delivery, place the order. With `?ref=` it is the "retry payment" screen |
| `/order-placed` | `routes/order-placed.tsx` | Yes | Thank-you page after an order |
| `/invoice/:id` | `routes/invoice.$id.tsx` | Yes | Printable invoice for an order |
| `/signin` | `routes/signin.tsx` | No | Sign in with email/phone + password |
| `/signup` | `routes/signup.tsx` | No | Create a customer account (must accept terms) |
| `/forgot-password` | `routes/forgot-password.tsx` | No | Ask for a reset link |
| `/reset-password` | `routes/reset-password.tsx` | No | Set a new password with the emailed token |
| `/help` | `routes/help.tsx` | No | Help topics and a contact/support form |
| `/account` | `routes/account.tsx` | Yes | Account area shell with side menu; all `/account/*` pages sit inside it |
| `/account/` | `routes/account/index.tsx` | Yes | Overview |
| `/account/orders` | `routes/account/orders.tsx` | Yes | Order list with tabs and search |
| `/account/order/:id` | `routes/account/order.$id.tsx` | Yes | One order: tracking steps, cancel, return, buy again |
| `/account/returns` | `routes/account/returns.tsx` | Yes | Return/refund requests and status |
| `/account/wishlist` | `routes/account/wishlist.tsx` | Yes | Saved products |
| `/account/addresses` | `routes/account/addresses.tsx` | Yes | Manage saved addresses |
| `/account/reviews` | `routes/account/reviews.tsx` | Yes | Reviews written |
| `/account/notifications` | `routes/account/notifications.tsx` | Yes | Notifications, read/unread |
| `/account/profile` | `routes/account/profile.tsx` | Yes | Edit details, change password |
| `/account/help` | `routes/account/help.tsx` | Yes | Redirects to `/help` |

## 5. Main flows

### 5.1 Sign-in and session
1. `signin` posts to `/users/login`. If the returned user's role is not `USER` (customer), the app refuses: "This is a staff account. Please use the Cloth Pro panel to sign in."
2. Access and refresh tokens are saved in localStorage under `clothpro.store.token`.
3. `GET /users/me` is loaded to learn who the customer is.
4. Before each request the axios interceptor checks the token expiry; if it ends within 10 seconds it calls `/users/refresh` once (shared by parallel requests). If renewal fails, or any call returns 401 while a token exists, the customer is signed out and cached private data is cleared.
5. Sign-out calls `/users/logout` and wipes tokens and cached private data.

### 5.2 Sign-up and password reset
- Sign-up: `POST /users/register`, then the customer is returned to the page they came from.
- Forgot password: `POST /store/auth/forgot-password`; the email links to `/reset-password`, which calls `POST /store/auth/reset-password`.
- Change password (profile): `POST /store/profile/password`; the new tokens are kept (`adoptTokens`) so the customer stays signed in.

### 5.3 Browsing
Home, product list, product detail, search suggestions, coupons, payment config and help info are public API endpoints (no login needed).

### 5.4 Wishlist
The heart button (`WishlistHeart` in `ProductCard.tsx`) adds or removes a product (`POST`/`DELETE /store/wishlist/:id`). `GET /store/wishlist/ids` is loaded once so every heart knows its state. In the bag, "move to wishlist" removes the line with `?toWishlist=true`.

### 5.5 Bag (cart)
- Add: `POST /store/cart/items` with a variant id (a variant = a specific colour + size).
- Change quantity: `PATCH /store/cart/items/:id`. Remove: `DELETE /store/cart/items/:id`.
- The server calculates totals, coupon discount, delivery fee and free-delivery progress; the page shows `GET /store/cart?coupon=..&delivery=..`. If an item is unavailable, `hasProblems` is true and "Continue" is disabled.
- Available coupons come from `GET /store/coupons`.
- The cart lives on the server (customer-only), so a signed-out visitor must sign in first.

### 5.6 Checkout (3 steps: Bag, Address and delivery, Payment)
Choices (coupon, delivery option - `STANDARD` by default, address id) are kept in `sessionStorage` under `clothpro.checkout` (lost when the tab closes).
1. **Bag** (`/bag`): review items, apply coupon.
2. **Address** (`/checkout`): pick or add an address (`/store/addresses`), pick delivery option. Empty bag sends you back to `/bag`.
3. **Payment** (`/payment`): `POST /store/checkout` creates the order(s). The reply tells the payment method:
   - **Cash on delivery**: go to `/order-placed`.
   - **Online**: the Razorpay window opens. On success the app calls `POST /store/payments/verify` (server checks the signature) and goes to `/order-placed`. If the window is closed or payment fails, `POST /store/payments/failed` is called and the customer lands on `/payment?ref=<razorpay order id>`, where they can retry (`/store/payments/retry`) or switch to cash on delivery (`/store/payments/cod`). Status is read from `GET /store/payments/:razorpayOrderId`.
   - Whether online payment is offered comes from `GET /store/payment-config` (`online` true/false).
   - One checkout can create more than one order (the thank-you page receives a list of order ids).

### 5.7 After the order
- `/account/orders`: tabs and search (`GET /store/orders?tab=&q=`).
- Order detail: status steps with labels like "Order placed", "Packed", "Out for delivery", "Delivered", "Cancelled", "Returned" (from `lib/format.ts`).
- **Cancel**: `POST /store/orders/:id/cancel` (optional reason).
- **Return**: `POST /store/orders/:id/return`; photos are uploaded first to `POST /store/uploads`. The reply has a refund amount and resolution. Track in `/account/returns`.
- **Buy again**: `POST /store/orders/:id/buy-again` adds items to the bag and reports which were skipped.
- **Review**: `POST /store/products/:id/reviews` (stars, text, photos).
- **Invoice**: `/invoice/:id`, shown from order data for printing.
- **Notifications**: list, unread count (badge in header/tab bar), mark one or all read.

## 6. Backend endpoints used

Base URL = `VITE_SERVER_URL`. Every reply is shaped `{statusCode, data, message}`; `lib/api.ts` returns just `data`. On the backend, `/store` routes from the cart onward require a signed-in customer (`role = USER`).

| Group | Method + path | Used for |
|---|---|---|
| Auth (`/users`) | `POST /users/register`, `/users/login`, `/users/refresh`, `/users/logout`; `GET /users/me` | Sign-up, sign-in, token renewal, sign-out, current customer |
| Public | `GET /store/home` | Home page content |
| Public | `GET /store/products`, `/store/products/:idOrSlug` | List and detail |
| Public | `GET /store/search/suggest` | Search suggestions |
| Public | `GET /store/coupons`, `/store/payment-config`, `/store/help` | Coupons, payment options, help topics and return reasons |
| Public | `POST /store/support`, `/store/auth/forgot-password`, `/store/auth/reset-password` | Contact form (signed out), password reset |
| Public | `GET /store/delivery/:pincode` | Delivery estimate. Exists on the backend; `queries.ts` does not call it (a page may call it directly, not checked) |
| Cart | `GET /store/cart`; `POST /store/cart/items`; `PATCH`/`DELETE /store/cart/items/:id` | Bag |
| Wishlist | `GET /store/wishlist`, `/store/wishlist/ids`; `POST`/`DELETE /store/wishlist/:id` | Favourites |
| Addresses | `GET`/`POST /store/addresses`; `PATCH`/`DELETE /store/addresses/:id` | Address book |
| Checkout | `POST /store/checkout` | Place order |
| Payments | `POST /store/payments/verify`, `/failed`, `/retry`, `/cod`; `GET /store/payments/:razorpayOrderId` | Razorpay and COD handling |
| Orders | `GET /store/orders`, `/store/orders/:id`; `POST /store/orders/:id/cancel`, `/return`, `/buy-again` | Order history and actions |
| Returns | `GET /store/returns` | Return list |
| Reviews | `GET /store/reviews`; `POST /store/products/:id/reviews` | Reviews |
| Profile | `GET`/`PATCH /store/profile`; `POST /store/profile/password` | Account details |
| Support | `POST /store/support/mine` | Contact form (signed in) |
| Uploads | `POST /store/uploads` (multipart field `photo`) | Review/return photos |
| Notifications | `GET /store/notifications`, `/store/notifications/unread`; `POST /store/notifications/read-all`, `/store/notifications/:id/read` | Notification centre |

## 7. Data kept in the browser

| Key | Where | Holds |
|---|---|---|
| `clothpro.store.token` | localStorage | Access + refresh tokens |
| `clothpro.checkout` | sessionStorage | Coupon, delivery option, address id for the current checkout |
| `clothpro.recentSearches` | localStorage | Recent search words in the search box |

## 8. Every tracked file in `user/`

### Config and root files

| File | What it is |
|---|---|
| `package.json` / `package-lock.json` | Dependencies and scripts (package name `clothpro-store`) |
| `index.html` | HTML shell, title and description, loads `src/main.tsx` |
| `vite.config.ts` | Vite config: TanStack router plugin, React plugin, `@` alias, chunk warning limit 1500 |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | TypeScript settings (project root, app code, node tooling) |
| `tailwind.config.js`, `postcss.config.js` | Tailwind theme and PostCSS plugins |
| `.eslintrc.cjs`, `.prettierrc` | Lint and format rules |
| `.husky/pre-commit` | Runs `npx lint-staged` before each commit |
| `.gitignore` | Ignores node_modules, dist, logs, env files, editor files |
| `README.md` | Outdated catering template text (not about this app) |

### `src/` entry

| File | What it is |
|---|---|
| `main.tsx` | Starts React, React Query, auth, router, toasts |
| `index.css` | Tailwind layers and base styles |
| `vite-env.d.ts` | Vite type declarations |

### `src/lib/` (logic, no screens)

| File | What it is |
|---|---|
| `api.ts` | axios client, token storage, auto-refresh, 401 handling, `api.get/post/patch/del`, `errorMessage`, `fieldErrors` |
| `auth.tsx` | `AuthProvider` and `useAuth()`: me, loading, signedIn, signIn, signOut, adoptTokens |
| `queries.ts` | Every React Query hook and API call (home, products, cart, wishlist, addresses, checkout, payments, orders, returns, reviews, notifications, profile, help) |
| `types.ts` | TypeScript shapes of API data (products, cart, orders, returns, etc.) |
| `format.ts` | Rupee and date formatting, order status labels, plural and size text helpers |

### `src/components/` (shared pieces)

| File | What it is |
|---|---|
| `Layout.tsx` | Header (nav, search with recent searches, wishlist/bag/account icons), footer, wraps all pages |
| `MobileTabBar.tsx` | Bottom tab bar on phones (hidden on checkout and sign-in pages) |
| `ProductCard.tsx` | Product tile, wishlist heart, product grid |
| `AddressForm.tsx` | Address form with state list, plus `AddressLines` display |
| `AuthShell.tsx` | Layout for sign-in/up pages, `PasswordInput`, `FormAlert` |
| `account.tsx` | Account helpers: page header, status chips, tabs, tracking stepper, star input, photo picker, dialog, field error |
| `checkout.tsx` | `RequireAuth` guard, checkout choice store, step indicator, price summary |
| `ui.tsx` | Basic UI: button/input styles, product visual (colour swatch), price, stars, badge, spinner, empty and error boxes, section title |

### `src/routes/` (pages): see section 4 for what each page does

`__root.tsx`, `index.tsx`, `products.tsx`, `product.$id.tsx`, `bag.tsx`, `checkout.tsx`, `payment.tsx`, `order-placed.tsx`, `invoice.$id.tsx`, `signin.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `help.tsx`, `account.tsx`, and in `account/`: `index.tsx`, `orders.tsx`, `order.$id.tsx`, `returns.tsx`, `wishlist.tsx`, `addresses.tsx`, `reviews.tsx`, `notifications.tsx`, `profile.tsx`, `help.tsx`.

The generated `src/routeTree.gen.ts` is created by the Vite plugin and is not tracked in git.
