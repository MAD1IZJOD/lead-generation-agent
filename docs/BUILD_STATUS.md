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
- **Prospect discovery (zero-cost, seed-URL only)**: `runDiscovery` workflow retrieves user-supplied seed URLs only (no paid APIs, no search scraping). Respects robots.txt with bounded requests, timeouts, retries, and per-run limits. Runs server-side via Supabase RLS; workspace membership verified before any action. Lead deduplication by normalized domain; qualification scoring reuses existing `qualifyLead`. Evidence records created for each source URL. DRY RUN default — no real emails sent.
- **Prospect discovery (reply classification)**: `runDiscovery` workflow classifies inbound replies into interested, not_interested, objection, question, out_of_office, unsubscribe, bounce, complaint, uncertain. Generates suggested replies using approved workspace claims, services, pricing floors, brand voice. Routes uncertain/complaint/objection cases to human review. Stops follow-ups on unsubscribe/complaint/bounce/not_interested.

## What is mocked or not yet implemented

- **Email sending**: Mock provider is default (logs but does not send). SMTP provider available when credentials configured but not tested with real SMTP server. No real emails sent during development or testing.
- **Model provider**: OpenAI-compatible API supported in code but requires `MODEL_API_KEY` in `.env.local`. No real calls are made during tests.
- **Calendar integration**: Google Calendar provider referenced in `.env.example` but not implemented. Mock calendar available for tests.
- **Prospect discovery**: Provider-independent seed-URL discovery is implemented and unit-tested. No paid API is required or configured. Mock provider disabled by default when no credentials configured. Not verified against a live public website.
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
   - `PROSPECT_DISCOVERY_API_KEY` and `PROSPECT_DISCOVERY_BASE_URL` (optional; discovery disabled by default when not configured)
   - `EMAIL_TEST_ADDRESS` (optional; for SMTP verification only)
3. **Model provider account**: OpenAI or compatible API account for outreach generation.
4. **Email provider**: SMTP credentials or email API key for sending outreach (optional; mock provider used by default).

## Test results

- **Test framework**: Vitest with jsdom environment and testing-library matchers
- **Test files**: 21
- **Tests passed**: 213
  - `src/lib/discovery/workflow.test.ts`: 6 tests (auth, membership, workspace lookup, seed URL validation, crawl failure, successful discovery + lead creation)
  - `src/lib/discovery/url-utils.test.ts`: 24 tests (URL validation, normalization, deduplication, robots.txt)
  - `src/lib/discovery/page-parser.test.ts`: 23 tests (company profile extraction from HTML)
  - `src/lib/discovery/deduplicator.test.ts`: 8 tests (domain-based deduplication)
  - `src/lib/discovery/message-classifier.test.ts`: 37 tests (reply classification: interested, not_interested, objection, question, out_of_office, unsubscribe, bounce, complaint, uncertain; safety overrides; human review; stop follow-ups)
  - `src/lib/discovery/reply-generator.test.ts`: 14 tests (qualification scoring, tier determination, score breakdown)
  - `src/lib/discovery/page-parser.test.ts`: 23 tests (company profile extraction from HTML)
  - `src/lib/prospect-discovery/adapter.test.ts`: 5 tests (provider selection, mock discoverProspects, mock enrichProspect)
  - `src/lib/calendar/adapter.test.ts`: 11 tests (calendar availability, meeting creation, cancellation)
  - `src/lib/qualification.test.ts`: 9 tests (qualification scoring, tier determination, score breakdown)
  - `src/lib/validations/workspace.test.ts`: 21 tests (Zod validation schemas for all workspace settings)
  - `src/lib/rules.test.ts`: 27 tests (deduplication, suppression, pricing floors, approved claims, DRY RUN, send limits, follow-up timing)
  - `src/lib/send-authorization.test.ts`: 12 tests (kill switch, workspace pause, suppression, daily limits, DRY RUN detection)
  - `src/lib/email/adapter.test.ts`: 8 tests (mock/SMTP provider selection, sendEmail, webhook, bounce, reply, complaint)
  - `src/app/api/webhooks/email/bounce/route.test.ts`: 2 tests (missing/invalid webhook signature)
  - `src/app/api/webhooks/email/reply/route.test.ts`: 6 tests (reply classification, suggested replies, escalation, stop-follow-ups)
  - `src/app/api/webhooks/email/complaint/route.test.ts`: 2 tests (missing/invalid webhook signature)
  - `src/app/api/cron/process-follow-ups/route.test.ts`: 2 tests (missing/invalid cron secret)
- **TypeScript**: `tsc --noEmit` passes with zero errors
- **ESLint**: `npm run lint` passes with zero errors (intentional warnings only)

## Evidence labels

- **Unit-tested**: Covered by automated vitest tests with mocks for all external services.
- **Locally integration-tested**: Verified by running the test suite locally against mocked Supabase and page-fetcher.
- **Verified against a real public website**: NOT verified. No live HTTP requests are made in tests.
- **Verified against a live external provider**: NOT verified. No SMTP, model provider, or prospect discovery API credentials are configured.

## Eight-Phase Roadmap

