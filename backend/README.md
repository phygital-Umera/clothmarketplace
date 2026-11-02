# Cloth Pro - Backend

Express 5 + Prisma (PostgreSQL) API for the Cloth Pro Super Admin Panel.

## Setup

Requirements: Node 20+ and PostgreSQL 16 (local install, or Docker:
`docker run --name clothpro-db -e POSTGRES_PASSWORD=<password> -p 5432:5432 -d postgres:16`).

```bash
cd backend
cp .env.example .env          # then fill in DATABASE_URL, JWT_SECRET, CORS_ORIGINS
npm install
npx prisma generate
npx prisma migrate deploy     # creates all tables
npm run create:superadmin -- --email <you> --phone <10 digits> --password <8+ chars>
npm run dev                   # http://localhost:<PORT>/api/v1
```

Then in `frontend/.env` set `VITE_SERVER_URL=http://localhost:<PORT>/api/v1`
and run `npm install && npm run dev` in `frontend/`.

Never commit `.env`. Every variable is documented in `.env.example`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start with reload (ts-node-dev) |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm run lint` | ESLint |
| `npm run create:superadmin` | Create or reset the super admin and sync its permissions |
| `npm run prisma:migrate:dev` | Create a new migration after editing `prisma/schema.prisma` |
| `npm run prisma:migrate:deploy` | Apply committed migrations |

## Conventions for new modules

- **Validation**: build every field rule with `field({label, kind})` from
  `src/validations/custom.validation.ts`. Errors use the field's label
  ("Business Email is required"). Mirror of `frontend/src/lib/validation/fieldRules.ts`.
- **Lists**: use `listQuerySchema`, `searchWhere`, `listArgs`, `toListResult`
  from `src/utils/list.ts`. Response: `{items, pagination: {page, limit, total, totalPages}}`.
- **Permissions**: add new permission strings to `src/config/permissions.ts`
  (SUPERADMIN gets them on the next start) and guard routes with
  `checkPermission('module.action')` after `verifyJWT`.
- **Audit log**: call `auditService.log({...auditService.fromRequest(req), action, module, targetId, before, after})`
  for every important change. The table is append-only; secrets are stripped automatically.
