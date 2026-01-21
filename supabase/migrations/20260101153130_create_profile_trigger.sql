drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.create_profile_for_new_user();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	new_display_name text;
begin
	new_display_name := coalesce(
		new.raw_user_meta_data ->> 'display_name',
		split_part(new.email, '@', 1)
	);

	insert into public.profiles (id, email, display_name)
	values (new.id, new.email, new_display_name)
	on conflict (id) do update
		set email = excluded.email,
				display_name = excluded.display_name,
				updated_at = now();

	return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.create_profile_for_new_user();

insert into public.profiles (id, email, display_name)
select
	u.id,
	u.email,
	coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
from auth.users u
where not exists (
	select 1
	from public.profiles p
	where p.id = u.id
);