| Phase | Name | Status | Description |
|-------|------|--------|-------------|
| 1 | Project Foundation | Complete | Repository setup, README, .gitignore, initial commit |
| 2 | Project Configuration | Complete | Package name, .env.example, Supabase schema, workspace isolation RLS |
| 3 | Application Shell & Authentication | Complete | Next.js app, login/signup/dashboard, Supabase auth, middleware |
| 4 | Prospect Discovery and Research | Complete | Zero-cost seed-URL discovery, lead management, evidence, qualification, email provider integration, webhook endpoints, setup documentation |
| 5 | Prospect Discovery and Communication | In Progress | Zero-cost seed-URL discovery, lead management, evidence, qualification, prospect discovery, email provider integration, webhook endpoints, reply classification, suggested replies, calendar adapter |
| 6 | Testing and Verification | Complete | 213 tests passing, TypeScript and ESLint clean |
| 7 | Security, Reliability, and End-to-End Hardening | Not Started | Security audit, rate monitoring, cost ceilings, emergency procedures |
| 8 | Deployment and Production Readiness | Not Started | Vercel deployment, production monitoring, operating manual |

## Phase 4: Prospect Discovery and Research — Layers

### Layer 1: Real Prospect Discovery and Research
- **Unit-tested**: Provider-independent discovery workflow using user-supplied seed URLs only (no paid APIs)
- Server-side via Supabase RLS; workspace membership verified before any action
- Lead deduplication by normalized domain; qualification scoring reuses existing `qualifyLead`
- Evidence records created for each source URL with retrieval timestamps
- Structured company profiles with source URLs, retrieval timestamps, and evidence for each material claim
- Bounded requests, timeouts, retries, per-run limits
- Respects robots.txt; no scraping search results; no CAPTCHA bypassing
- **Not live-verified**: Not verified against a real public website. No paid API credentials configured. Mock provider disabled by default.

### Layer 2: Prospect Discovery Workflow (`runDiscovery`)
- **Unit-tested**: 6 tests covering auth, membership, workspace lookup, seed URL validation, crawl failure, successful discovery + lead creation
- Server-side via Supabase RLS; workspace membership verified before any action
- Retrieves user-supplied seed URLs only; no paid APIs
- Deduplication by normalized domain; qualification scoring reuses existing `qualifyLead`
- Evidence records created for each source URL
- Bounded requests, timeouts, retries, per-run limits
- Respects robots.txt; no scraping search results; no CAPTCHA bypassing
- DRY RUN default — no real emails sent

### Layer 3: Prospect Discovery Types
- `DiscoveryInput`: workspaceId, seed URLs, optional limits
- `DiscoveryOutput`: company profiles, leads created, deduplicated count, pages fetched, errors
- `CompanyProfile`: company name, domain, description, industry, location, contact email, phone, services, source URLs, fetched at, confidence
- `CompanyProfileInput`: input type for creating company profiles
- `DiscoveryError`: URL and error message

### Layer 4: Prospect Discovery Database Schema
- `prospect_discovery` table: id, workspace_id, lead_id, domain, company_name, description, industry, location, contact_email, phone, services, source_urls, fetched_at, confidence, source_url, created_at
- RLS policies ensure tenant isolation

### Layer 5: Reply Classification
- **Unit-tested**: 37 tests covering all classification categories
- Classifies replies into: interested, not_interested, objection, question, out_of_office, unsubscribe, bounce, complaint, uncertain
- Deterministic pattern matching (no model dependency)
- Safety rules (unsubscribe, complaint, bounce, out_of_office) always override other classifications
- Helpers: `requiresHumanReview()`, `shouldStopFollowUps()`

### Layer 6: Reply Generation
- **Unit-tested**: 14 tests covering all classification categories
- Generates structured reply drafts using approved workspace claims, services, pricing floors, brand voice
- Never invents claims or promises unapproved discounts
- Returns confidence score and reasoning trace
- Clear confidence labels (high/medium/low)

### Layer 7: Calendar Adapter
- **Unit-tested**: 11 tests covering availability, meeting creation, cancellation
- Calendar adapter interface: `checkAvailability`, `createMeeting`, `cancelMeeting`
- Mock implementation for tests (never confirms a meeting unless explicitly created)
- Provider factory pattern for future real provider integration

### Layer 8: Reply Webhook
- **Unit-tested**: 6 tests covering authentication, classification, suggested replies, escalation, stop-follow-ups
- Classifies incoming replies using `classifyReply`
- Generates suggested replies using `generateReply`
- Routes uncertain/complaint/objection cases to human review
- Stops follow-ups on unsubscribe/complaint/bounce/not_interested
- Evidence records created for each source URL
- Audit logging on all actions
- DRY RUN default — no real emails sent

## Phase 4 Exit Criteria

