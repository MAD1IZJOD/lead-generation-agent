# Setup Guide

This guide walks through setting up the Lead Generation Agent for local
development and testing. It covers repository setup, Supabase
configuration, environment variables, and first-run steps.

## 1. Prerequisites

- Node.js 20 or later
- npm 10 or later
- A Supabase account (free tier is sufficient for development)
- An email address you control (for testing email delivery)
- Optional: SMTP credentials or an email-sending provider account
- Optional: A prospect discovery API account

## 2. Clone the Repository

```bash
git clone https://github.com/MAD1IZJOD/lead-generation-agent.git
cd lead-generation-agent
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Configure Supabase

1. Create a project at https://supabase.com
2. Go to the SQL Editor in the Supabase dashboard
3. Run the schema and migrations in this order:
   - `supabase/schema.sql` — core tables, row-level security, policies
   - `supabase/migrations/002_kill_switch_and_pause.sql` — kill switch and workspace pause
   - `supabase/migrations/003_idempotency_key.sql` — idempotency key for outreach
   - `supabase/migrations/004_follow_up_tracking.sql` — follow-up tracking columns
   - `supabase/migrations/005_background_jobs.sql` — background jobs table
4. Enable Auth in your Supabase project (Authentication > Settings)
5. Note your project URL and anon key from Settings > API

## 5. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in the required values:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `MODEL_API_KEY` | No | AI model provider API key (for outreach generation) |
| `SMTP_HOST` | No | SMTP host for real email sending |
| `SMTP_PORT` | No | SMTP port (default 587) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password |
| `EMAIL_FROM_ADDRESS` | No | Sender email address |
| `EMAIL_FROM_NAME` | No | Sender display name |
| `EMAIL_WEBHOOK_SECRET` | No | Secret for verifying email webhook signatures |
| `CRON_SECRET` | No | Secret for protecting cron endpoints |
| `ENCRYPTION_KEY` | No | Encryption key for sensitive data |
| `NEXTAUTH_SECRET` | No | Secret for NextAuth sessions |
| `PROSPECT_DISCOVERY_API_KEY` | No | Prospect discovery provider API key |
| `PROSPECT_DISCOVERY_API_BASE_URL` | No | Prospect discovery provider base URL |

**Important:** Never commit `.env.local`. It is gitignored.

## 6. Configure the Workspace

1. Start the development server: `npm run dev`
2. Visit http://localhost:3000/signup to create an account
3. Sign in and navigate to the workspace settings page
4. Configure:
   - Company profile (name, website, contact email, description)
   - Services (name, description, starting price)
   - Pricing floor (minimum project price)
   - Target markets (countries)
   - Ideal Customer Profile (industries, company sizes, job titles, pain points)
   - Approved claims (claims your team is authorized to make in outreach)
   - Brand voice (tone, formality, do-not-claim list)
   - Outreach rules (max emails per day, follow-up limit, days between follow-ups)
   - DRY RUN mode (enabled by default — no real emails are sent)

## 7. First Run

```bash
npm run dev
```

Visit http://localhost:3000 to see the landing page. Sign in to access
the dashboard and workspace settings.

## 8. Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Type check
npm run type-check

# Lint
npm run lint
```

Note: `package.json` does not yet define `test`, `type-check`, or `lint`
scripts for test/type-check beyond `lint`. Run vitest directly:

```bash
npx vitest run
npx tsc --noEmit
npm run lint
```

## 9. DRY RUN Mode (Default)

DRY RUN mode is enabled by default. In DRY RUN:
- No emails are sent
- Outreach drafts are created but not delivered
- Follow-up jobs are scheduled but not executed
- All compliance checks still run

To disable DRY RUN (enable real sending):
1. Go to Workspace Settings > Outreach Rules
2. Uncheck "DRY RUN mode"
3. **Warning:** This enables real email sending. Only do this after
   configuring SMTP credentials and verifying webhook endpoints.

## 10. Next Steps

After setup is complete:
1. Add leads manually or via prospect discovery
2. Generate outreach drafts (requires MODEL_API_KEY for AI generation)
3. Review and approve drafts in SUPERVISED mode
4. Configure email webhooks for bounce/reply/complaint handling
5. Set up cron scheduling for follow-up execution

See `docs/OPERATING_MANUAL.md` for day-to-day operations.
