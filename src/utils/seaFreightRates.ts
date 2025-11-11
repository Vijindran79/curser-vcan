export type SeaFreightInputs = {
  shipmentType: 'FCL' | 'LCL' | 'Break Bulk';
  containerType?: '20GP' | '40GP' | '40HC';
  containers?: number;
  weightKg: number;
  volumeCbm: number;
  incoterms: 'FOB' | 'CIF' | 'CFR' | 'DAP' | 'DDP';
  insurance?: boolean;
  cargoValue?: number;
};

export type QuoteBreakdown = {
  oceanFreight: number;
  originCharges: number;
  destinationCharges: number;
  surcharges: number;
  insurance: number;
  documentation: number;
  total: number;
};

/**
 * Estimates a sea freight quote breakdown from the provided shipment inputs.
 *
 * Computes ocean freight (per-container rates for FCL or volume/weight-based for LCL/Break Bulk), origin and destination charges, surcharges (12% of ocean freight), insurance (if requested, minimum 15), a fixed documentation fee, and a rounded total.
 *
 * @param inputs - Shipment parameters (shipmentType, containerType, containers, weightKg, volumeCbm, incoterms, insurance, cargoValue)
 * @returns A QuoteBreakdown with fields:
 *  - oceanFreight: calculated ocean freight charge
 *  - originCharges: origin handling/processing charges
 *  - destinationCharges: destination handling/processing charges
 *  - surcharges: aggregated surcharges (e.g., BAF/CAF/peak)
 *  - insurance: insurance charge (0 if not requested)
 *  - documentation: documentation fee
 *  - total: rounded sum of all components
 */
export function estimateSeaFreight(inputs: SeaFreightInputs): QuoteBreakdown {
  // Stubbed logic with simple assumptions
  const oceanFreight =
    inputs.shipmentType === 'FCL'
      ? (inputs.containerType === '40HC' ? 2300 : inputs.containerType === '40GP' ? 2100 : 1600) *
        Math.max(1, inputs.containers || 1)
      : Math.max(300, 80 * inputs.volumeCbm + 0.1 * inputs.weightKg);

  const originCharges = inputs.shipmentType === 'FCL' ? 350 : 120;
  const destinationCharges = inputs.shipmentType === 'FCL' ? 400 : 150;
  const surcharges = Math.round(oceanFreight * 0.12); // BAF/CAF/peak
  const insurance =
    inputs.insurance && inputs.cargoValue
      ? Math.max(15, Math.round(inputs.cargoValue * 0.005))
      : 0;
  const documentation = 45;

  const total =
    Math.round(
      oceanFreight + originCharges + destinationCharges + surcharges + insurance + documentation
    );

  return { oceanFreight, originCharges, destinationCharges, surcharges, insurance, documentation, total };
}
