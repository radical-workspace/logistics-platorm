import 'server-only';

import nodemailer from 'nodemailer';

import { serverEnv } from '@/lib/env/server';

type BaseEmailInput = {
  to: string;
  referenceNumber: string;
  customerName?: string | null;
  customerEmail?: string | null;
  originAddress?: string | null;
  destinationAddress?: string | null;
  statusLabel?: string | null;
  locationLabel?: string | null;
  eventNotes?: string | null;
  eventTime?: string | null;
  estimatedDelivery?: string | null;
  deliveredAt?: string | null;
};

type TemplateTokens = {
  brandName: string;
  brandLogoUrl: string;
  brandAddress: string;
  supportEmail: string;
  customerName: string;
  referenceNumber: string;
  originAddress: string;
  destinationAddress: string;
  statusLabel: string;
  estimatedDelivery: string;
  locationLabel: string;
  eventTime: string;
  eventNotes: string;
  deliveredAt: string;
  trackingUrl: string;
  year: string;
  status_label: string;
  current_location_label: string;
  origin_label: string;
  current_stop_label: string;
  destination_label: string;
  last_update_at: string;
  progress_percent: string;
  progress_caption: string;
};

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function progressFromStatus(status: string) {
  const s = status.toLowerCase();
  if (!s) return { percent: 10, caption: 'Preparing shipment' };
  if (s.includes('pending')) return { percent: 15, caption: 'Preparing shipment' };
  if (s.includes('picked')) return { percent: 35, caption: 'Picked up' };
  if (s.includes('transit')) return { percent: 60, caption: 'In transit' };
  if (s.includes('delivered')) return { percent: 100, caption: 'Delivered' };
  if (s.includes('cancel')) return { percent: 100, caption: 'Cancelled' };
  return { percent: 45, caption: 'Processing' };
}

function buildTrackingUrl(referenceNumber: string) {
  const nodeEnv = serverEnv.NODE_ENV || process.env.NODE_ENV || 'development';
  const baseUrl = serverEnv.APP_BASE_URL || (nodeEnv === 'production' ? '' : 'http://localhost:3000');
  if (!baseUrl && nodeEnv === 'production') {
    throw new Error('APP_BASE_URL is required in production');
  }
  return `${baseUrl}/tracking?ref=${encodeURIComponent(referenceNumber)}`;
}

function resolveBrandLogoUrl(baseUrl: string) {
  const fromEnv = serverEnv.BRAND_LOGO_URL || '';
  if (fromEnv) return fromEnv;
  return `${baseUrl}/brand/afghco-logo.png`;
}

function getTokens(input: BaseEmailInput): TemplateTokens {
  const brandName = serverEnv.BRAND_NAME || 'AFGHCO Shipping & Logistics';
  const brandAddress = serverEnv.BRAND_ADDRESS || '';
  const supportEmail = serverEnv.SUPPORT_EMAIL || '';
  const statusLabel = input.statusLabel || 'Pending';
  const { percent, caption } = progressFromStatus(statusLabel);
  const progressPercent = Math.max(0, Math.min(100, Math.round(percent)));

  const trackingUrl = buildTrackingUrl(input.referenceNumber);
  const brandLogoUrl = resolveBrandLogoUrl(trackingUrl.split('/tracking')[0]);

  return {
    brandName: escapeHtml(brandName),
    brandLogoUrl: escapeHtml(brandLogoUrl),
    brandAddress: escapeHtml(brandAddress),
    supportEmail: escapeHtml(supportEmail),
    customerName: escapeHtml(input.customerName || 'there'),
    referenceNumber: escapeHtml(input.referenceNumber),
    originAddress: escapeHtml(input.originAddress || '—'),
    destinationAddress: escapeHtml(input.destinationAddress || '—'),
    statusLabel: escapeHtml(statusLabel),
    estimatedDelivery: escapeHtml(input.estimatedDelivery || '—'),
    locationLabel: escapeHtml(input.locationLabel || 'Status update'),
    eventTime: escapeHtml(input.eventTime || '—'),
    eventNotes: escapeHtml(input.eventNotes || '—'),
    deliveredAt: escapeHtml(input.deliveredAt || '—'),
    trackingUrl: escapeHtml(trackingUrl),
    year: escapeHtml(String(new Date().getFullYear())),
    status_label: escapeHtml(statusLabel),
    current_location_label: escapeHtml(input.locationLabel || 'Status update'),
    origin_label: escapeHtml(input.originAddress || '—'),
    current_stop_label: escapeHtml(input.locationLabel || 'Status update'),
    destination_label: escapeHtml(input.destinationAddress || '—'),
    last_update_at: escapeHtml(input.eventTime || '—'),
    progress_percent: escapeHtml(String(progressPercent)),
    progress_caption: escapeHtml(caption),
  };
}

