# Magil Clinic ERP

Full-stack clinic management system — patients, appointments, billing, pharmacy, HR, finance, and more.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, Tailwind 4, shadcn/ui |
| Backend | Express 5, Prisma 7, SQLite |
| Storage | SQLite (local) · Cloudflare R2 (documents, optional) · D1 (production DB, planned) |

## Quick Start (Local)

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run db:setup    # push schema + seed
npm run dev         # http://localhost:5001

# Frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev         # http://localhost:3000
```

Auth is bypassed for development (`DEV_MOCK_USER` in `frontend/src/lib/auth.ts`). Login credentials after seed: `admin@magilclinic.com` / `admin123`.

## Project Structure

```
MagilClinic/
├── frontend/          # Next.js app (port 3000)
├── backend/           # Express API + Prisma (port 5001)
├── wrangler.toml      # Cloudflare R2 / D1 config
└── README.md
```

## Cloudflare Deployment

### Frontend → Cloudflare Pages

The frontend uses **static export** (`output: "export"`). Build and deploy:

```bash
cd frontend
npm run build          # outputs to frontend/out/
npx wrangler pages deploy out --project-name=magil-clinic
```

**Build settings** (Cloudflare Pages dashboard):
- Build command: `cd frontend && npm ci && npm run build`
- Build output directory: `frontend/out`
- Environment variable: `NEXT_PUBLIC_API_URL=https://your-api-url.com`

> **Note:** Dynamic patient pages are pre-rendered at build time via `generateStaticParams`. Rebuild after adding patients for production URLs, or host the API and set `NEXT_PUBLIC_API_URL` during CI build.

### Backend

Express + SQLite **does not run on Cloudflare Pages**. Options:

1. **Recommended:** Deploy backend to Railway, Fly.io, Render, or a VPS. Point `NEXT_PUBLIC_API_URL` to it.
2. **Future:** Migrate API to Cloudflare Workers + D1 using `wrangler.toml` bindings.

### R2 Document Storage

Set these in `backend/.env` (see `.env.example`):

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=magil-clinic-documents
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

Create bucket: `wrangler r2 bucket create magil-clinic-documents`

When R2 is configured, patient document uploads are stored in R2 instead of base64 in SQLite.

### D1 Database (Production)

```bash
wrangler d1 create magil-clinic-db
# Add database_id to wrangler.toml, then migrate schema
```

## Scripts

| Command | Location | Description |
|---------|----------|-------------|
| `npm run dev` | frontend/backend | Start dev server |
| `npm run build` | frontend | Production static build |
| `npm run db:setup` | backend | Push schema + seed |
| `npm run db:seed` | backend | Re-seed demo data |

## License

Private — Magil Clinic
