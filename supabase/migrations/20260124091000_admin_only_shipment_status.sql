-- Enforce: only admins (or service_role) can change shipments.status.
-- This supports "manual admin workflow" where approval/updates are centralized.

create or replace function public.enforce_admin_only_shipment_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    -- Service role bypass (server-side jobs, admin API routes).
    if auth.role() = 'service_role' then
      return new;
    end if;

    if not exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    ) then
      raise exception 'Only admins can update shipment status';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_admin_only_shipment_status on public.shipments;
create trigger enforce_admin_only_shipment_status
  before update on public.shipments
  for each row
  execute function public.enforce_admin_only_shipment_status();

