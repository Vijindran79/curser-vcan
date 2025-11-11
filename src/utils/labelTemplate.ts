import type { Quote } from '../state';

export function generateLabelHTML(shipment: {
  trackingId: string;
  sender: { name: string; address: string };
  recipient: { name: string; address: string };
  weightKg: number;
  pieces: number;
  carrier?: string;
  service?: string;
}) {
  const css = `
  <style>
    @media print {
      @page { size: 4in 6in; margin: 0; }
      body { margin: 0; }
    }
    body { font-family: Arial, sans-serif; width: 4in; height: 6in; padding: 12px; box-sizing: border-box; }
    .row { margin-bottom: 8px; }
    .bar { height: 56px; background: #000; margin: 12px 0; }
    .qr { width: 96px; height: 96px; background: #eee; float: right; }
    .box { border: 1px solid #000; padding: 8px; margin-bottom: 8px; }
    .big { font-size: 22px; font-weight: bold; }
    .small { font-size: 12px; color: #444; }
  </style>
  `;
  const html = `
  <!DOCTYPE html><html><head><meta charset="utf-8">${css}</head><body>
    <div class="row big">${shipment.carrier || 'Carrier'} - ${shipment.service || 'Standard'}</div>
    <div class="row box">
      <div class="small">FROM</div>
      <div>${shipment.sender.name}</div>
      <div class="small">${shipment.sender.address}</div>
    </div>
    <div class="row box">
      <div class="small">TO</div>
      <div>${shipment.recipient.name}</div>
      <div class="small">${shipment.recipient.address}</div>
    </div>
    <div class="row">
      <div class="big">TRACKING: ${shipment.trackingId}</div>
      <div class="qr"></div>
    </div>
    <div class="row">Weight: ${shipment.weightKg} kg • Pieces: ${shipment.pieces}</div>
    <div class="bar"></div>
    <div class="small">vcanship.com • Printed ${new Date().toLocaleString()}</div>
  </body></html>`;
  return html;
}

