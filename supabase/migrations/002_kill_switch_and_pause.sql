-- Migration 002: Emergency kill switch and workspace pause controls

-- ---------------------------------------------------------------
# System settings: global configuration including kill switch
-- ---------------------------------------------------------------
create table if not exists system_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Insert default kill switch setting (disabled)
insert into system_settings (key, value)
values ('kill_switch', '{"enabled": false, "reason": null, "activated_at": null, "activated_by": null}')
on conflict (key) do nothing;

-- ---------------------------------------------------------------
# Workspace pause controls: add pause fields to workspaces
-- ---------------------------------------------------------------
alter table workspaces
  add column if not paused boolean not null default false,
  add column if not paused_at timestamptz,
  add column if not pause_reason text;

-- Enable RLS on system_settings
alter table system_settings enable row level security;

-- System settings: visible to authenticated users (read-only for most)
create policy system_settings_visible_to_authenticated on system_settings
  for select using (auth.uid() is not null);

-- ---------------------------------------------------------------
# Updated_at trigger for system_settings
-- ---------------------------------------------------------------
create trigger update_system_settings_updated_at
  before update on system_settings for each row
  execute function update_updated_at_column();
