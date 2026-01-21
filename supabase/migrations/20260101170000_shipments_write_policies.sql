-- Enable write paths for core operations (shipments + events)
-- Keeps scope minimal and consistent with existing SELECT policies.

-- Shipments: allow admins full write
create policy "Admins can insert shipments" on public.shipments
  for insert
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can update shipments" on public.shipments
  for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Shipments: allow dispatchers to create/update shipments for their company
create policy "Dispatchers can insert company shipments" on public.shipments
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'dispatcher'
        and p.company_id = shipments.company_id
    )
  );

create policy "Dispatchers can update company shipments" on public.shipments
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'dispatcher'
        and p.company_id = shipments.company_id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'dispatcher'
        and p.company_id = shipments.company_id
    )
  );

-- Shipment events: allow admins + dispatchers + assigned drivers to insert events
create policy "Admins can insert shipment events" on public.shipment_events
  for insert
  with check (
    (shipment_events.created_by is null or shipment_events.created_by = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Dispatchers can insert shipment events for company shipments" on public.shipment_events
  for insert
  with check (
    (shipment_events.created_by is null or shipment_events.created_by = auth.uid())
    and exists (
      select 1
      from public.shipments s
      join public.profiles p on p.id = auth.uid()
      where p.role = 'dispatcher'
        and p.company_id = s.company_id
        and s.id = shipment_events.shipment_id
    )
  );

create policy "Drivers can insert events for assigned shipments" on public.shipment_events
  for insert
  with check (
    (shipment_events.created_by is null or shipment_events.created_by = auth.uid())
    and exists (
      select 1
      from public.shipments s
      where s.id = shipment_events.shipment_id
        and (
          s.assigned_driver_id = auth.uid()
          or s.assigned_vehicle_id in (
            select v.id
            from public.vehicles v
            where v.current_driver_id = auth.uid()
          )
        )
    )
  );
