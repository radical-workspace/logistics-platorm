# Copilot instructions (Logistics Platform)

## Big picture
- Next.js 16 App Router project (React 19 + TypeScript strict) with Tailwind CSS v4.
- Supabase is the backend: Auth (via `@supabase/auth-helpers-nextjs`) + DB + Realtime.

## Key flows & patterns (copy what exists)
- Route protection is middleware-driven: `middleware.ts` uses `createMiddlewareClient()` and redirects unauthenticated users away from `/admin/*` and `/dashboard/*`.
- Realtime UI updates follow the pattern in `app/dashboard/shipments.tsx`: fetch initial rows, then subscribe to `postgres_changes` INSERT/UPDATE, and cleanup via `removeChannel()` in the effect teardown.
- Interactive components are explicitly client components (top line `'use client'`), e.g. `app/composer/Header.js`.
   
   instructions copilot must follow 
   copilot prompt:
   As a senior fullstaack developer use the below instructions to help write code for a logistics platform web application. The app uses Next.js 13+ with the App Router, Tailwind CSS for styling, and Supabase for backend services including authentication, database, and real-time updates. Follow the established patterns in the existing codebase for route protection, real-time UI updates, and client components to ensure consistency and maintainability across the application, example of what is needed below.

   # High-Level Architecture & Tech Stack   Layer	Technologies & Tools	Description
Frontend	Next.js 13+ (with App Router), React, Tailwind CSS	Modern, performant UI with React and Next.js SSR/SSG capabilities
Backend / Authentication	Supabase (PostgreSQL + Auth + Realtime)	Managed backend with auth, database, real-time updates
Database	Supabase/PostgreSQL	Enterprise-level relational data storage
Real-Time Shipments Updates	Supabase Realtime, WebSockets	Instant shipment status updates
Authentication	Supabase Auth (Email, OAuth)	Secure login system, email verification, 2FA if needed
Deployment & CDN	Vercel (Next.js default), Cloudflare, AWS	Reliable, scalable hosting and CDN
Phases of Implementation
1. Project Setup & Basic Infrastructure
Initialize Next.js app with TypeScript
Configure Tailwind CSS
Set up Supabase project with PostgreSQL, Auth, and Realtime
Connect Next.js app with Supabase
2. Authentication & User Management
Implement sign-up, login, email verification via Supabase Auth
Role-based access: Admin vs Customer
Protect routes using middleware or server-side checks
Store user profiles and roles in the database
3. Database Schema Design
Core tables:

Table	Description
users	user profiles, roles (admin/customer)
shipments	shipment details, statuses, origins, destinations, timestamps
shipment_updates	real-time status updates, timestamps
notifications	alerts, shipment status alerts for users
4. Dashboards
Admin Dashboard:
Manage users, roles
Manage shipments (create, assign, update statuses)
View reports and analytics
Access logs and audit trail
Customer Dashboard:
View their shipments
Track shipment status in real time
Receive notifications and alerts
Submit support tickets
5. Real-Time Shipment Tracking
Use Supabase Realtime for shipment status updates
WebSocket connections for instant data push
Visualize shipment routes on a map (using Leaflet.js or Mapbox)
6. Security & Compliance
Enforce role-based route protection
Data encryption at rest and in transit
Email verification, password reset, 2FA
Audit logs and activity tracking
7. Deployment & CI/CD
Automate deployment with Vercel
Environment variables management
Monitoring and error tracking (Sentry, LogRocket)

## Supabase usage
-Supabase Auth and User Role Mapping
When users sign up, store their role in the users table.
Use Supabase Auth claims (auth.uid(), auth.role()) for policies.
Implementation tip:

Use Postgres functions/triggers to automatically assign roles or set the role column after user registration.
4. Summary of Alias & Role Configuration
Alias / Role	Purpose	How to Configure
admin	Superuser/Admin	Use a specific Supabase service role with elevated privileges; assign to admin users in your users table. Enforce via policies.
customer	End-user customers	Regular users with limited access; policies restrict data access to their own shipments.
auth.uid()	User identity	Use in policies to match data ownership.
auth.role()	Role-based access	Use in policies to check user role; set during login or registration.


## Repo-specific gotchas (fix before deeper work)
The failure starts here:

validateSupabaseUrl


That function throws only when:

SUPABASE_URL is missing

SUPABASE_URL is empty

SUPABASE_URL is not a valid URL

or it is not available in the Edge runtime

Because proxy.ts runs at the Edge, it is stricter than normal server code.

Why this surfaced after switching to proxy.ts

proxy.ts runs:

during dev

during build

at the Edge runtime

So if you create a Supabase client inside proxy, Next.js validates the URL immediately.

That’s why this shows up now.

The real root cause (tell-it-like-it-is)

One of these is true in your project:

process.env.NEXT_PUBLIC_SUPABASE_URL is undefined

You used SUPABASE_URL instead of NEXT_PUBLIC_SUPABASE_URL

Your .env.local is not being loaded

The variable exists locally but not in build / Edge

You passed undefined into createServerClient

The correct, build-safe fix (DO THIS)
1️⃣ Verify your environment variables

In .env.local (root of project):

NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...


⚠️ Exact names matter

2️⃣ Use the correct pattern in proxy.ts

DO NOT manually create a client like this in proxy:

// ❌ fragile
createClient(process.env.SUPABASE_URL!, ...)

✅ Correct Edge-safe pattern
import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options })
        },
      },
    }
  )

  return response
}

3️⃣ Restart the dev server (mandatory)
npm run dev


Environment variables are not hot-reloaded.

Why this breaks npm run build

During build:

Next.js executes proxy

Supabase validates the URL

URL is missing → build fails

This is expected behavior.

Quick self-check (1 minute)

Add temporarily inside proxy.ts:

console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)


If it logs:

undefined → environment problem

a valid URL → code problem (rare)

Remove the log after confirming.

Bottom line

❌ This is not a Next.js proxy bug

❌ This is not a Supabase bug

✅ This is an environment variable + Edge runtime issue

✅ Fixing env names + using createServerClient correctly resolves it

✅ npm run build will pass cleanly after this

- `@supabase/supabase-js` is imported by `lib/supabaseclient.ts` but is not listed in `package.json` dependencies; if dev fails with “cannot find module”, install it.
- Watch import paths/casing:
  - `app/dashboard/shipments.tsx` imports `../lib/supabaseClient` but the file is `lib/supabaseclient.ts`.
  - `app/page.tsx` imports `./components/Header`, but the Header component currently lives at `app/composer/Header.js`.

## Common commands
- `npm run dev` (Next dev server)
- `npm run lint` (ESLint)
- `npm run build` / `npm run start`

## Conventions
- Prefer minimal changes; keep the existing dark “slate + blue” Tailwind styling used on the landing page.
- Use the `@/*` path alias from `tsconfig.json` for new imports when possible.
