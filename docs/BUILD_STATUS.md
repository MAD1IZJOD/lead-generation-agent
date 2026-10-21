# Build Status

## What works end to end

- **Authentication**: Sign in, sign up, sign out via Supabase Auth. Protected routes redirect unauthenticated users to login. Session persistence via Supabase cookies.
- **Workspace configuration**: Full CRUD for workspace settings (company profile, services, pricing, target markets, ICP, brand voice, outreach rules). Persisted to Supabase with row-level security. Audit logging on settings updates.
- **Lead management**: Create, read, update, archive leads. Search and filter by email/name/company and status. Inline editing on the leads table. Duplicate detection on lead creation (same email within workspace = 409 conflict).
- **Research evidence**: Add evidence-backed observations to leads with source URLs, source types, and confidence scores. Evidence is displayed alongside leads in the detail view.
- **Qualification scoring**: Pure function that scores leads 0-100 based on email presence, company info, website, ICP industry match, ICP job title match, and target market match. Returns tier (cold/warm/hot) with detailed breakdown.
- **Outreach drafts**: Create outreach drafts with subject and body. Suppression list check prevents outreach to opted-out contacts. Duplicate outreach prevention (one active outreach per lead). DRY RUN mode from workspace settings prevents real sends. Audit logging on outreach creation.
- **AI outreach generation**: API endpoint that calls a configured model provider (OpenAI-compatible) to generate personalized outreach emails using lead evidence, workspace brand voice, approved claims, and service info. Returns 503 with clear message if no model provider configured.
- **Emergency kill switch**: Global kill switch that stops all outbound sending across all workspaces. Stored in system_settings table with RLS. API endpoint to get and toggle status. Audit logging on activation/deactivation.
- **Workspace pause controls**: Per-workspace pause with reason and timestamp. Pausing a workspace blocks all outbound sending for that workspace. API endpoint to get and toggle pause status. Audit logging on pause/unpause.
- **Send authorization**: Server-side authorization checks before any outbound send: global kill switch, workspace pause, DRY RUN mode, suppression list, daily send limits, duplicate lead detection. Returns detailed check results explaining allow/block decisions.
- **Idempotency keys**: Unique idempotency_key column on outreach table with unique index per workspace. Prevents duplicate sends when the same key is used.
- **SUPERVISED approval queue**: Outreach created in SUPERVISED mode gets pending_approval status. API endpoints to list pending approvals and approve/reject individual items. Audit logging on approve/reject.
- **Email provider adapter**: Modular email provider interface with mock (default, no real emails) and SMTP implementations. Webhook verification, bounce, reply, and complaint handling stubs. Credentials kept server-side only.
- **Email send API**: Send approved outreach emails through configured provider. DRY RUN mode doesn't send real emails. Updates outreach status and sends_at timestamp. Audit logging on send.
- **Follow-up scheduling**: Schedule follow-up emails with workspace-configured delays. Max follow-up limit enforced (default 2). Cancel follow-ups at any time. Tracks follow-up count and next follow-up timestamp. Audit logging on schedule/cancel.

## What is mocked or not yet implemented

- **Email sending**: Mock provider is default (logs but does not send). SMTP provider available when credentials configured but not tested with real SMTP server. No real emails sent during development or testing.
- **Model provider**: OpenAI-compatible API supported in code but requires `MODEL_API_KEY` in `.env.local`. No real calls are made during tests.
- **Calendar integration**: Google Calendar provider referenced in `.env.example` but not implemented.
- **Prospect discovery**: Discovery provider adapter implemented but not connected to a real provider. Requires API credentials in `.env.local`.
- **Revenue tracking**: Database schema exists but no UI or business logic for recording revenue.
- **Cost tracking**: Database schema exists but no UI or business logic for tracking operating costs.
- **Audit log viewing**: Audit logs are written to the database but there is no UI to view them.
- **Workspace listing/creation**: Users can edit their workspace settings but cannot create new workspaces or view a list of workspaces.
- **Lead status transitions**: Status can be set manually but no automatic transitions (e.g., contacted → replied).
- **Follow-up automation**: Follow-up scheduling API and cron route implemented. Requires a cron scheduler (e.g., Vercel Cron) to execute automatically.
- **Webhook handling**: Signed webhook endpoints implemented for bounce, reply, and complaint. Adapter verification stubs remain. Requires `EMAIL_WEBHOOK_SECRET` to be configured.
- **AUTONOMOUS mode**: Defined in types but not enabled. Requires explicit authentication, verified integrations, and compliance safeguards before activation.

