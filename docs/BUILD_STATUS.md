# Build Status

## What works end to end

- **Authentication**: Sign in, sign up, sign out via Supabase Auth. Protected routes redirect unauthenticated users to login. Session persistence via Supabase cookies.
- **Workspace configuration**: Full CRUD for workspace settings (company profile, services, pricing, target markets, ICP, brand voice, outreach rules). Persisted to Supabase with row-level security. Audit logging on settings updates.
- **Lead management**: Create, read, update, archive leads. Search and filter by email/name/company and status. Inline editing on the leads table. Duplicate detection on lead creation (same email within workspace = 409 conflict).
- **Research evidence**: Add evidence-backed observations to leads with source URLs, source types, and confidence scores. Evidence is displayed alongside leads in the detail view.
- **Qualification scoring**: Pure function that scores leads 0-100 based on email presence, company info, website, ICP industry match, ICP job title match, and target market match. Returns tier (cold/warm/hot) with detailed breakdown.
- **Outreach drafts**: Create outreach drafts with subject and body. Suppression list check prevents outreach to opted-out contacts. Duplicate outreach prevention (one active outreach per lead). DRY RUN mode from workspace settings prevents real sends. Audit logging on outreach creation.
- **AI outreach generation**: API endpoint that calls a configured model provider (OpenAI-compatible) to generate personalized outreach emails using lead evidence, workspace brand voice, approved claims, and service info. Returns 503 with clear message if no model provider configured.

## What is mocked or not yet implemented

- **Email sending**: No real email provider integration. DRY RUN mode is default; no emails are sent. SMTP/SendGrid/Resend credentials required in `.env.local`.
- **Model provider**: OpenAI-compatible API supported in code but requires `MODEL_API_KEY` in `.env.local`. No real calls are made during tests.
- **Calendar integration**: Google Calendar provider referenced in `.env.example` but not implemented.
- **Prospect discovery**: Discovery provider referenced in `.env.example` but not implemented.
- **Revenue tracking**: Database schema exists but no UI or business logic for recording revenue.
- **Cost tracking**: Database schema exists but no UI or business logic for tracking operating costs.
- **Audit log viewing**: Audit logs are written to the database but there is no UI to view them.
- **Workspace listing/creation**: Users can edit their workspace settings but cannot create new workspaces or view a list of workspaces.
- **Lead status transitions**: Status can be set manually but no automatic transitions (e.g., contacted → replied).
- **Follow-up automation**: Follow-up logic exists in rules.ts but no scheduled job or automation to execute follow-ups.
- **Emergency pause/kill switch**: `EMERGENCY_PAUSE` env var referenced but not implemented in code.

## What requires external setup

