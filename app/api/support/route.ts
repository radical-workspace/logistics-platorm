import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteClient } from '@/lib/supabase-route';
import { supabaseAdmin } from '@/lib/supabase-admin';

const TicketSchema = z.object({
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(4000),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
});

export async function POST(request: NextRequest) {
  try {
    const { supabase, response } = createSupabaseRouteClient(request);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const parsed = TicketSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 });
    }

    const { subject, message, priority } = parsed.data;

    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        subject,
        message,
        priority,
        status: 'open',
        created_by: user.id,
      })
      .select('id, created_at, priority, status, subject')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'support_ticket.created',
      resource_type: 'support_ticket',
      resource_id: data.id,
      changes: { subject, priority },
    });

    return NextResponse.json({ ticket: data }, { status: 201, headers: response.headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
