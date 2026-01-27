-- Allow admins to read all shipment events for dashboards and audits.

create policy "Admins view all shipment events" on public.shipment_events
  for select
  using (public.is_admin());
