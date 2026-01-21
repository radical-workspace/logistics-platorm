import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

function sse(data: unknown, event = 'message') {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = (url.searchParams.get('ref') || '').trim();

  if (!ref) {
    return NextResponse.json({ error: 'Missing ref' }, { status: 400 });
  }

  if (ref.length > 80) {
    return NextResponse.json({ error: 'Invalid ref' }, { status: 400 });
  }

  const { data: tracked, error: trackError } = await supabaseAdmin.rpc('track_shipment', {
    p_reference_number: ref,
  });

  if (trackError) {
    return NextResponse.json({ error: trackError.message }, { status: 500 });
  }

  const row = Array.isArray(tracked) ? tracked[0] ?? null : tracked ?? null;

  if (!row?.shipment_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const shipmentId = row.shipment_id as string;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(encoder.encode(sse({ ok: true }, 'ready')));
      controller.enqueue(encoder.encode(sse({ row }, 'snapshot')));

      const channel = supabaseAdmin
        .channel(`public:tracking:${shipmentId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'shipment_events', filter: `shipment_id=eq.${shipmentId}` },
          async () => {
            const { data: next, error } = await supabaseAdmin.rpc('track_shipment', {
              p_reference_number: ref,
            });

            if (error) {
              controller.enqueue(encoder.encode(sse({ error: error.message }, 'error')));
              return;
            }

            const nextRow = Array.isArray(next) ? next[0] ?? null : next ?? null;
            controller.enqueue(encoder.encode(sse({ row: nextRow }, 'snapshot')));
          }
        )
        .subscribe();

      const abort = () => {
        supabaseAdmin.removeChannel(channel);
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      if ('signal' in request && (request as any).signal) {
        (request as any).signal.addEventListener('abort', abort, { once: true });
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