function replaceTokens(template: string, tokens: TemplateTokens) {
  let output = template;
  (Object.keys(tokens) as Array<keyof TemplateTokens>).forEach((key) => {
    output = output.replaceAll(`{{${key}}}`, tokens[key]);
  });
  return output;
}

function trackingProgressBoxHtml() {
  return `
<!-- Tracking Progress Box (ADD ONLY - do not change your existing layout) -->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0 0 0;">
  <tr>
    <td style="background:#0b1220;border:1px solid rgba(148,163,184,.22);border-radius:14px;padding:16px;">
      <div style="font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;font-size:14px;line-height:20px;">
        <div style="font-weight:700;font-size:14px;letter-spacing:.02em;margin:0 0 10px 0;">
          Shipment progress
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="padding:6px 0;color:#94a3b8;width:140px;">Status</td>
            <td style="padding:6px 0;color:#e5e7eb;font-weight:600;">{{status_label}}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Current location</td>
            <td style="padding:6px 0;color:#e5e7eb;font-weight:600;">
              {{current_location_label}}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Route</td>
            <td style="padding:6px 0;color:#e5e7eb;">
              {{origin_label}} &nbsp;→&nbsp; <span style="color:#60a5fa;font-weight:700;">{{current_stop_label}}</span> &nbsp;→&nbsp; {{destination_label}}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;">Last update</td>
            <td style="padding:6px 0;color:#e5e7eb;">{{last_update_at}}</td>
          </tr>
        </table>

        <div style="margin-top:12px;">
          <div style="height:10px;background:rgba(148,163,184,.18);border-radius:999px;overflow:hidden;">
            <div style="height:10px;width:{{progress_percent}}%;background:#3b82f6;border-radius:999px;"></div>
          </div>
          <div style="margin-top:6px;color:#94a3b8;font-size:12px;">
            {{progress_caption}}
          </div>
        </div>

      </div>
    </td>
  </tr>
</table>
`;
}

const createdHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>Shipment Created</title>
  </head>
  <body style="margin:0;padding:0;background:#050814;color:#E7EEF9;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050814;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:92vw;">
            <tr>
              <td style="padding:8px 12px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="left" style="font-size:14px;color:#9FB2D0;">
                      <div style="display:flex;align-items:center;gap:10px;">
                        <img src="{{brandLogoUrl}}" alt="{{brandName}}" width="28" height="28"
                          style="display:inline-block;border-radius:8px;border:1px solid #1B2A44;background:#0B1226;">
                        <span style="font-weight:700;letter-spacing:.6px;text-transform:uppercase;">{{brandName}}</span>
                      </div>
                    </td>
                    <td align="right" style="font-size:12px;color:#9FB2D0;">
                      {{supportEmail}}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#0B1226;border:1px solid #16223A;border-radius:16px;padding:22px;">
                <div style="font-size:12px;color:#9FB2D0;text-transform:uppercase;letter-spacing:.12em;">
                  Shipment created
                </div>
                <h1 style="margin:10px 0 6px;font-size:22px;line-height:1.25;">
                  Your shipment is now active
                </h1>
                <p style="margin:0 0 16px;color:#B9C7DD;font-size:14px;line-height:1.6;">
                  Hello {{customerName}}, your shipment has been created successfully. Use your tracking reference anytime to view status updates.
                </p>

                <div style="display:inline-block;padding:10px 12px;border-radius:12px;background:#081027;border:1px solid #1B2A44;">
                  <div style="font-size:11px;color:#9FB2D0;letter-spacing:.14em;text-transform:uppercase;">Tracking reference</div>
                  <div style="font-size:18px;font-weight:800;color:#E7EEF9;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">
                    {{referenceNumber}}
                  </div>
                </div>

                ${trackingProgressBoxHtml()}

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;">
                  <tr>
                    <td style="padding:12px;border:1px solid #16223A;border-radius:14px;background:#070E20;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="font-size:12px;color:#9FB2D0;">Origin</td>
                          <td style="font-size:12px;color:#9FB2D0;" align="right">Destination</td>
                        </tr>
                        <tr>
                          <td style="font-size:14px;color:#E7EEF9;font-weight:700;padding-top:6px;">
                            {{originAddress}}
                          </td>
                          <td style="font-size:14px;color:#E7EEF9;font-weight:700;padding-top:6px;" align="right">
                            {{destinationAddress}}
                          </td>
                        </tr>
                        <tr>
                          <td style="font-size:12px;color:#9FB2D0;padding-top:10px;">
                            Status: <span style="color:#7CC4FF;font-weight:700;">{{statusLabel}}</span>
                          </td>
                          <td style="font-size:12px;color:#9FB2D0;padding-top:10px;" align="right">
                            ETA: <span style="color:#E7EEF9;font-weight:700;">{{estimatedDelivery}}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <div style="margin-top:18px;">
                  <a href="{{trackingUrl}}" style="display:inline-block;background:#2E6BFF;color:#ffffff;text-decoration:none;
                    padding:12px 14px;border-radius:12px;font-weight:800;font-size:14px;">
                    Track shipment
                  </a>
                  <span style="display:inline-block;margin-left:10px;font-size:12px;color:#9FB2D0;">
                    Or open: <span style="color:#B9C7DD;">{{trackingUrl}}</span>
                  </span>
                </div>

                <p style="margin:18px 0 0;color:#9FB2D0;font-size:12px;line-height:1.6;">
                  You’re receiving this because a shipment was created using this email. If you believe this is an error, contact
                  <span style="color:#B9C7DD;">{{supportEmail}}</span>.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 12px 0;color:#6F86A8;font-size:12px;line-height:1.6;">
                <div style="border-top:1px solid #16223A;padding-top:12px;">
                  © {{year}} {{brandName}} • {{brandAddress}}
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const updateHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>Shipment Update</title>
  </head>
  <body style="margin:0;padding:0;background:#050814;color:#E7EEF9;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050814;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:92vw;">
            <tr>
              <td style="padding:8px 12px 16px;">
                <table role="presentation" width="100%">
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:10px;">
                        <img src="{{brandLogoUrl}}" alt="{{brandName}}" width="28" height="28"
                          style="display:inline-block;border-radius:8px;border:1px solid #1B2A44;background:#0B1226;">
                        <span style="font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#9FB2D0;">{{brandName}}</span>
                      </div>
                    </td>
                    <td align="right" style="font-size:12px;color:#9FB2D0;">{{supportEmail}}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#0B1226;border:1px solid #16223A;border-radius:16px;padding:22px;">
                <div style="font-size:12px;color:#9FB2D0;text-transform:uppercase;letter-spacing:.12em;">
                  Shipment update
                </div>
                <h1 style="margin:10px 0 6px;font-size:22px;line-height:1.25;">
                  Status changed to <span style="color:#7CC4FF;">{{statusLabel}}</span>
                </h1>
                <p style="margin:0 0 16px;color:#B9C7DD;font-size:14px;line-height:1.6;">
                  Hello {{customerName}}, your shipment <strong style="color:#E7EEF9;">{{referenceNumber}}</strong> has a new update.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:6px;">
                  <tr>
                    <td style="padding:12px;border:1px solid #16223A;border-radius:14px;background:#070E20;">
                      <table role="presentation" width="100%">
                        <tr>
                          <td style="font-size:12px;color:#9FB2D0;">Last update</td>
                          <td style="font-size:12px;color:#9FB2D0;" align="right">Time</td>
                        </tr>
                        <tr>
                          <td style="font-size:14px;color:#E7EEF9;font-weight:800;padding-top:6px;">
                            {{locationLabel}}
                          </td>
                          <td style="font-size:12px;color:#B9C7DD;padding-top:8px;" align="right">
                            {{eventTime}}
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-top:10px;font-size:12px;color:#9FB2D0;line-height:1.6;">
                            Notes: <span style="color:#B9C7DD;">{{eventNotes}}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                ${trackingProgressBoxHtml()}

                <div style="margin-top:18px;">
                  <a href="{{trackingUrl}}" style="display:inline-block;background:#2E6BFF;color:#ffffff;text-decoration:none;
                    padding:12px 14px;border-radius:12px;font-weight:800;font-size:14px;">
                    View live tracking
                  </a>
                  <span style="display:inline-block;margin-left:10px;font-size:12px;color:#9FB2D0;">
                    Reference: <span style="color:#B9C7DD;">{{referenceNumber}}</span>
                  </span>
                </div>

                <p style="margin:18px 0 0;color:#9FB2D0;font-size:12px;line-height:1.6;">
                  If you didn’t request or expect this update, contact <span style="color:#B9C7DD;">{{supportEmail}}</span>.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 12px 0;color:#6F86A8;font-size:12px;line-height:1.6;">
                <div style="border-top:1px solid #16223A;padding-top:12px;">
                  © {{year}} {{brandName}} • {{brandAddress}}
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const deliveredHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>Delivered</title>
  </head>
  <body style="margin:0;padding:0;background:#050814;color:#E7EEF9;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050814;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:92vw;">
            <tr>
              <td style="padding:8px 12px 16px;">
                <table role="presentation" width="100%">
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:10px;">
                        <img src="{{brandLogoUrl}}" alt="{{brandName}}" width="28" height="28"
                          style="display:inline-block;border-radius:8px;border:1px solid #1B2A44;background:#0B1226;">
                        <span style="font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#9FB2D0;">{{brandName}}</span>
                      </div>
                    </td>
                    <td align="right" style="font-size:12px;color:#9FB2D0;">{{supportEmail}}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#0B1226;border:1px solid #16223A;border-radius:16px;padding:22px;">
                <div style="font-size:12px;color:#9FB2D0;text-transform:uppercase;letter-spacing:.12em;">
                  Delivery completed
                </div>
                <h1 style="margin:10px 0 6px;font-size:22px;line-height:1.25;">
                  Delivered ✅
                </h1>
                <p style="margin:0 0 16px;color:#B9C7DD;font-size:14px;line-height:1.6;">
                  Hello {{customerName}}, your shipment <strong style="color:#E7EEF9;">{{referenceNumber}}</strong> has been marked as delivered.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:12px;border:1px solid #16223A;border-radius:14px;background:#070E20;">
                      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                        <div>
                          <div style="font-size:12px;color:#9FB2D0;">Delivered to</div>
                          <div style="font-size:14px;color:#E7EEF9;font-weight:800;margin-top:6px;">
                            {{destinationAddress}}
                          </div>
                        </div>
                        <div style="text-align:right;">
                          <div style="font-size:12px;color:#9FB2D0;">Delivered at</div>
                          <div style="font-size:14px;color:#E7EEF9;font-weight:800;margin-top:6px;">
                            {{deliveredAt}}
                          </div>
                        </div>
                      </div>
                      <div style="margin-top:10px;font-size:12px;color:#9FB2D0;line-height:1.6;">
                        Notes: <span style="color:#B9C7DD;">{{eventNotes}}</span>
                      </div>
                    </td>
                  </tr>
                </table>

                ${trackingProgressBoxHtml()}

                <div style="margin-top:18px;">
                  <a href="{{trackingUrl}}" style="display:inline-block;background:#2E6BFF;color:#ffffff;text-decoration:none;
                    padding:12px 14px;border-radius:12px;font-weight:800;font-size:14px;">
                    View delivery record
                  </a>
                </div>

                <p style="margin:18px 0 0;color:#9FB2D0;font-size:12px;line-height:1.6;">
                  If delivery is disputed, contact <span style="color:#B9C7DD;">{{supportEmail}}</span> immediately.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 12px 0;color:#6F86A8;font-size:12px;line-height:1.6;">
                <div style="border-top:1px solid #16223A;padding-top:12px;">
                  © {{year}} {{brandName}} • {{brandAddress}}
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const createdText = `{{brandName}} — Shipment Created

Hello {{customerName}},
Your shipment is now active.

Tracking reference: {{referenceNumber}}
Origin: {{originAddress}}
Destination: {{destinationAddress}}
Status: {{statusLabel}}
ETA: {{estimatedDelivery}}

Track shipment: {{trackingUrl}}

Support: {{supportEmail}}
© {{year}} {{brandName}} • {{brandAddress}}`;

