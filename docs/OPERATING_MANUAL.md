# Operating Manual

This manual covers day-to-day operations of the Lead Generation Agent,
including workspace management, lead handling, outreach workflows,
compliance controls, and incident response.

## 1. Workspace Management

### 1.1 Configure Your Workspace

After signing in, navigate to the workspace settings page to configure:

- **Company profile**: Company name, website, contact email, description
- **Services**: Service names, descriptions, starting prices
- **Pricing**: Minimum project price and currency
- **Target markets**: Countries where you do business
- **ICP (Ideal Customer Profile)**: Industries, company sizes, job titles, pain points
- **Approved claims**: Claims your team is authorized to make about prospects
- **Brand voice**: Tone, formality level, claims to avoid
- **Outreach rules**: Max emails per day, follow-up limit, days between follow-ups

### 1.2 Pause a Workspace

Pausing a workspace blocks all outbound sending for that workspace.
Use this for compliance reviews, holidays, or incidents.

- Navigate to Workspace Settings
- Toggle "Pause workspace"
- Provide a reason
- All pending follow-ups are cancelled
- Resume by toggling pause off

### 1.3 Emergency Kill Switch

The global kill switch stops ALL outbound sending across ALL
workspaces. Use only for serious incidents.

- Only users with system access can activate it
- Activation is audit logged with reason and actor
- Deactivation requires explicit action

## 2. Lead Management

### 2.1 Add Leads

Leads can be added manually or via prospect discovery:

- **Manual**: Use the "Add lead" form with email, name, company, title, LinkedIn, website, and source
- **Discovery**: Uses the configured prospect discovery provider (mock by default)
- **Deduplication**: Same email within a workspace cannot be added twice

### 2.2 Lead Fields

| Field | Description |
|-------|-------------|
| Email | Contact email address (unique per workspace) |
| Name | Contact's full name |
| Company | Contact's company |
| Title | Contact's job title |
| LinkedIn URL | LinkedIn profile URL |
| Website | Company or personal website |
| Source | How the lead was discovered |
| Qualification score | 0-100 score based on ICP match |
| Status | new, qualified, contacted, replied, converted, opt_out |

### 2.3 Qualification Scoring

Scores are based on:
- Has contact email (25% weight)
- Has company information (20%)
- Has website (15%)
- ICP industry match (15%)
- ICP job title match (15%)
- Target market match (10%)

Tiers: cold (<50), warm (50-74), hot (75+).

### 2.4 Evidence

Add evidence-backed observations to leads:
- Claim: What you're claiming about the lead
- Source URL: Where you found the information
- Source type: website, linkedin, crm, etc.
- Confidence: 0-100%

Every factual claim in outreach must trace to evidence or an approved
workspace claim.

## 3. Outreach Workflow

### 3.1 DRY RUN Mode (Default)

DRY RUN is enabled by default:
- Outreach drafts are created but NOT sent
- No real emails are delivered
- Follow-ups are scheduled but not executed
- All compliance checks still run

### 3.2 Create Outreach

1. Select a lead from the pipeline
2. Click "Create outreach"
3. Generate a draft (AI-powered if MODEL_API_KEY is configured)
4. Review and edit the draft
5. Save the draft

### 3.2 SUPERVISED Mode

In SUPERVISED mode:
- Drafts get `pending_approval` status
- No emails are sent until explicitly approved
- Review recipient, evidence, message content, and compliance checks
- Click "Approve" to send or "Reject" to cancel

### 3.3 AUTONOMOUS Mode

AUTONOMOUS mode is NOT available. It requires:
- Explicit authenticated user action
- Required integrations verified
- Compliance safeguards verified
- Operational limits verified

Do not attempt to enable autonomous bulk outreach.

### 3.4 Sending Rules

- DRY RUN mode is default — no real emails sent
- Suppression list blocks opted-out contacts
- Daily send limits enforced per workspace
- Duplicate-send prevention via idempotency keys
- Follow-up limit enforced (default max 2)
- Days between follow-ups enforced (default 7)
- Follow-ups stopped when prospect replies, opts out, or complaints

## 4. Compliance Controls

### 4.1 Suppression List

Contacts on the suppression list cannot be contacted. Reasons:
- opt_out: Contact requested to stop
- hard_bounce: Email permanently failed
- complaint: Contact marked as spam
- manual: Manually added

### 4.2 Approved Claims

Only claims in the workspace's approved claims list can be made in
outreach. Claims outside this list are blocked.

### 4.3 Brand Voice

- Tone and formality guide messaging
- Do-not-claim list prevents unauthorized claims

### 4.4 Audit Logs

All actions are logged:
- Workspace settings changes
- Lead creation, updates, archiving
- Evidence addition/removal
- Outreach creation, approval, sending
- Follow-up scheduling/cancellation
- Kill switch activation/deactivation
- Workspace pause/unpause

## 5. Incident Response

### 5.1 Stop All Sending

Activate the global kill switch to immediately stop all outbound
sending across all workspaces.

### 5.2 Pause a Single Workspace

Pause an individual workspace to stop its sending while allowing
others to continue.

### 5.3 Handle Bounces

- Hard bounces are automatically added to the suppression list
- Pending follow-ups for bounced leads are cancelled
- Webhook endpoints process bounce events from your email provider

### 5.4 Handle Replies

- Replies stop all pending follow-ups for that lead
- Outreach status is updated to "replied"
- Review and respond manually

### 5.5 Handle Complaints

- Complaints add the contact to the suppression list
- All pending follow-ups are cancelled
- Outreach status is updated to "failed"

## 6. Webhook Configuration

Configure your email provider to send webhooks to:

| Event | Endpoint |
|-------|----------|
| Bounce | `POST /api/webhooks/email/bounce` |
| Reply | `POST /api/webhooks/email/reply` |
| Complaint | `POST /api/webhooks/email/complaint` |

Set the `x-webhook-signature` header using `EMAIL_WEBHOOK_SECRET`.

## 7. Follow-Up Automation

Follow-ups are processed via cron:

- Endpoint: `GET /api/cron/process-follow-ups`
- Protect with `CRON_SECRET` header
- Configure your scheduler (e.g., Vercel Cron) to call this endpoint
- Follow-ups respect the workspace's follow-up limit and days-between setting
- DRY RUN mode creates drafts instead of sending

## 8. Revenue Tracking

Track revenue separately:
- Collected: Actual payments received
- Projected: Pipeline value
- Contract signed: Signed agreements

Record revenue records with amount, currency, type, source, and
associated lead.

## 9. Cost Tracking

Track operating costs:
- Provider: model, email, calendar, discovery
- Amount in cents
- Description
- Used for cost ceiling enforcement

## 10. Security

- All data is isolated by workspace via row-level security
- Users can only access workspaces they are members of
- Credentials are stored server-side only
- Never commit `.env.local`
- Rotate credentials regularly
