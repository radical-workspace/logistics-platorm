-- Fix recursive RLS on profiles by using security definer helpers.
-- This avoids subqueries on profiles inside profiles policies.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_dispatcher()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'dispatcher'
  );
$$;

create or replace function public.current_company_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select company_id
  from public.profiles
  where id = auth.uid();
$$;

drop policy if exists "Admins view all profiles" on public.profiles;
drop policy if exists "Dispatchers view company profiles" on public.profiles;

create policy "Admins view all profiles" on public.profiles
  for select using (public.is_admin());

create policy "Dispatchers view company profiles" on public.profiles
  for select using (
    public.is_dispatcher()
    and company_id is not null
    and company_id = public.current_company_id()
  );