## What requires external setup

1. **Supabase project**: Create a Supabase project, run `supabase/schema.sql` plus migrations `002_kill_switch_and_pause.sql`, `003_idempotency_key.sql`, `004_follow_up_tracking.sql`, `005_background_jobs.sql` to create tables, enable RLS, and set up Auth.
2. **Environment variables**: Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required for auth and data)
   - `SUPABASE_SERVICE_ROLE_KEY` (required for server-side operations)
   - `MODEL_API_KEY` (required for AI outreach generation)
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (required for real email sending; defaults to mock provider)
   - `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` (required for email sending)
   - `EMAIL_WEBHOOK_SECRET` (required for webhook verification)
   - `CRON_SECRET` (required for cron endpoint protection)
   - `ENCRYPTION_KEY` and `NEXTAUTH_SECRET` (required for security)
3. **Model provider account**: OpenAI or compatible API account for outreach generation.
4. **Email provider**: SMTP credentials or email API key for sending outreach (optional; mock provider used by default).

## Test results

- **Test framework**: Vitest with jsdom environment and testing-library matchers
- **Test files**: 10
- **Tests passed**: 90
  - `src/lib/qualification.test.ts`: 9 tests (qualification scoring, tier determination, score breakdown)
  - `src/lib/validations/workspace.test.ts`: 21 tests (Zod validation schemas for all workspace settings)
  - `src/lib/rules.test.ts`: 27 tests (deduplication, suppression, pricing floors, approved claims, DRY RUN, send limits, follow-up timing)
  - `src/lib/send-authorization.test.ts`: 12 tests (kill switch, workspace pause, suppression, daily limits, DRY RUN detection)
  - `src/lib/email/adapter.test.ts`: 8 tests (mock/SMTP provider selection, sendEmail, webhook, bounce, reply, complaint)
  - `src/lib/prospect-discovery/adapter.test.ts`: 5 tests (provider selection, mock discoverProspects, mock enrichProspect)
  - `src/app/api/webhooks/email/bounce/route.test.ts`: 2 tests (missing/invalid webhook signature)
  - `src/app/api/webhooks/email/reply/route.test.ts`: 2 tests (missing/invalid webhook signature)
  - `src/app/api/webhooks/email/complaint/route.test.ts`: 2 tests (missing/invalid webhook signature)
  - `src/app/api/cron/process-follow-ups/route.test.ts`: 2 tests (missing/invalid cron secret)
- **TypeScript**: `tsc --noEmit` passes with zero errors
- **ESLint**: `npm run lint` passes with zero errors (7 intentional warnings for adapter interface stubs)

## Eight-Phase Roadmap

| Phase | Name | Status | Description |
|-------|------|--------|-------------|
| 1 | Project Foundation | Complete | Repository setup, README, .gitignore, initial commit |
| 2 | Project Configuration | Complete | Package name, .env.example, Supabase schema, workspace isolation RLS |
| 3 | Application Shell & Authentication | Complete | Next.js app, login/signup/dashboard, Supabase auth, middleware |
| 4 | Prospect Discovery and Research | In Progress | Workspace configuration, lead management, evidence, qualification, prospect discovery, email provider integration, webhook endpoints, setup documentation |
| 5 | Outreach Sending and Compliance | Complete | Kill switch, workspace pause, send authorization, idempotency keys, SUPERVISED queue, email provider adapter, follow-up scheduling |
| 6 | Testing and Verification | Complete | 77 tests passing, TypeScript and ESLint clean |
| 7 | Security, Reliability, and End-to-End Hardening | Not Started | Security audit, rate monitoring, cost ceilings, emergency procedures |
| 8 | Deployment and Production Readiness | Not Started | Vercel deployment, production monitoring, operating manual |

