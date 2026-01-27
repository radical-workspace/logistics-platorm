import { notFound } from 'next/navigation';

import { supabase } from '@/lib/client/supabaseclient';

export default async function TestPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const { data, error } = await supabase.from('profiles').select('*');
  return <pre>{JSON.stringify({ data, error }, null, 2)}</pre>;
}

