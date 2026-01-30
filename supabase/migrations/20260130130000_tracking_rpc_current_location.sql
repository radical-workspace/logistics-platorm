-- Include current_location_* fields for tracking map fallback.

drop function if exists public.track_shipment(text);

create or replace function public.track_shipment(p_reference_number text)
returns table (
  shipment_id uuid,
  reference_number text,
  status shipment_status,
  origin_address text,
  origin_lat numeric,
  origin_lng numeric,
  destination_address text,
  dest_lat numeric,
  dest_lng numeric,
  current_location_label text,
  current_lat numeric,
  current_lng numeric,
  estimated_delivery timestamptz,
  actual_delivery timestamptz,
  last_event_type text,
  last_event_notes text,
  last_event_at timestamptz,
  last_event_lat numeric,
  last_event_lng numeric
)
language sql
security definer
set search_path = public
as $$
  select
    s.id as shipment_id,
    s.reference_number,
    s.status,
    s.origin_address,
    s.origin_lat,
    s.origin_lng,
    s.destination_address,
    s.dest_lat,
    s.dest_lng,
    s.current_location_label,
    s.current_lat,
    s.current_lng,
    s.estimated_delivery,
    s.actual_delivery,
    e.event_type as last_event_type,
    e.notes as last_event_notes,
    e.created_at as last_event_at,
    e.latitude as last_event_lat,
    e.longitude as last_event_lng
  from public.shipments s
  left join lateral (
    select se.event_type, se.notes, se.created_at, se.latitude, se.longitude
    from public.shipment_events se
    where se.shipment_id = s.id
    order by se.created_at desc
    limit 1
  ) e on true
  where s.reference_number = p_reference_number;
$$;

grant execute on function public.track_shipment(text) to anon, authenticated;
