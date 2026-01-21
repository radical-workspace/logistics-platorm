import { supabase } from "@/lib/supabaseclient";

export default async function TestPage() {
  const { data, error } = await supabase.from("profiles").select("*");
  return <pre>{JSON.stringify({ data, error }, null, 2)}</pre>;
}
