import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/server/supabase-route';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

function toCsvValue(value: unknown) {
  if (value === null || value === undefined) return '';
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  return `"${raw.replaceAll('"', '""')}"`;
}

function rowsToCsv(headers: string[], rows: Array<Record<string, unknown>>) {
  const lines: string[] = [];
  lines.push(headers.map((h) => toCsvValue(h)).join(','));
  for (const row of rows) {
    lines.push(headers.map((h) => toCsvValue(row[h])).join(','));
  }
  return lines.join('\n');
}

export async function GET(request: NextRequest, context: { params: Promise<{ export: string }> }) {
  try {
    const { export: exportName } = await context.params;

    const { supabase, response } = createSupabaseRouteClient(request);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const limit = 500;

    if (exportName === 'shipments') {
      const { data, error } = await supabaseAdmin
        .from('shipments')
        .select('id, reference_number, status, origin_address, destination_address, customer_id, company_id, updated_at, created_at')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const headers = ['id', 'reference_number', 'status', 'origin_address', 'destination_address', 'customer_id', 'company_id', 'created_at', 'updated_at'];
      const csv = rowsToCsv(headers, (data ?? []) as Array<Record<string, unknown>>);

      return new NextResponse(csv, {
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="shipments.csv"',
        },
      });
    }

    if (exportName === 'vehicles') {
      const { data, error } = await supabaseAdmin
        .from('vehicles')
        .select('id, registration_number, make, model, status, current_driver_id, company_id, updated_at, created_at')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const headers = ['id', 'registration_number', 'make', 'model', 'status', 'current_driver_id', 'company_id', 'created_at', 'updated_at'];
      const csv = rowsToCsv(headers, (data ?? []) as Array<Record<string, unknown>>);

      return new NextResponse(csv, {
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="vehicles.csv"',
        },
      });
    }

    if (exportName === 'support_tickets') {
      const { data, error } = await supabaseAdmin
        .from('support_tickets')
        .select('id, subject, priority, status, created_by, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const headers = ['id', 'subject', 'priority', 'status', 'created_by', 'created_at', 'updated_at'];
      const csv = rowsToCsv(headers, (data ?? []) as Array<Record<string, unknown>>);

      return new NextResponse(csv, {
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="support_tickets.csv"',
        },
      });
    }

    if (exportName === 'audit_logs') {
      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .select('id, user_id, action, resource_type, resource_id, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const headers = ['id', 'user_id', 'action', 'resource_type', 'resource_id', 'created_at'];
      const csv = rowsToCsv(headers, (data ?? []) as Array<Record<string, unknown>>);

      return new NextResponse(csv, {
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="audit_logs.csv"',
        },
      });
    }

    return NextResponse.json({ error: 'Unknown export' }, { status: 404 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

