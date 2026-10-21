-- Migration 003: Add idempotency key to outreach table

-- Add idempotency key column for duplicate-send prevention
alter table outreach
  add column if not exists idempotency_key text;

-- Create unique index on idempotency key per workspace
create unique index if not exists outreach_idempotency_key_idx
  on outreach (workspace_id, idempotency_key)
  where idempotency_key is not null;