1. **Supabase project**: Create a Supabase project, run `supabase/schema.sql` to create tables, enable RLS, and set up Auth.
2. **Environment variables**: Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required for auth and data)
   - `SUPABASE_SERVICE_ROLE_KEY` (required for server-side operations)
   - `MODEL_API_KEY` (required for AI outreach generation)
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` or `EMAIL_API_KEY` (required for sending emails)
   - `ENCRYPTION_KEY` and `NEXTAUTH_SECRET` (required for security)
3. **Model provider account**: OpenAI or compatible API account for outreach generation.
4. **Email provider**: SMTP credentials or email API key for sending outreach.

## Test results

- **Test framework**: Vitest with jsdom environment and testing-library matchers
- **Test files**: 3
- **Tests passed**: 57
  - `src/lib/qualification.test.ts`: 9 tests (qualification scoring, tier determination, score breakdown)
  - `src/lib/validations/workspace.test.ts`: 21 tests (Zod validation schemas for all workspace settings)
  - `src/lib/rules.test.ts`: 27 tests (deduplication, suppression, pricing floors, approved claims, DRY RUN, send limits, follow-up timing)
- **TypeScript**: `tsc --noEmit` passes with zero errors
- **ESLint**: `npm run lint` passes with zero errors and zero warnings

## Commit history (Stage 2)

| Commit | Message | Files | Checks | Push |
|--------|---------|-------|--------|------|
| 406d42a | Fix unused imports and variables in leads table | src/components/leads-table.tsx | tsc, lint | Yes |
| 9120293 | Fix React Compiler rules in lead evidence component | src/components/lead-evidence.tsx | tsc, lint | Yes |
| 33436c7 | Fix React Compiler rules in workspace settings page | src/app/workspaces/settings/page.tsx | tsc, lint | Yes |
| 67df081 | Fix React Compiler rules in outreach page | src/app/outreach/[leadId]/page.tsx | tsc, lint | Yes |
| f83326c | Fix React Compiler rules in leads page | src/app/leads/page.tsx | tsc, lint | Yes |
| 9f5f1e9 | Fix unused variable in lead creation form | src/app/leads/new/page.tsx | tsc, lint | Yes |
| 05f551a | Fix any type in outreach generate API | src/app/api/outreach/generate/route.ts | tsc, lint | Yes |
| 2fd713d | Add business rules tests | src/lib/rules.test.ts | tsc, lint, vitest (27 tests) | Yes |
| bb06efc | Add business rules module | src/lib/rules.ts | tsc, lint | Yes |
| e43ca28 | Add workspace settings validation tests | src/lib/validations/workspace.test.ts | tsc, lint, vitest (21 tests) | Yes |
| ba008d6 | Add qualification scoring tests | src/lib/qualification.test.ts | tsc, lint, vitest (9 tests) | Yes |
| ed41c42 | Add vite and testing-library/dom deps | package.json, package-lock.json | tsc, lint | Yes |
| 984e796 | Enable vitest globals | vitest.config.ts | tsc, lint | Yes |
| 81a256a | Add vitest setup file | vitest.setup.ts | tsc, lint | Yes |
| 4319677 | Add vitest configuration | vitest.config.ts | tsc, lint | Yes |
| e042702 | Add testing dependencies | package.json, package-lock.json | tsc, lint | Yes |
| 594f81e | Add outreach AI generation API endpoint | src/app/api/outreach/generate/route.ts | tsc, lint | Yes |
| bf42560 | Add workspace get API endpoint | src/app/api/workspaces/[workspaceId]/route.ts | tsc, lint | Yes |
| baac038 | Add outreach draft generation page | src/app/outreach/[leadId]/page.tsx | tsc, lint | Yes |
| 26ad431 | Add outreach list and create API endpoint | src/app/api/outreach/route.ts | tsc, lint | Yes |
| 677d01f | Add leads table component | src/components/leads-table.tsx | tsc, lint | Yes |
| a4c0429 | Add lead evidence component | src/components/lead-evidence.tsx | tsc, lint | Yes |
| 9c7f135 | Add single lead get, update, archive API | src/app/api/leads/[leadId]/route.ts | tsc, lint | Yes |
| 6443e92 | Add leads list and create API endpoint | src/app/api/leads/route.ts | tsc, lint | Yes |
| c0d6bcb | Add new lead creation form page | src/app/leads/new/page.tsx | tsc, lint | Yes |
| f694fd7 | Add leads pipeline page | src/app/leads/page.tsx | tsc, lint | Yes |
| df802b2 | Add lead qualification scoring function | src/lib/qualification.ts | tsc, lint | Yes |
| 161cbba | Add evidence create API endpoint | src/app/api/leads/[leadId]/evidence/route.ts | tsc, lint | Yes |
| 36e600a | Add evidence delete API endpoint | src/app/api/evidence/[evidenceId]/route.ts | tsc, lint | Yes |
| f7206dc | Add workspace settings page | src/app/workspaces/settings/page.tsx | tsc, lint | Yes |
| 987f2c1 | Add server action to save workspace settings | src/lib/actions/workspace.ts | tsc, lint | Yes |
| a41eff3 | Add Zod validation schema for workspace settings | src/lib/validations/workspace.ts | tsc, lint | Yes |
| b5c6e98 | Add TypeScript types for all database tables | src/lib/database.types.ts | tsc, lint | Yes |
| 0452b85 | Add zod dependency for validation schemas | package.json, package-lock.json | tsc, lint | Yes |

Plus initial foundation commits (1391814, 5093331, 53725b1, 9e568f4, 1d6db65).

## Most valuable next stage

**Stage 3: Outreach sending and compliance**

Implement actual email sending with provider integration (SMTP/SendGrid/Resend), per-workspace sending limits, opt-out processing from replies, follow-up automation with scheduling, and the emergency pause/kill switch. Move DRY RUN from default to configurable, and implement SUPERVISED mode with explicit approval before sending.
