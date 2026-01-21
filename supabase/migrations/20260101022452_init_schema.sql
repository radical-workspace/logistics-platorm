create table profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  role text default 'user',
  created_at timestamptz default now()
);
