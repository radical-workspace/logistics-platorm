-- Support tickets for customer escalations

create table if not exists public.support_tickets (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  message text not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

create policy "Users can create own tickets" on public.support_tickets
  for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Users can view own tickets" on public.support_tickets
  for select
  to authenticated
  using (created_by = auth.uid());

create policy "Admins view all tickets" on public.support_tickets
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins update tickets" on public.support_tickets
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create index if not exists idx_support_tickets_created_by on public.support_tickets(created_by);
create index if not exists idx_support_tickets_created_at on public.support_tickets(created_at desc);

create or replace function public.update_support_tickets_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_support_tickets_updated_at on public.support_tickets;
create trigger update_support_tickets_updated_at
  before update on public.support_tickets
  for each row
  execute function public.update_support_tickets_updated_at();
