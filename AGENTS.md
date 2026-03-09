# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Full-stack Brazilian e-commerce monorepo: **backend** (Node.js/Express/Prisma on port 3001) and **frontend** (React/Vite on port 5173). The Vite dev server proxies `/api` requests to the backend.

### Services

| Service | Port | How to start |
|---------|------|-------------|
| PostgreSQL 16 | 5432 | `sudo pg_ctlcluster 16 main start` |
| Redis | 6379 | `sudo redis-server --daemonize yes` |
| Backend | 3001 | `cd backend && npm run dev` |
| Frontend | 5173 | `cd frontend && npm run dev -- --host` |

### Database setup

After starting PostgreSQL, create the user/database if they don't exist:

```sh
sudo -u postgres psql -c "CREATE USER ecommerce WITH PASSWORD 'ecommerce_secret' CREATEDB;" 2>/dev/null
sudo -u postgres psql -c "CREATE DATABASE ecommerce_db OWNER ecommerce;" 2>/dev/null
```

Then apply migrations and seed:

```sh
cd backend && npx prisma migrate dev && npm run db:seed
```

Credentials are in `backend/.env` (DATABASE_URL).

### Gotchas

- **ESLint**: `npm run lint` in `frontend/` fails because `eslint.config.js` was never committed. This is a pre-existing gap — not a setup issue.
- **Backend tests**: `npm test` in `backend/` exits with code 1 because no test files exist yet. Use `--passWithNoTests` if needed.
- **Redis is optional**: The backend gracefully handles a missing Redis connection (caching is skipped). PostgreSQL is required.
- **External services** (Stripe, Cloudinary, Resend, OAuth) use placeholder keys in `.env`. They are not needed for core product browsing, cart, and order flows.
- **Seed data**: The seed creates an admin user (`admin@ecommerce.com` / `admin123`), 33 products, 2 categories, a coupon `PRIMEIRACOMPRA`, and 6 blog posts.
