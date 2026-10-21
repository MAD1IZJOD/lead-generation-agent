# Deployment and Recovery Instructions

This document covers deployment options and recovery procedures for
the Lead Generation Agent.

## 1. Deployment Options

### 1.1 Vercel (Recommended)

The application is a Next.js app and deploys natively on Vercel.

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Configure environment variables in Vercel project settings
4. Deploy

Required Vercel environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MODEL_API_KEY` (optional, for AI outreach generation)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (optional, for real email)
- `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` (optional)
- `EMAIL_WEBHOOK_SECRET` (optional, for webhook verification)
- `CRON_SECRET` (optional, for cron endpoint protection)
- `ENCRYPTION_KEY`, `NEXTAUTH_SECRET` (optional, for security)

### 1.2 Self-Hosted (Docker)

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx tsc --noEmit

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t lead-generation-agent .
docker run -p 3000:3000 --env-file .env.local lead-generation-agent
```

### 1.3 Other Platforms

The app can run on any platform that supports Next.js:
- Railway, Render, Fly.io, AWS Amplify, etc.
- Ensure environment variables are configured
- Ensure Supabase is accessible from the deployment environment

## 2. Cron / Scheduled Jobs

Follow-up processing requires scheduled execution:

### 2.1 Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-follow-ups",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Set `CRON_SECRET` in Vercel environment variables.

### 2.2 Self-Hosted Cron

Add to crontab:

```bash
*/15 * * * * curl -H "x-cron-secret: $CRON_SECRET" https://your-domain.com/api/cron/process-follow-ups
```

### 2.3 Other Schedulers

Use AWS EventBridge, Google Cloud Scheduler, or similar to call the
cron endpoint with the `x-cron-secret` header.

## 3. Database Migrations

Run migrations on your Supabase project in order:

```bash
# Using Supabase CLI
supabase db push

# Or via SQL Editor in Supabase dashboard
# Run each file in order:
# supabase/schema.sql
# supabase/migrations/002_kill_switch_and_pause.sql
# supabase/migrations/003_idempotency_key.sql
# supabase/migrations/004_follow_up_tracking.sql
# supabase/migrations/005_background_jobs.sql
```

## 4. Recovery Procedures

### 4.1 Database Recovery

If the database is corrupted or lost:

1. Restore from Supabase backup (project settings > backups)
2. Re-run migrations if needed
3. Re-create workspace members and settings

### 4.2 Credential Recovery

If environment variables are lost:

1. Rotate all compromised credentials
2. Update `.env.local` and platform environment variables
3. Re-test all integrations

### 4.3 Kill Switch Recovery

If the kill switch is activated:

1. Investigate the incident
2. Resolve the underlying issue
3. Deactivate the kill switch via API or admin interface
4. Verify outbound sending is restored

### 4.4 Workspace Pause Recovery

If a workspace is paused:

1. Investigate the reason for pausing
2. Resolve the underlying issue
3. Unpause the workspace via settings
4. Verify leads and outreach can resume

## 5. Environment Variable Reference

| Variable | Purpose | Required for Production |
|----------|---------|------------------------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL | Yes |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key | Yes |
| SUPABASE_SERVICE_ROLE_KEY | Service role key | Yes |
| MODEL_API_KEY | AI model provider | No (outreach generation disabled) |
| SMTP_HOST | SMTP host | No (DRY RUN only) |
| SMTP_PORT | SMTP port | No |
| SMTP_USER | SMTP username | No |
| SMTP_PASS | SMTP password | No |
| EMAIL_FROM_ADDRESS | Sender address | No |
| EMAIL_FROM_NAME | Sender name | No |
| EMAIL_WEBHOOK_SECRET | Webhook verification | No (webhooks rejected) |
| CRON_SECRET | Cron endpoint protection | No (cron unprotected) |
| ENCRYPTION_KEY | Data encryption | No |
| NEXTAUTH_SECRET | Session security | No |

## 6. Pre-Deployment Checklist

- [ ] Schema and migrations applied to Supabase
- [ ] Environment variables configured
- [ ] Auth enabled in Supabase
- [ ] Workspace created and configured
- [ ] Email provider configured (SMTP or mock)
- [ ] Webhook endpoints configured with provider
- [ ] Cron scheduled for follow-up processing
- [ ] DRY RUN mode enabled (default)
- [ ] Tests passing (`npx vitest run`)
- [ ] TypeScript clean (`npx tsc --noEmit`)
- [ ] Lint clean (`npm run lint`)

## 7. Post-Deployment Verification

1. Visit the deployed URL
2. Sign up and sign in
3. Configure workspace settings
4. Verify DRY RUN mode is active
5. Test lead creation
6. Test outreach draft creation
7. Verify no emails are sent (DRY RUN)

## 8. Rollback Procedure

1. Revert code to previous commit
2. Re-deploy to platform
3. Verify database migrations are compatible
4. Test critical paths (auth, leads, outreach)
