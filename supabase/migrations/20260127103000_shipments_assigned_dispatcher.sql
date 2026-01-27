-- Add operational dispatcher ownership to shipments and enforce admin-only changes.

alter table public.shipments
  add column if not exists assigned_dispatcher_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_shipments_assigned_dispatcher on public.shipments(assigned_dispatcher_id);

create or replace function public.enforce_admin_only_dispatcher_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow backend/service-role updates.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.assigned_dispatcher_id is distinct from old.assigned_dispatcher_id then
    raise exception 'Forbidden: only admins can change assigned_dispatcher_id';
  end if;

  return new;
end;
$$;

drop trigger if exists shipments_enforce_admin_dispatcher_assignment on public.shipments;
create trigger shipments_enforce_admin_dispatcher_assignment
  before update on public.shipments
  for each row
  execute function public.enforce_admin_only_dispatcher_assignment();

