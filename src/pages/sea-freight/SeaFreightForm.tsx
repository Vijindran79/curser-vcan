import React, { useState } from 'react';

export const SeaFreightForm: React.FC = () => {
  const [form, setForm] = useState<any>({
    shipmentType: 'FCL',
    containerType: '20GP',
    containers: 1,
    readyDate: '',
    hsCode: '',
    commodity: '',
    weightKg: '',
    volumeCbm: '',
    packages: '',
    pol: '',
    supplierAddress: '',
    pickupRequired: false,
    pod: '',
    deliveryAddress: '',
    customsRequired: false,
    doorDelivery: false,
    incoterms: 'FOB',
    insurance: false,
    cargoValue: ''
  });

  const update = (k: string, v: any) => setForm((s: any) => ({ ...s, [k]: v }));

  return (
    <div className="card" style={{ padding: 16 }}>
      <h2>Sea Freight Quote</h2>

      <div className="form-section">
        <label>Shipment Type</label>
        <select value={form.shipmentType} onChange={e => update('shipmentType', e.target.value)}>
          <option>FCL</option>
          <option>LCL</option>
          <option>Break Bulk</option>
        </select>
      </div>

      {form.shipmentType === 'FCL' && (
        <div className="grid-2">
          <div>
            <label>Container Type</label>
            <select value={form.containerType} onChange={e => update('containerType', e.target.value)}>
              <option>20GP</option>
              <option>40GP</option>
              <option>40HC</option>
            </select>
          </div>
          <div>
            <label>Number of Containers</label>
            <input type="number" min={1} value={form.containers} onChange={e => update('containers', Number(e.target.value))} />
          </div>
          <div>
            <label>Cargo Ready Date</label>
            <input type="date" value={form.readyDate} onChange={e => update('readyDate', e.target.value)} />
          </div>
        </div>
      )}

      <h3>Cargo Details</h3>
      <div className="grid-2">
        <div>
          <label>HS Code</label>
          <input value={form.hsCode} onChange={e => update('hsCode', e.target.value)} placeholder="e.g., 8517.12" />
        </div>
        <div>
          <label>Commodity Description</label>
          <input value={form.commodity} onChange={e => update('commodity', e.target.value)} placeholder="Describe the goods" />
        </div>
        <div>
          <label>Total Weight (kg)</label>
          <input type="number" value={form.weightKg} onChange={e => update('weightKg', e.target.value)} />
        </div>
        <div>
          <label>Total Volume (CBM)</label>
          <input type="number" value={form.volumeCbm} onChange={e => update('volumeCbm', e.target.value)} />
        </div>
        <div>
          <label>Number of Packages</label>
          <input type="number" value={form.packages} onChange={e => update('packages', e.target.value)} />
        </div>
      </div>

      <h3>Origin</h3>
      <div className="grid-2">
        <div>
          <label>Port of Loading (POL)</label>
          <input value={form.pol} onChange={e => update('pol', e.target.value)} placeholder="e.g., Shanghai (CNSHA)" />
        </div>
        <div>
          <label>Supplier Address</label>
          <input value={form.supplierAddress} onChange={e => update('supplierAddress', e.target.value)} />
        </div>
        <div>
          <label>
            <input type="checkbox" checked={form.pickupRequired} onChange={e => update('pickupRequired', e.target.checked)} /> Cargo pickup required?
          </label>
        </div>
      </div>

      <h3>Destination</h3>
      <div className="grid-2">
        <div>
          <label>Port of Discharge (POD)</label>
          <input value={form.pod} onChange={e => update('pod', e.target.value)} placeholder="e.g., Los Angeles (USLAX)" />
        </div>
        <div>
          <label>Delivery Address</label>
          <input value={form.deliveryAddress} onChange={e => update('deliveryAddress', e.target.value)} />
        </div>
        <div>
          <label>
            <input type="checkbox" checked={form.customsRequired} onChange={e => update('customsRequired', e.target.checked)} /> Customs clearance required?
          </label>
        </div>
        <div>
          <label>
            <input type="checkbox" checked={form.doorDelivery} onChange={e => update('doorDelivery', e.target.checked)} /> Door delivery required?
          </label>
        </div>
      </div>

      <h3>Documentation & Terms</h3>
      <div className="grid-2">
        <div>
          <label>Incoterms</label>
          <select value={form.incoterms} onChange={e => update('incoterms', e.target.value)}>
            <option>FOB</option>
            <option>CIF</option>
            <option>CFR</option>
            <option>DAP</option>
            <option>DDP</option>
          </select>
        </div>
        <div>
          <label>
            <input type="checkbox" checked={form.insurance} onChange={e => update('insurance', e.target.checked)} /> Insurance
          </label>
        </div>
        {form.insurance && (
          <div>
            <label>Cargo Value (USD)</label>
            <input type="number" value={form.cargoValue} onChange={e => update('cargoValue', e.target.value)} placeholder="Declared value" />
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="main-submit-btn">Get Quote</button>
      </div>
    </div>
  );
};

export default SeaFreightForm;

