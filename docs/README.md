# Project Documentation — Phygital Cloth Marketplace

Start here. Read the files in this order if you are new.

| # | File | What you learn |
|---|------|----------------|
| 1 | [project-overview.md](project-overview.md) | What the product is, the 3 apps, user roles, features, repo map, how to run everything |
| 2 | [backend/01-database-and-core.md](backend/01-database-and-core.md) | Startup, env variables, all database models, migrations, middlewares, utils, CLI |
| 3 | [backend/02-api-routes-controllers.md](backend/02-api-routes-controllers.md) | Every API endpoint, who can call it, which controller handles it |
| 4 | [backend/03-services-business-logic.md](backend/03-services-business-logic.md) | The business rules (billing, stock, credit, orders) and key flows step by step |
| 5 | [frontend/01-app-structure-pages-lib.md](frontend/01-app-structure-pages-lib.md) | Admin app: boot, routes, auth, data fetching, every page |
| 6 | [frontend/02-components-retail-and-shared.md](frontend/02-components-retail-and-shared.md) | Current components and the shared UI kit |
| 7 | [frontend/03-components-legacy-catering.md](frontend/03-components-legacy-catering.md) | Old catering-app leftovers (unused) |
| 8 | [storefront.md](storefront.md) | Customer shopping app (`user/`) |

## The project in one paragraph
Three apps share one backend: **backend/** (Express + Prisma API), **frontend/** (admin and shop-staff app) and **user/** (customer storefront). Shops sell in person (POS billing) and online; stock, credit and orders are tracked per company → branch → shop.

## Things worth fixing (collected from the docs)
These were found by reading the code. Nothing has been changed.

**Security / config**
- XSS cleaning middleware is imported but commented out in `backend/src/app.ts`.
- CORS is hard-coded to `*`; `CORS_ORIGINS` is read but not enforced.
- `CLOUDFLARE_AI_PRO_MODEL`, `CLOUDFLARE_AI_FOR_COLOURS`, `ASSET_BASE_URL` are used but missing from `backend/.env.example`.
- `backend/public/backup-test.html` has a hard-coded dev-tunnel URL.

**Backend logic**
- In the shop router, `GET /customers` is answered by the bill controller, so the customer controller's `list` is unreachable there.
- `stock.service`, `stockAdjustment.service` and `purchaseReturn.service` bypass the safe `applyStockChanges` engine; purchase returns write no stock movement.
- Two order paths (`order.service` and `store/checkout.service`) and two return systems (`SalesReturn` and credit notes) both exist.
- `stock.validation.ts` looks unused.

**Frontend**
- All 16 catering folders (158 files), plus many unused components, old `lib/validation` schemas, old notification API and `my-three-app`, look deletable. The docs give the evidence; verify with a build before deleting.
- Some pages are not routed (`BranchProfile`, `BranchSuppliersPage`, `ComingSoon`).
- `mustChangePassword` is returned at login but never acted on.
- `user/README.md` and `frontend/README.md` are leftover catering templates.

## How accurate is this?
Written by reading the code with several parallel reviewers; nothing was run. Some per-file descriptions (especially legacy components and less central services) come from file names, comments and main logic rather than every line. Each doc says where it inferred.
