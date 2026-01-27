-- Add shipment "current location" mirror fields and keep them in sync from shipment_events.
-- This enables admin/ops consoles to show "last known location" without re-querying the full event stream.

alter table public.shipments
  add column if not exists current_location_label text,
  add column if not exists current_lat numeric(10, 8),
  add column if not exists current_lng numeric(11, 8),
  add column if not exists last_event_at timestamptz;

create or replace function public.sync_shipment_current_from_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Always maintain last_event_at.
  update public.shipments
     set last_event_at = new.created_at,
         current_lat = case
           when new.latitude is not null and new.longitude is not null then new.latitude
           else public.shipments.current_lat
         end,
         current_lng = case
           when new.latitude is not null and new.longitude is not null then new.longitude
           else public.shipments.current_lng
         end,
         current_location_label = case
           when new.latitude is not null
             and new.longitude is not null
             and (public.shipments.current_location_label is null or public.shipments.current_location_label = '')
             and coalesce(btrim(new.notes), '') <> ''
           then btrim(new.notes)
           else public.shipments.current_location_label
         end
   where public.shipments.id = new.shipment_id;

  return new;
end;
$$;

drop trigger if exists shipment_events_sync_shipment_current on public.shipment_events;
create trigger shipment_events_sync_shipment_current
  after insert on public.shipment_events
  for each row
  execute function public.sync_shipment_current_from_event();

-- Backfill current fields from the latest event per shipment (best-effort).
with latest as (
  select distinct on (se.shipment_id)
    se.shipment_id,
    se.created_at,
    se.latitude,
    se.longitude,
    nullif(btrim(se.notes), '') as notes
  from public.shipment_events se
  order by se.shipment_id, se.created_at desc
)
update public.shipments s
   set last_event_at = l.created_at,
       current_lat = case when l.latitude is not null and l.longitude is not null then l.latitude else s.current_lat end,
       current_lng = case when l.latitude is not null and l.longitude is not null then l.longitude else s.current_lng end,
       current_location_label = case
         when (s.current_location_label is null or s.current_location_label = '')
           and l.latitude is not null and l.longitude is not null
           and l.notes is not null
         then l.notes
         else s.current_location_label
       end
  from latest l
 where s.id = l.shipment_id;

