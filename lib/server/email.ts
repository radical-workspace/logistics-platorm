import 'server-only';

import { sendShipmentStatusUpdatedEmail } from '@/lib/server/mailer';

type LegacyShipmentUpdateEmailInput = {
  to: string;
  companyName?: string;
  referenceNumber: string;
  status: string;
  updateTitle?: string;
  updateBody?: string | null;
  trackingUrl?: string;
};

export async function sendShipmentUpdateEmail(input: LegacyShipmentUpdateEmailInput) {
  return sendShipmentStatusUpdatedEmail({
    to: input.to,
    referenceNumber: input.referenceNumber,
    statusLabel: input.status,
    locationLabel: input.updateTitle || 'Shipment update',
    eventNotes: input.updateBody || undefined,
    eventTime: new Date().toISOString(),
  });
}