## Phase 4: Prospect Discovery and Research — Layers

### Layer 1: Real Prospect Discovery and Research
- Prospect discovery provider adapter implemented (`src/lib/prospect-discovery/adapter.ts`) with mock and API implementations
- Research evidence storage with source URLs and confidence scores (implemented)
- Lead deduplication within workspace (implemented)
- Qualification scoring with breakdown (implemented)
- **Still needed**: Connect to a real prospect discovery provider you control

### Layer 2: Actual Email Provider Integration
- Email provider adapter interface implemented with mock (default) and SMTP implementations
- SMTP provider credentials configured server-side only
- **NOT YET**: Verified using an address you control — requires SMTP credentials in `.env.local`

### Layer 3: Signed Webhook Endpoints and Background Jobs
- Signed webhook endpoints implemented:
  - `POST /api/webhooks/email/bounce` — bounce handling, suppression list, follow-up cancellation
  - `POST /api/webhooks/email/reply` — reply handling, follow-up cancellation
  - `POST /api/webhooks/email/complaint` — complaint handling, suppression list, follow-up cancellation
- All webhook endpoints verify signatures using `EMAIL_WEBHOOK_SECRET`
- Background jobs table created (`supabase/migrations/005_background_jobs.sql`)
- Cron route for processing due follow-ups: `GET /api/cron/process-follow-ups`
- **NOT YET**: Durable background job worker (cron route exists but needs a scheduler like Vercel Cron)

### Layer 4: Complete Setup Documentation
- Setup documentation partial in BUILD_STATUS.md
- **NOT YET**: Operating manual, deployment instructions

## Phase 4 Exit Criteria (not yet met)
- [ ] Real prospect discovery connected to a provider you control
- [ ] Email provider integration verified with an address you control
- [x] Signed webhook endpoints implemented and tested
- [x] Cron route for follow-up processing implemented and tested
- [ ] Durable background job worker (needs cron scheduler)
- [ ] Complete setup documentation, operating manual, and deployment instructions
- [ ] DRY RUN remains default; no real emails sent in tests
- [ ] Explicit approval required before contacting actual prospects

## Commit history (Stage 3)

| Commit | Message | Files | Checks | Push |
|--------|---------|-------|--------|------|
| c05127c | Add kill switch and workspace pause controls to database | supabase/migrations/002_*.sql, supabase/schema.sql | tsc, lint | Yes |
| 6173bf0 | Add kill switch and workspace pause server actions | src/lib/actions/killswitch.ts | tsc, lint | Yes |
| 331c0bd | Add kill switch API route | src/app/api/kill-switch/route.ts | tsc, lint | Yes |
| 314cd5f | Add workspace pause toggle to API | src/app/api/workspaces/[workspaceId]/route.ts | tsc, lint | Yes |
| 4c5dea2 | Add idempotency key to outreach table | supabase/migrations/003_*.sql, supabase/schema.sql | tsc, lint | Yes |
| 68c7305 | Add send authorization with compliance checks | src/lib/send-authorization.ts, src/lib/database.types.ts, src/lib/qualification.test.ts, src/lib/rules.test.ts | tsc, lint | Yes |
| b7ecfd7 | Update outreach API with send authorization | src/app/api/outreach/route.ts | tsc, lint | Yes |
| bf265b4 | Add pending_approval and rejected outreach statuses | src/lib/database.types.ts | tsc, lint | Yes |
| d68e85b | Add SUPERVISED approval queue API | src/app/api/outreach/pending/route.ts, src/app/api/outreach/action/route.ts | tsc, lint | Yes |
| 5476447 | Add email provider adapter interface | src/lib/email/adapter.ts | tsc, lint | Yes |
| 8c66b9f | Add email send route with provider adapter | src/app/api/outreach/[outreachId]/send/route.ts, src/lib/email/adapter.ts | tsc, lint | Yes |
| 35cab20 | Add follow-up tracking to outreach table | supabase/migrations/004_*.sql, supabase/schema.sql | tsc, lint | Yes |
| 3217663 | Add follow-up scheduling and cancellation API | src/app/api/outreach/[outreachId]/follow-up/route.ts | tsc, lint | Yes |
| 804a48b | Add path alias resolution to vitest config | vitest.config.ts | tsc, lint | Yes |
| 979a9d1 | Add send authorization tests | src/lib/send-authorization.test.ts | tsc, lint, vitest (12 tests) | Yes |
| 8b5d24b | Add email provider adapter tests | src/lib/email/adapter.test.ts | tsc, lint, vitest (8 tests) | Yes |
| 128335d | Update .env.example with email provider settings | .env.example | tsc, lint | Yes |
| 2826c8c | Update build status documentation for Stage 3 | docs/BUILD_STATUS.md | tsc, lint | Yes |
| a73de20 | Set pending_approval status for SUPERVISED mode outreach | src/app/api/outreach/route.ts | tsc, lint | Yes |

