# Logistics Platform

Enterprise logistics platform built with Next.js App Router, Tailwind CSS v4, and Supabase (Postgres + Auth + Realtime). Includes marketing site, customer dashboard, admin console, realtime shipments, and tracking map with fallback.

## Architecture
- Frontend: Next.js 13+ App Router, React 19, Tailwind CSS v4, next/font (Geist)
- Backend: Supabase (PostgreSQL, Auth, Realtime)
- Auth: Supabase email/password; roles (admin, customer) enforced in proxy and DB policies
- Realtime: Supabase Realtime over WebSockets for shipment/event streams; UI uses the pattern in `app/dashboard/shipments.tsx`
- Maps: MapLibre with public basemap; simulated preview fallback on failure
- Deployment: Vercel-ready; works behind Cloudflare/AWS CDNs

## Frontend vs Backend
- Frontend UI: `app/**` pages/components (except `app/api/**`), `app/components/**`, `public/**`
- Backend API routes: `app/api/**` (server-only code)
- Backend data layer: `lib/server/**` (Supabase admin, route clients, email)
- Frontend helpers: `lib/client/**` (api fetch, auth store, public Supabase client)
- Shared types/validation: `lib/shared/**` (types, zod schemas)
- DB layer: `supabase/**` (migrations, policies, SQL snippets)

## Features
- Public marketing + CTA pages (home, solutions, platform, company, contact)
- Tracking page with live map preview and fallback
- Customer dashboard: metrics, recent consignments, mission alerts, tracking preview
- Admin console `/admin`: admin-only overview, shortcuts to shipments/vehicles/tracking
- Shipments detail: realtime updates, assignment, and status updates

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` (required)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required)
- `SUPABASE_SERVICE_ROLE_KEY` (server only, required for admin routes)
- `SUPABASE_JWT_SECRET` (server only)
- `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`)
- Optional observability: `NEXT_PUBLIC_SENTRY_DSN` (client), `SENTRY_DSN` (server)
- Optional Sentry uploads: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- Optional email: `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `AFGHCO <onboarding@resend.dev>`)
- Optional map style: `NEXT_PUBLIC_MAP_STYLE_URL`

## Setup
1) Install deps: `npm install`
2) Create `.env.local` with Supabase keys (Dashboard → Settings → API)
3) Run migrations in `supabase/migrations/`:
   - Local (Supabase CLI local): `npm run db:migrate:local`
   - Hosted Supabase: `supabase link --project-ref <PROJECT_REF>` then `supabase migration repair --status applied <VERSION>` if needed, then `npm run db:push`
4) Start dev server: `npm run dev`

## Auth & Access Control
- Proxy protects `/dashboard`, `/admin`, `/dispatcher`; unauthenticated users go to `/dashboard/auth/login`
- Admin-only pages require `profiles.role === 'admin'`; enforce matching Postgres RLS/policies
- Users/profiles store roles; use `auth.uid()`/`auth.role()` in policies; triggers can set default roles on signup

## Dashboards
- Admin: overview metrics, mission alerts, shortcuts to shipments/vehicles/tracking
- Customer: overview metrics, shipments feed, alerts, tracking preview

## Realtime Pattern
- Fetch initial data, subscribe to `postgres_changes` INSERT/UPDATE, clean up with `removeChannel()` (see `app/dashboard/shipments.tsx`)

## Deployment & Operations
- Deploy to Vercel; set env vars in project settings
- Compatible with Cloudflare/AWS CDNs
- Add monitoring (Sentry/LogRocket) as needed
 - Health check: `GET /api/health` returns `{ ok: true }`

## Observability
- Structured server logs emit JSON from API routes (request IDs via `x-request-id`).
- Optional error tracking (Sentry):
  1) Install: `npm install @sentry/nextjs`
  2) Run: `npx @sentry/wizard -i nextjs`
  3) Set `SENTRY_DSN` in your environment

## CI
- GitHub Actions workflow runs `lint`, `test`, and `build` on push/PR.

## Data Model (core tables)
- `profiles`/`users`: role (admin/customer), identity
- `shipments`: details, status, origin/destination, timestamps
- `shipment_events`: milestone/status updates
- `notifications`: alerts to users

## Roadmap parity with brief
- Auth flows live under `/dashboard/auth/*` (login/register/reset/update-password)
- Role-based protection via proxy and DB policies
- Realtime shipment updates via Supabase Realtime
- Tracking map present with fallback; style override via env
- Admin console available; customer dashboards present
