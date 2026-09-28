# Eleven Growth

Client growth CRM and social analytics platform for **Eleven Media**.

```
Create client → Connect social account → Add content links → Collect analytics (daily) → Growth dashboard → Monthly report (PDF)
```

Replaces spreadsheet reporting with one platform. The agency team manages every client. Each client gets a private dashboard that can only ever show their own data.

**Stage 1 (this build):** auth and roles, admin and client dashboards, client management and invites, content library, YouTube OAuth and APIs, daily historical snapshots, analytics, and monthly reports with branded PDF output. The code is structured so Instagram, TikTok, Facebook and LinkedIn can be added as adapters (Stage 3).

---

## Tech stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript |
| UI | Tailwind CSS v4, custom black & emerald design system (dark-first, light mode included), Geist, lucide icons |
| Charts | Recharts |
| DB / Auth | Supabase Postgres + Supabase Auth, Row Level Security on every table |
| PDF | `@react-pdf/renderer` (server-side) |
| APIs | YouTube Data API v3, YouTube Analytics API v2, Google OAuth 2.0 |
| Hosting | Vercel (with Vercel Cron for the daily sync) |

---

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values (see below)
npm run dev                  # http://localhost:3000
```

Open the app and you land on the **setup screen**. It walks through three checks, each confirmed live:

1. Supabase keys are present.
2. The database schema is installed.
3. You create the **owner account**. This screen locks permanently once the owner exists.

After that, everything happens inside the app. A *Getting started* checklist on the dashboard tracks each step:

1. Add a client.
2. Connect their YouTube channel. Their recent uploads are imported automatically, with up to 90 days of real daily history from YouTube Analytics, so the charts are populated from day one.
3. Invite the client.
4. Generate their monthly report.

There is no sample or fake data anywhere in the app. Every number comes from the YouTube APIs.

```bash
npm test           # analytics engine, report builder, URL + history parsers
npm run typecheck
```

---

## Production setup

### 1. Supabase

1. Create a project at supabase.com.
2. Apply the schema, using either option:
   - **SQL editor:** paste and run `supabase/migrations/20260928000000_init.sql`.
   - **CLI:** `supabase link --project-ref <ref>` then `supabase db push`.
3. **Auth → Providers → Email:** turn **off** "Allow new users to sign up". Access is by invitation only.
4. **Auth → URL configuration:**
   - Site URL: `https://your-domain`
   - Redirect URLs: `https://your-domain/auth/confirm`
5. **Auth → Email templates.** Replace the link in these templates so they use the server-side token-hash flow:
   - **Invite user:**
     `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept invitation</a>`
   - **Reset password:**
     `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>`
6. **Create the owner account** on the app's `/setup` screen, which opens automatically on first run. Add more admins later from **Settings → Agency team → Invite admin**. Invite client users from each client's workspace. Roles are never taken from user-supplied metadata: they come only from invitations an admin creates.

### 2. Google Cloud (YouTube)

1. Create or choose a Google Cloud project and enable **YouTube Data API v3** and **YouTube Analytics API**.
2. **OAuth consent screen:**
   - User type: External
   - Scopes: `youtube.readonly` and `yt-analytics.readonly`
3. **Credentials:**
   - Create an **OAuth client ID** of type *Web application*.
   - Authorized redirect URI: `https://your-domain/api/integrations/youtube/callback` (add the `http://localhost:3000/...` version for local dev).
4. Optional: create an **API key** restricted to YouTube Data API v3 and set it as `YOUTUBE_API_KEY`. The app uses it for *public* video stats on videos whose channel hasn't been connected.

> **Important:** while the consent screen is in *Testing*, Google expires refresh tokens after 7 days, so daily sync stops after a week. Submit the app for verification (the YouTube scopes are "sensitive") before onboarding real clients.

### 3. Environment variables

Copy `.env.example` to `.env.local` locally, and set the same values in Vercel → Project → Settings → Environment Variables.

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | e.g. `https://growth.elevenmedia.com` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Used for invites, token storage and sync. |
| `TOKEN_ENCRYPTION_KEY` | `openssl rand -base64 32`. OAuth tokens are AES-256-GCM encrypted with it. **Don't rotate it without re-connecting accounts.** |
| `CRON_SECRET` | Any long random string. Vercel Cron sends it automatically. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth client from step 2 |
| `YOUTUBE_API_KEY` | Optional, for public stats only |

### 4. Deploy to Vercel

```bash
vercel link && vercel --prod
```

`vercel.json` schedules `GET /api/cron/sync` daily at 01:30 UTC. That job writes one snapshot per content item per day, and it's what makes historical reporting work. It's safe to run more often, because snapshots are upserted per day. **Settings → System status** in the app shows which configuration is present.

---

## How the analytics work

### Historical snapshots, not "current numbers"

Every sync stores **cumulative lifetime** metrics per content item per UTC day in `content_metrics`, for example:

| recorded_on | views |
|---|---|
| Day 1 | 100,000 |
| Day 7 | 150,000 |

Every period figure comes from these rows (`src/lib/analytics/engine.ts`):

```
gained(period) = cumulative(end of period) − cumulative(day before period)
```

This gives views generated in a period, weekly and monthly growth, top content for a period, trends, and period-over-period change.

Edge cases are handled honestly:

- **Published inside the period:** the content starts from 0, so its whole total counts toward the period.
- **Published before the period, with no earlier snapshot:** the first in-period snapshot becomes the baseline. The result can undercount but never overcounts, and it's marked with **≥** (or \* in PDFs) as a lower bound.
- **Missing metric:** a value the API didn't return is stored as `NULL` and shown as **"Not available"**. It's never converted to 0 or estimated.

### Subscribers and followers are four different measures

| Measure | Source | Where it's shown |
|---|---|---|
| **Total subscribers** (point in time) | `channels.list → statistics.subscriberCount` | Stored as `account_metrics.followers_total` |
| **Gained / lost during a period** (flow) | Analytics API `subscribersGained` / `subscribersLost` by day | Stored in `account_metrics`, 90 days backfilled on connect |
| **Net gained** | gained − lost | Dashboard "Subscribers gained" |
| **Attributed to specific content** | Analytics API `subscribersGained` per video | `content_metrics.followers_gained` |

The channel total is **never** assigned to individual videos.

### What YouTube provides

| Metric | Public video (API key) | Connected channel (OAuth) |
|---|---|---|
| Views, likes, comments | ✓ (likes are null if hidden; comments are null if disabled) | ✓ |
| Shares | Not available | ✓ (Analytics API) |
| Subscribers from video | Not available | ✓ (Analytics API) |
| Channel subscribers gained/lost by day | Not available | ✓ |
| Historical daily channel data | Not available | ✓ (backfilled) |

A public video URL never gives access to private channel analytics. Those always require the channel owner's OAuth consent. The owner can connect from their own client login, so the agency never needs their Google password.

YouTube Analytics data lags by roughly 48–72 hours. Reports include a note about this.

---

## Architecture

```
src/
  app/
    (auth)/login, forgot-password, reset-password
    (app)/dashboard, clients, clients/[id], content, analytics,
          reports, reports/[id], settings, integrations
    api/integrations/[platform]/connect|callback   OAuth (state cookie + CSRF check)
    api/cron/sync                                  daily snapshot job
    api/reports/[id]/pdf                           branded PDF
    auth/confirm                                   email links (invite / recovery)
  platforms/                     ← platform adapter architecture
    types.ts                     PlatformAdapter contract
    registry.ts                  single list of adapters
    detect.ts                    client-safe URL → platform detection
    youtube/   auth · client · content-parser · metrics-parser · sync · index
    instagram/ tiktok/ facebook/ linkedin/   same files; Stage 3 stubs, URL parsing live
  lib/
    analytics/engine.ts          pure snapshot maths (+ tests)
    reports/build.ts, pdf.tsx    frozen report payload + PDF
    sync/run.ts                  sync orchestration (service role)
    data/index.ts                RLS-scoped reads (clients only ever see their own rows)
    setup.ts                     first-run state (config → schema → owner)
    actions/*                    server actions (auth, clients, content, reports, …)
    auth.ts, crypto.ts, supabase/*
  components/ ui · shell · charts · dashboard · clients · content · reports · integrations
supabase/migrations/…_init.sql   schema, indexes, triggers, RLS, storage bucket
```

### Adding a platform (Stage 3)

1. Implement the adapter in `src/platforms/<name>/`: `auth.ts` (OAuth), `client.ts` (official API), `metrics-parser.ts` (keep missing metrics `null`), `sync.ts` (returns `AccountSyncResult`), and update `index.ts` to `status: "available"`.
2. Add its env vars and redirect URI: `/api/integrations/<name>/callback`.

The OAuth routes, sync job, analytics, dashboards and reports are platform-agnostic, so nothing else changes.

---

## Security model

- **Row Level Security on every table.** The helpers `is_admin()`, `current_client_id()` and `can_access_client()` (in the migration) decide access.
  - Clients can **read** only rows for their own `client_id`, and only **published** reports.
  - Metrics tables have no write policies. Only the server's sync job (service role) writes them.
- **Roles can't be self-assigned.** The `handle_new_user` trigger takes the role and workspace only from an admin-created invitation. A column-level grant means a user can update only their own `name`.
- **OAuth tokens:**
  - They live in `social_account_tokens`, which has RLS on, **no policies**, and `REVOKE ALL` for `anon` and `authenticated`.
  - They're AES-256-GCM encrypted in the application before storage.
  - Scopes are read-only.
- **OAuth CSRF protection:** a random `state` is stored in an httpOnly cookie and compared in constant time. Workspace access is checked again in the callback.
- **Server-side checks:** every server action re-checks the role, then uses the user's RLS-bound client. The service role is imported only in `server-only` modules.
- **Cron endpoint:** requires `Authorization: Bearer $CRON_SECRET` (constant-time compare).

The RLS rules were checked against a local Postgres 16 with a Supabase auth/storage shim, using these scenarios:

- A client user sees only their own client, content, metrics and published reports.
- A client user can't read tokens, escalate their role, insert content or write metrics.
- An uninvited signup that sets `role: admin` in its metadata ends up as a client with no workspace access.
- Admins see everything except tokens.
- `anon` is denied.

---

## Roadmap

- **Stage 2, agency features:** team members with granular roles, notifications (sync failures, report ready), scheduled report emails, white-label report themes, and more chart types.
- **Stage 3, multi-platform:** adapters for Instagram Graph API, TikTok Display API, Facebook Graph (Pages) and the LinkedIn Community Management API.