const updateText = `{{brandName}} — Shipment Update

Hello {{customerName}},
Your shipment {{referenceNumber}} status changed to: {{statusLabel}}

Last update: {{locationLabel}}
Time: {{eventTime}}
Notes: {{eventNotes}}

View tracking: {{trackingUrl}}

Support: {{supportEmail}}
© {{year}} {{brandName}} • {{brandAddress}}`;

const deliveredText = `{{brandName}} — Delivered

Hello {{customerName}},
Your shipment {{referenceNumber}} has been delivered.

Delivered to: {{destinationAddress}}
Delivered at: {{deliveredAt}}
Notes: {{eventNotes}}

View record: {{trackingUrl}}

Support: {{supportEmail}}
© {{year}} {{brandName}} • {{brandAddress}}`;

function buildTemplates(input: BaseEmailInput, kind: 'created' | 'update' | 'delivered') {
  const tokens = getTokens(input);
  const htmlByKind = {
    created: createdHtml,
    update: updateHtml,
    delivered: deliveredHtml,
  } as const;

  const textByKind = {
    created: createdText,
    update: updateText,
    delivered: deliveredText,
  } as const;

  return {
    html: replaceTokens(htmlByKind[kind], tokens),
    text: replaceTokens(textByKind[kind], tokens),
  };
}