## Phase 4 commits

| Commit | Message | Files | Checks | Push |
|--------|---------|-------|--------|------|
| 22a8443 | Add eight-phase roadmap and Phase 4 layers to build status | docs/BUILD_STATUS.md | tsc, lint | Yes |
| b2b0aa6 | Add prospect discovery provider adapter | src/lib/prospect-discovery/adapter.ts | tsc, lint | Yes |
| f376c7f | Add signed email bounce webhook endpoint | src/app/api/webhooks/email/bounce/route.ts | tsc, lint | Yes |
| f1b1ce5 | Add signed email reply webhook endpoint | src/app/api/webhooks/email/reply/route.ts | tsc, lint | Yes |
| 55cc61f | Add signed email complaint webhook endpoint | src/app/api/webhooks/email/complaint/route.ts | tsc, lint | Yes |
| 85d0f27 | Add background jobs table for durable follow-up processing | supabase/migrations/005_background_jobs.sql | tsc, lint | Yes |
| 301c776 | Add cron route for processing due follow-ups | src/app/api/cron/process-follow-ups/route.ts | tsc, lint | Yes |
| 100d4ea | Add prospect discovery adapter tests | src/lib/prospect-discovery/adapter.test.ts | tsc, lint, vitest (5 tests) | Yes |
| 118ebae | Add bounce webhook endpoint tests | src/app/api/webhooks/email/bounce/route.test.ts | tsc, lint, vitest (2 tests) | Yes |
| 1ee603e | Add reply webhook endpoint tests | src/app/api/webhooks/email/reply/route.test.ts | tsc, lint, vitest (2 tests) | Yes |
| 93eae36 | Add complaint webhook endpoint tests | src/app/api/webhooks/email/complaint/route.test.ts | tsc, lint, vitest (2 tests) | Yes |
| 11caa47 | Add cron route tests for follow-up processing | src/app/api/cron/process-follow-ups/route.test.ts | tsc, lint, vitest (2 tests) | Yes |
| 020926c | Fix type errors in test files | 4 test files | tsc, lint | Yes |

Plus Stage 2, Stage 3, and initial foundation commits.

## Missing Credentials / External Setup Blocking Verification

- **SMTP credentials** (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) — not configured; email provider defaults to mock
- **Email address you control** — not provided; cannot verify real email delivery
- **`MODEL_API_KEY`** — not configured; AI outreach generation returns 503
- **`EMAIL_WEBHOOK_SECRET`** — not configured; webhook verification cannot be tested
- **`CRON_SECRET`** — not configured; cron endpoint cannot be invoked
- **Prospect discovery API key and base URL** — not configured; discovery defaults to mock

These must be provided before Phase 4 Layer 2 (email provider integration verified) and full end-to-end verification can be demonstrated.
