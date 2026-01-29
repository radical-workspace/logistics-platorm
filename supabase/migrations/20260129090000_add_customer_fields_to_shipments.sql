-- Add columns (IF NOT EXISTS is supported for columns)
ALTER TABLE public.shipments
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS customer_email text,
ADD COLUMN IF NOT EXISTS customer_phone text;

-- Add email constraint only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'shipments'
      AND c.conname = 'shipments_customer_email_format'
  ) THEN
    ALTER TABLE public.shipments
      ADD CONSTRAINT shipments_customer_email_format
      CHECK (customer_email IS NULL OR customer_email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$');
  END IF;
END
$$;

-- Add phone length constraint only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'shipments'
      AND c.conname = 'shipments_customer_phone_len'
  ) THEN
    ALTER TABLE public.shipments
      ADD CONSTRAINT shipments_customer_phone_len
      CHECK (customer_phone IS NULL OR length(customer_phone) BETWEEN 7 AND 25);
  END IF;
END
$$;

-- Indexes (IF NOT EXISTS is supported)
CREATE INDEX IF NOT EXISTS idx_shipments_customer_email ON public.shipments (customer_email);
CREATE INDEX IF NOT EXISTS idx_shipments_reference_number ON public.shipments (reference_number);