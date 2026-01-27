-- Allow service_role inserts for shipment_events while preserving authenticated user audit

create or replace function public.set_shipment_event_created_by()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    new.created_by := auth.uid();
    return new;
  end if;

  if auth.role() = 'service_role' then
    -- allow server/service-role inserts; keep provided created_by (may be null)
    return new;
  end if;

  raise exception 'Not authenticated';
end;
$$;

drop trigger if exists shipment_events_set_created_by on public.shipment_events;
create trigger shipment_events_set_created_by
  before insert on public.shipment_events
  for each row
  execute function public.set_shipment_event_created_by();
