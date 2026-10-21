-- Migration 004: Add follow-up tracking to outreach table

-- Add follow-up tracking columns to outreach
alter table outreach
  add column if not exists follow_up_count integer not null default 0,
  add column if not exists original_outreach_id uuid references outreach(id),
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists max_follow_ups integer not null default 2;

-- Index for finding due follow-ups
create index if not exists outreach_next_follow_up_idx
  on outreach (next_follow_up_at)
  where next_follow_up_at is not null and follow_up_count < max_follow_ups;

-- Index for finding follow-ups of an original outreach
create index if not exists outreach_original_outreach_idx
  on outreach (original_outreach_id);