async function sendWithTimeout(promise: Promise<unknown>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

function assertMailerEnv() {
  const nodeEnv = serverEnv.NODE_ENV || process.env.NODE_ENV || 'development';
  const hasGmail = !!(serverEnv.GMAIL_USER && serverEnv.GMAIL_APP_PASSWORD);
  const hasSmtp = !!(serverEnv.SMTP_HOST && serverEnv.SMTP_USER && serverEnv.SMTP_PASS);
  if (hasGmail || hasSmtp) return;
  if (nodeEnv === 'production') {
    throw new Error('Email credentials are required in production');
  }
}

function getTransporter() {
  assertMailerEnv();
  const hasSmtp = !!(serverEnv.SMTP_HOST && serverEnv.SMTP_USER && serverEnv.SMTP_PASS);
  if (hasSmtp) {
    const port = Number(serverEnv.SMTP_PORT || '465');
    const secure = Number.isFinite(port) ? port === 465 : true;
    return nodemailer.createTransport({
      host: serverEnv.SMTP_HOST,
      port: Number.isFinite(port) ? port : 465,
      secure,
      auth: {
        user: serverEnv.SMTP_USER,
        pass: serverEnv.SMTP_PASS,
      },
    });
  }

  if (!serverEnv.GMAIL_USER || !serverEnv.GMAIL_APP_PASSWORD) return null;

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: serverEnv.GMAIL_USER,
      pass: serverEnv.GMAIL_APP_PASSWORD,
    },
  });
}

export async function sendShipmentCreatedEmail(input: BaseEmailInput) {
  if (!input.to) {
    console.warn('sendShipmentCreatedEmail: missing recipient');
    return { skipped: true as const };
  }

  const transporter = getTransporter();
  if (!transporter) return { skipped: true as const };

  const { html, text } = buildTemplates(input, 'created');

  await sendWithTimeout(
    transporter.sendMail({
      from: serverEnv.EMAIL_FROM || serverEnv.SMTP_USER || serverEnv.GMAIL_USER,
      to: input.to,
      subject: `Shipment created — ${input.referenceNumber}`,
      html,
      text,
    }),
    1500,
  );

  return { skipped: false as const };
}

export async function sendShipmentStatusUpdatedEmail(input: BaseEmailInput) {
  if (!input.to) {
    console.warn('sendShipmentStatusUpdatedEmail: missing recipient');
    return { skipped: true as const };
  }

  const transporter = getTransporter();
  if (!transporter) return { skipped: true as const };

  const isDelivered = (input.statusLabel || '').toLowerCase().includes('delivered');
  const { html, text } = buildTemplates(input, isDelivered ? 'delivered' : 'update');

  await sendWithTimeout(
    transporter.sendMail({
      from: serverEnv.EMAIL_FROM || serverEnv.SMTP_USER || serverEnv.GMAIL_USER,
      to: input.to,
      subject: `Shipment update: ${input.statusLabel || 'Update'} — ${input.referenceNumber}`,
      html,
      text,
    }),
    1500,
  );

  return { skipped: false as const };
}
