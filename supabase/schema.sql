-- Lead Generation Agent - Database Schema
-- Multi-tenant workspace isolation via row-level security (RLS)

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
# System settings: global configuration including kill switch
-- ---------------------------------------------------------------
create table system_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Default kill switch setting (disabled)
insert into system_settings (key, value)
values ('kill_switch', '{"enabled": false, "reason": null, "activated_at": null, "activated_by": null}')
on conflict (key) do nothing;

-- ---------------------------------------------------------------
# Workspaces: isolated containers for each business configuration
-- ---------------------------------------------------------------
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  company_profile jsonb not null default '{}',
  services jsonb not null default '[]',
  pricing jsonb not null default '{}',
  target_markets jsonb not null default '[]',
  icp jsonb not null default '{}',
  approved_claims jsonb not null default '[]',
  brand_voice jsonb not null default '{}',
  outreach_rules jsonb not null default '{}',
  paused boolean not null default false,
  paused_at timestamptz,
  pause_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
# Workspace members: who belongs to which workspace
-- ---------------------------------------------------------------
create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member', -- owner, admin, member
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- ---------------------------------------------------------------
# Leads: prospects discovered and researched
-- ---------------------------------------------------------------
create table leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  name text,
  company text,
  title text,
  linkedin_url text,
  website text,
  source text, -- how the lead was discovered
  raw_data jsonb not null default '{}', -- untrusted prospect data, never executed
  qualification_score integer default 0,
  status text not null default 'new', -- new, qualified, contacted, replied, converted, opt_out
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lead deduplication: same email within a workspace = same lead
create unique index leads_email_workspace_idx
  on leads (lower(email), workspace_id)
  where status <> 'opt_out';

-- ---------------------------------------------------------------
# Evidence: research backing for each lead qualification
-- ---------------------------------------------------------------
create table lead_evidence (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  claim text not null, -- what is being claimed about this lead
  source_url text, -- where the evidence was found
  source_type text, -- linkedin, website, crm, etc.
  confidence numeric(3,2) default 0.00, -- 0.00 to 1.00
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
# Outreach: outbound messages sent to leads
-- ---------------------------------------------------------------
create table outreach (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  channel text not null default 'email', -- email, linkedin, etc.
  subject text,
  body text not null,
  evidence_citations jsonb not null default '[]', -- evidence ids cited in this message
  status text not null default 'draft', -- draft, sent, delivered, opened, replied, bounced, failed
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prevent duplicate sends to same lead within suppression window
create index outreach_lead_status_idx on outreach (lead_id, status);

-- ---------------------------------------------------------------
# Suppression list: opt-outs and do-not-contact entries
-- ---------------------------------------------------------------
create table suppression_list (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  reason text not null default 'opt_out', -- opt_out, hard_bounce, complaint, manual
  source text, -- how the opt-out was received
  created_at timestamptz not null default now(),
  unique (workspace_id, lower(email))
);

-- ---------------------------------------------------------------
# Audit logs: immutable record of all agent actions
-- ---------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_id uuid, -- user_id who triggered the action (null for system)
  action text not null, -- lead.created, outreach.sent, opt_out.received, etc.
  target_type text, -- lead, outreach, workspace, etc.
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_logs_workspace_created_idx on audit_logs (workspace_id, created_at desc);

-- ---------------------------------------------------------------
# Revenue tracking: collected revenue vs projected pipeline
-- ---------------------------------------------------------------
create table revenue_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  amount_cents integer not null, -- stored in cents to avoid float errors
  currency text not null default 'usd',
  type text not null, -- collected, projected, contract_signed
  source text, -- how revenue was attributed
  recorded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
# Operating cost controls
-- ---------------------------------------------------------------
create table cost_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider text not null, -- model, email, calendar, discovery
  amount_cents integer not null,
  currency text not null default 'usd',
  description text,
  recorded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
# Row-Level Security: every table is isolated by workspace_id
-- ---------------------------------------------------------------
alter table system_settings enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table leads enable row level security;
alter table lead_evidence enable row level security;
alter table outreach enable row level security;
alter table suppression_list enable row level security;
alter table audit_logs enable row level security;
alter table revenue_records enable row level security;
alter table cost_records enable row level security;

-- Workspaces: members can see workspaces they belong to
create policy workspaces_visible_to_members on workspaces
  for select using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
    )
  );

-- Workspace members: visible to members of the same workspace
create policy members_visible_to_workspace_members on workspace_members
  for all using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
    )
  );

-- Leads: visible only within the same workspace
create policy leads_isolated_by_workspace on leads
  for all using (
    workspace_id in (
      select wm.workspace_id from workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

-- Lead evidence: visible only within the same workspace
create policy evidence_isolated_by_workspace on lead_evidence
  for all using (
    workspace_id in (
      select wm.workspace_id from workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

-- Outreach: visible only within the same workspace
create policy outreach_isolated_by_workspace on outreach
  for all using (
    workspace_id in (
      select wm.workspace_id from workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

-- Suppression list: visible only within the same workspace
create policy suppression_isolated_by_workspace on suppression_list
  for all using (
    workspace_id in (
      select wm.workspace_id from workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

-- Audit logs: visible only within the same workspace
create policy audit_isolated_by_workspace on audit_logs
  for select using (
    workspace_id in (
      select wm.workspace_id from workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

-- Revenue records: visible only within the same workspace
create policy revenue_isolated_by_workspace on revenue_records
  for all using (
    workspace_id in (
      select wm.workspace_id from workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

-- Cost records: visible only within the same workspace
create policy costs_isolated_by_workspace on cost_records
  for all using (
    workspace_id in (
      select wm.workspace_id from workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

-- System settings: visible to authenticated users
create policy system_settings_visible_to_authenticated on system_settings
  for select using (auth.uid() is not null);

-- ---------------------------------------------------------------
# Updated_at triggers
-- ---------------------------------------------------------------
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language 'plpgsql';

create trigger update_workspaces_updated_at
  before update on workspaces for each row
  execute function update_updated_at_column();

create trigger update_leads_updated_at
  before update on leads for each row
  execute function update_updated_at_column();

create trigger update_outreach_updated_at
  before update on outreach for each row
  execute function update_updated_at_column();

create trigger update_system_settings_updated_at
  before update on system_settings for each row
  execute function update_updated_at_column();
