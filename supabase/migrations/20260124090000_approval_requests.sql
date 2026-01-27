-- Approval requests for manual admin workflows (approve/reject)

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  requested_payload jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.approval_requests enable row level security;

create index if not exists idx_approval_requests_shipment on public.approval_requests(shipment_id);
create index if not exists idx_approval_requests_requested_by on public.approval_requests(requested_by);
create index if not exists idx_approval_requests_status on public.approval_requests(status);
create index if not exists idx_approval_requests_created_at on public.approval_requests(created_at desc);

-- Prevent multiple pending confirmations for the same shipment
create unique index if not exists approval_requests_one_pending_delivery_confirm
  on public.approval_requests (shipment_id)
  where request_type = 'delivery_confirmation' and status = 'pending';

create or replace function public.update_approval_requests_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_approval_requests_updated_at on public.approval_requests;
create trigger update_approval_requests_updated_at
  before update on public.approval_requests
  for each row
  execute function public.update_approval_requests_updated_at();

-- RLS: customers can create/view their own requests for their own shipments
create policy "Users create approval requests for own shipments" on public.approval_requests
  for insert
  to authenticated
  with check (
    requested_by = auth.uid()
    and status = 'pending'
    and exists (
      select 1
      from public.shipments s
      where s.id = approval_requests.shipment_id
        and s.customer_id = auth.uid()
    )
  );

create policy "Users view own approval requests" on public.approval_requests
  for select
  to authenticated
  using (requested_by = auth.uid());

-- Admins can view/update all approval requests
create policy "Admins view all approval requests" on public.approval_requests
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins update approval requests" on public.approval_requests
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
