/**
 * Insert a styled inline compliance summary into a DOM element identified by `targetId`.
 *
 * The summary displays the origin country, destination country, item (commodity),
 * and a short list of compliance recommendations.
 *
 * @param targetId - The id of the DOM element to populate; no action if the element is not found
 * @param originCountry - Origin country name to display in the summary
 * @param destinationCountry - Destination country name to display in the summary
 * @param commodity - Commodity/item name to display in the summary
 */
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