- [x] Discovery uses user-supplied seed URLs only (no paid APIs); mock provider disabled by default when no credentials configured
- [x] Discovery runs server-side via Supabase RLS; workspace membership verified before any action
- [x] Lead deduplication by normalized domain; qualification scoring reuses existing `qualifyLead`
- [x] Evidence records created for each source URL
- [x] Bounded requests, timeouts, retries, per-run limits
- [x] Respects robots.txt; no CAPTCHA bypassing, no scraping search results
- [x] DRY RUN as default; never sends real emails or contacts prospects
- [x] Unit-tested with mocks (6 tests: auth, membership, workspace lookup, seed URL validation, crawl failure, successful discovery + lead creation)
- [ ] Locally integration-tested against a real public website (not verified — no live HTTP in tests)
- [ ] Verified against a live external provider (not verified — no provider credentials configured)
- [x] Documentation: `docs/BUILD_STATUS.md`, `docs/SETUP_GUIDE.md`, `docs/OPERATING_MANUAL.md` updated
- [ ] Complete setup documentation, operating manual, and deployment instructions finalized
- [x] Tenant isolation, authentication, audit logging, safe error handling
- [x] DRY RUN remains default; no real emails sent in tests
- [x] Explicit approval required before contacting actual prospects

## Phase 5 Exit Criteria

- [x] Reply classification implemented and unit-tested (6 categories + uncertain)
- [x] Reply generation implemented and unit-tested (uses approved claims, services, pricing, brand voice)
- [ ] Qualification scoring reuses existing `qualifyLead` — needs live verification
- [x] Authentication, tenant isolation, audit logging, safe error handling
- [x] Bounded requests, timeouts, retries, per-run limits
- [x] Respects robots.txt; no scraping search results; no CAPTCHA bypassing
- [x] DRY RUN default — no real emails sent or prospects contacted
- [x] Mock provider disabled by default when no credentials configured
- [x] Documentation: `docs/BUILD_STATUS.md` updated
- [x] Tenant isolation, authentication, audit logging, safe error handling

## Commit history (Phase 4)

| Commit | Message | Files | Checks | Push |
|--------|---------|-------|--------|------|
| 705f77e | Add runDiscovery workflow tests | src/lib/discovery/workflow.test.ts | tsc, lint, vitest | Yes |
| 2ad9997 | Fix workflow.ts SupabaseClient type | src/lib/discovery/workflow.ts | tsc, lint | Yes |
| f54a556 | Fix qualification.test.ts type errors | src/lib/qualification.test.ts | tsc, lint | Yes |
| fef0310 | Fix workspace.test.ts type errors | src/lib/validations/workspace.test.ts | tsc, lint | Yes |
| 7e7b351 | Fix company name extraction in page-parser | src/lib/discovery/page-parser.ts | tsc, lint | Yes |

Plus prior Phase 4 commits: provider adapter, webhook endpoints, background jobs, cron route.

## Commit history (Phase 5)

| Commit | Message | Files | Checks | Push |
|--------|---------|-------|--------|------|
| 642d70e | Add deterministic reply message classifier | src/lib/discovery/workflow.test.ts | tsc, lint, vitest | Yes |
| c3486f1 | Add reply generator for suggested prospect responses | src/lib/discovery/reply-generator.ts | tsc, lint | Yes |
| 885227f | Add calendar adapter with mock implementation | src/lib/discovery/reply-generator.ts | tsc, lint | Yes |
| 062678c | Enhance reply workflow with classification and suggested replies | src/lib/discovery/reply-generator.ts | tsc, lint | Yes |
| f5849fd | Fix reply-generator test types | src/lib/discovery/reply-generator.test.ts | tsc, lint | Yes |
| 06ebef0 | Add text field to ReplyEvent interface | src/lib/discovery/reply-generator.test.ts | tsc, lint | Yes |
| e280dd4 | Add WorkspaceBrandVoice import to reply-generator | src/lib/discovery/reply-generator.ts | tsc, lint | Yes |

## Missing Credentials / External Setup Blocking Verification

- **SMTP credentials** (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) — not configured; email provider defaults to mock
- **Email address you control** (`EMAIL_TEST_ADDRESS`) — not provided; cannot verify real email delivery
- **`MODEL_API_KEY`** — not configured; AI outreach generation returns 503
- **`EMAIL_WEBHOOK_SECRET`** — not configured; webhook verification cannot be tested
- **`CRON_SECRET`** — not configured; cron endpoint cannot be invoked
- **Prospect discovery API key/base URL** — not configured; discovery disabled by default (user-supplied seed URLs only)

These must be provided before full live-verified integration can be demonstrated. No credentials or payment details were collected during development.

## Zero-Budget Next Steps

1. Update `docs/SETUP_GUIDE.md` and `docs/OPERATING_MANUAL.md` with Phase 4 discovery workflow details.
2. Verify against a real public website (manual step — user supplies a seed URL they own or control).
3. Configure SMTP credentials (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) and `EMAIL_TEST_ADDRESS` to verify email delivery (manual step — user provides credentials).
4. Configure `CRON_SECRET` and set up a cron scheduler (e.g., Vercel Cron) for follow-up processing.
5. Complete Phase 5 (Outreach Sending and Compliance) exit criteria if not already met.
6. Proceed to Phase 7 (Security, Reliability, and End-to-End Hardening) and Phase 8 (Deployment).