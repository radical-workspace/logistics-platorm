-- Enforce shipment_events.created_by from auth.uid() to prevent spoofing

create or replace function public.set_shipment_event_created_by()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  new.created_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists shipment_events_set_created_by on public.shipment_events;
create trigger shipment_events_set_created_by
  before insert on public.shipment_events
  for each row
  execute function public.set_shipment_event_created_by();
