-- Public tracking RPC + profile auto-provisioning

-- 1) Auto-create public.profiles row for each new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'display_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2) Public tracking function (returns limited fields only)
create or replace function public.track_shipment(p_reference_number text)
returns table (
  shipment_id uuid,
  reference_number text,
  status shipment_status,
  origin_address text,
  destination_address text,
  estimated_delivery timestamptz,
  actual_delivery timestamptz,
  last_event_type text,
  last_event_notes text,
  last_event_at timestamptz
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
    s.destination_address,
    s.estimated_delivery,
    s.actual_delivery,
    e.event_type as last_event_type,
    e.notes as last_event_notes,
    e.created_at as last_event_at
  from public.shipments s
  left join lateral (
    select se.event_type, se.notes, se.created_at
    from public.shipment_events se
    where se.shipment_id = s.id
    order by se.created_at desc
    limit 1
  ) e on true
  where s.reference_number = p_reference_number;
$$;

grant execute on function public.track_shipment(text) to anon, authenticated;
