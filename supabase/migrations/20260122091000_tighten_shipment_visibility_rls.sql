-- Tighten company-wide visibility to dispatchers only.

drop policy if exists "Dispatchers view company shipments" on public.shipments;

create policy "Dispatchers view company shipments" on public.shipments
  for select
  using (
    public.is_dispatcher()
    and company_id = public.current_company_id()
  );

drop policy if exists "View shipment events if can view shipment" on public.shipment_events;
drop policy if exists "Customers view shipment events" on public.shipment_events;
drop policy if exists "Drivers view shipment events" on public.shipment_events;
drop policy if exists "Dispatchers view company shipment events" on public.shipment_events;

create policy "Customers view shipment events" on public.shipment_events
  for select
  using (
    shipment_id in (
      select id
      from public.shipments
      where customer_id = auth.uid()
    )
  );

create policy "Drivers view shipment events" on public.shipment_events
  for select
  using (
    shipment_id in (
      select id
      from public.shipments
      where assigned_driver_id = auth.uid()
        or assigned_vehicle_id in (
          select id
          from public.vehicles
          where current_driver_id = auth.uid()
        )
    )
  );

create policy "Dispatchers view company shipment events" on public.shipment_events
  for select
  using (
    public.is_dispatcher()
    and shipment_id in (
      select id
      from public.shipments
      where company_id = public.current_company_id()
    )
  );
