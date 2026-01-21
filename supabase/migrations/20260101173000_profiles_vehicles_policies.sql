-- Allow dispatchers/admins to view company members + vehicles

-- PROFILES: dispatchers can view profiles in their company
create policy "Dispatchers view company profiles" on public.profiles
  for select
  using (
    exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.role = 'dispatcher'
        and me.company_id is not null
        and me.company_id = profiles.company_id
    )
  );

-- VEHICLES: company members can view vehicles in their company
create policy "Company members view vehicles" on public.vehicles
  for select
  using (
    company_id in (
      select company_id
      from public.profiles
      where id = auth.uid()
    )
  );

-- VEHICLES: admins full write
create policy "Admins can insert vehicles" on public.vehicles
  for insert
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can update vehicles" on public.vehicles
  for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- VEHICLES: dispatchers can insert/update vehicles for their company
create policy "Dispatchers can insert company vehicles" on public.vehicles
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'dispatcher'
        and p.company_id = vehicles.company_id
    )
  );

create policy "Dispatchers can update company vehicles" on public.vehicles
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'dispatcher'
        and p.company_id = vehicles.company_id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'dispatcher'
        and p.company_id = vehicles.company_id
    )
  );
