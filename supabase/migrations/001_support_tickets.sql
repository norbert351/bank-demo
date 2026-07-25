-- Support tickets table
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  email text not null,
  subject text not null,
  message text not null,
  response text,
  status text default 'open',
  created_at timestamptz default now()
);

alter table public.support_tickets enable row level security;

drop policy if exists "Users can view their own tickets" on public.support_tickets;
drop policy if exists "Users can insert their own tickets" on public.support_tickets;

create policy "Users can view their own tickets"
on public.support_tickets for select
using (auth.uid() = user_id);

create policy "Users can insert their own tickets"
on public.support_tickets for insert
with check (auth.uid() = user_id);

-- Enable Realtime (also toggle on in Dashboard → Database → Replication)
alter publication supabase_realtime add table public.support_tickets;
