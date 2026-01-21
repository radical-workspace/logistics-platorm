import 'server-only';

import { Resend } from 'resend';

export type ShipmentUpdateEmailInput = {
  to: string;
  companyName: string;
  referenceNumber: string;
  status: string;
  updateTitle: string;
  updateBody?: string | null;
  trackingUrl: string;
};

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildShipmentUpdateHtml(input: ShipmentUpdateEmailInput) {
  const title = escapeHtml(input.updateTitle);
  const company = escapeHtml(input.companyName);
  const reference = escapeHtml(input.referenceNumber);
  const status = escapeHtml(input.status);
  const trackingUrl = escapeHtml(input.trackingUrl);
  const body = input.updateBody ? escapeHtml(input.updateBody) : '';

  return `
  <div style="background:#0b1220;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
    <div style="max-width:600px;margin:0 auto;border:1px solid #1f2937;border-radius:14px;overflow:hidden;">
      <div style="background:#0f172a;padding:18px 20px;border-bottom:1px solid #1f2937;">
        <div style="font-size:14px;color:#94a3b8;">${company}</div>
        <div style="font-size:20px;font-weight:800;color:#f8fafc;margin-top:6px;">${title}</div>
      </div>
      <div style="padding:20px;background:#0b1220;">
        <div style="display:flex;gap:18px;flex-wrap:wrap;">
          <div style="flex:1;min-width:220px;">
            <div style="font-size:12px;color:#94a3b8;">Reference</div>
            <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,\"Liberation Mono\",\"Courier New\",monospace;font-size:16px;color:#e2e8f0;margin-top:4px;">${reference}</div>
          </div>
          <div style="flex:1;min-width:220px;text-align:right;">
            <div style="font-size:12px;color:#94a3b8;">Status</div>
            <div style="font-size:16px;font-weight:700;color:#60a5fa;margin-top:4px;">${status}</div>
          </div>
        </div>

        ${body ? `<div style="margin-top:14px;font-size:14px;line-height:1.5;color:#cbd5e1;">${body}</div>` : ''}

        <div style="margin-top:18px;">
          <a href="${trackingUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:800;padding:10px 14px;border-radius:10px;">View Tracking</a>
        </div>

        <div style="margin-top:14px;font-size:12px;color:#64748b;">
          If the button doesn’t work, open: <a href="${trackingUrl}" style="color:#93c5fd;">${trackingUrl}</a>
        </div>
      </div>
    </div>
  </div>
  `;
}

export async function sendShipmentUpdateEmail(input: ShipmentUpdateEmailInput) {
  const apiKey = process.env.RESEND_API_KEY || '';
  if (!apiKey) {
    // Do not crash local/dev if email isn’t configured.
    console.warn('RESEND_API_KEY missing; skipping email send');
    return { skipped: true as const };
  }

  const from = process.env.EMAIL_FROM || 'AFGHCO <onboarding@resend.dev>';
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: input.to,
    subject: `${input.companyName}: ${input.updateTitle} (${input.referenceNumber})`,
    html: buildShipmentUpdateHtml(input),
  });

  return { skipped: false as const };
}
