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

