export function showInlineComplianceSummary(
  targetId: string,
  originCountry: string,
  destinationCountry: string,
  commodity: string
) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;background:#fafafa">
      <strong>Compliance summary</strong>
      <div style="font-size:12px;color:#6b7280;margin-top:6px">
        Origin: ${originCountry} • Destination: ${destinationCountry} • Item: ${commodity}
      </div>
      <ul style="margin:8px 0 0 16px;font-size:13px;color:#374151">
        <li>Commercial Invoice recommended</li>
        <li>Packing List recommended</li>
        <li>Check restricted/prohibited items</li>
      </ul>
    </div>
  `;
}

