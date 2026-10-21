-- Migration 005: Add background jobs table for durable follow-up processing

-- ---------------------------------------------------------------
# Background jobs: durable job queue for follow-ups, retries, cancellation
-- ---------------------------------------------------------------
create table background_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  job_type text not null, -- follow_up, retry, cancellation, outreach_send
  status text not null default 'pending', -- pending, running, completed, failed
  payload jsonb not null default '{}',
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  retry_count integer not null default 0,
  max_retries integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for finding pending jobs
create index background_jobs_pending_idx
  on background_jobs (status, scheduled_at)
  where status = 'pending';

-- Index for finding jobs by workspace
create index background_jobs_workspace_idx
  on background_jobs (workspace_id, created_at desc);

-- Enable RLS
alter table background_jobs enable row level security;

-- Background jobs: visible to workspace members
create policy background_jobs_visible_to_members on background_jobs
  for all using (
    workspace_id in (
      select wm.workspace_id from workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

-- Updated_at trigger
create trigger update_background_jobs_updated_at
  before update on background_jobs for each row
  execute function update_updated_at_column();
