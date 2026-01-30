-- Allow shipments without a linked customer profile.
alter table public.shipments
  alter column customer_id drop not null;
