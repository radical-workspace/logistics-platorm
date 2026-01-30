import Link from 'next/link';
import Header from '@/app/composer/Header';
import { createSupabasePublicServerClient } from '@/lib/server/supabase-public-server';
import TrackingLiveClient from '@/app/tracking/TrackingLiveClient';
import Footer from '@/app/components/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type TrackShipmentRow = {
  shipment_id: string;
  reference_number: string;
  status: string;
  origin_address: string;
  origin_lat: string | number | null;
  origin_lng: string | number | null;
  destination_address: string;
  dest_lat: string | number | null;
  dest_lng: string | number | null;
  current_location_label: string | null;
  current_lat: string | number | null;
  current_lng: string | number | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  last_event_type: string | null;
  last_event_notes: string | null;
  last_event_at: string | null;
  last_event_lat: string | number | null;
  last_event_lng: string | number | null;
};

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const refParam = params.ref;
  const reference = Array.isArray(refParam) ? refParam[0] : refParam;

  const trimmed = (reference || '').trim();

  const supabase = createSupabasePublicServerClient();

  const { data, error } = trimmed
    ? await supabase.rpc('track_shipment', {
        p_reference_number: trimmed,
      })
    : { data: null, error: null };

  const row = (Array.isArray(data) ? (data[0] as TrackShipmentRow | undefined) : undefined) ?? undefined;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 text-slate-100 pt-20 sm:pt-24 px-4 sm:px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-black">Shipment Tracking</h1>
          <p className="mt-2 text-slate-400">
            Enter a shipment reference from the home page to view status.
          </p>

          {!trimmed ? (
            <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <p className="text-slate-300">No reference provided.</p>
              <Link className="inline-block mt-4 text-blue-400 hover:text-blue-300" href="/">
                Go back
              </Link>
            </div>
          ) : error ? (
            <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <p className="text-slate-300">Tracking lookup failed.</p>
              <p className="mt-2 text-slate-500 text-sm">{error.message}</p>
              <Link className="inline-block mt-4 text-blue-400 hover:text-blue-300" href="/">
                Try another
              </Link>
            </div>
          ) : !row ? (
            <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <p className="text-slate-300">No shipment found for reference:</p>
              <p className="mt-2 font-mono text-slate-200">{trimmed}</p>
              <Link className="inline-block mt-4 text-blue-400 hover:text-blue-300" href="/">
                Try another
              </Link>
            </div>
          ) : (
            <TrackingLiveClient initialRow={row} reference={trimmed} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

