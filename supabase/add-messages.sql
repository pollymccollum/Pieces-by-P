-- ============================================================
-- PIECES BY P  |  Contact form messages
-- Run once per project, after schema.sql. Safe to re-run.
--
-- The contact form saves here rather than only emailing. Two reasons:
--   1. It works whether or not email is configured — a message can never
--      be lost because a mail provider was down or not set up yet.
--   2. Polly gets one place to see enquiries, alongside her orders.
-- An email notification is sent as well when email is configured.
-- ============================================================

create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  body        text not null,
  handled     boolean not null default false,  -- she ticks these off
  created_at  timestamptz not null default now()
);
create index if not exists messages_created_idx on messages (created_at desc);

alter table messages enable row level security;

-- Anyone can send a message. Nobody but the owner can read them —
-- same shape as orders: public INSERT, owner SELECT/UPDATE.
drop policy if exists "public send message" on messages;
create policy "public send message"
  on messages for insert with check (true);

drop policy if exists "owner read messages" on messages;
create policy "owner read messages"
  on messages for select using (auth.role() = 'authenticated');

drop policy if exists "owner update messages" on messages;
create policy "owner update messages"
  on messages for update using (auth.role() = 'authenticated');

drop policy if exists "owner delete messages" on messages;
create policy "owner delete messages"
  on messages for delete using (auth.role() = 'authenticated');
