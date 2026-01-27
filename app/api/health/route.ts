import { NextResponse } from 'next/server';

function getRequestId(headers: Headers) {
  return headers.get('x-request-id') || null;
}

export const runtime = 'nodejs';

export function GET(request: Request) {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    requestId: getRequestId(request.headers),
  });
}
