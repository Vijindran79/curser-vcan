## Shipment Documents Research

### Parcel (Shippo, DHL, FedEx)
- Required documents
  - Shipping Label (auto-generated)
  - Receipt/Invoice (auto-generated from payment)
  - Commercial Invoice (international; can be auto-generated from item data)
  - CN22/CN23 (postal flows where applicable)
- Key fields
  - Sender/Recipient full name, phone, email
  - Full addresses (street, city, region, postal code, country)
  - Contents: description, quantity, unit value, total value, HS codes (if available), country of origin
  - Weight, dimensions, packaging type
- Flow
  - Create shipment → purchase label → render/print label → email label + receipt
  - Track via carrier API/webhooks
- Email templates
  - Booking confirmation, label ready, shipped, out for delivery, delivered, exception

### Sea Freight (Freightos, Flexport)
- Required documents (baseline)
  - Commercial Invoice (auto)
  - Packing List (auto)
  - Certificate of Origin (upload/issuer provided)
  - Fumigation Certificate (optional, upload)
  - Free Sale Certificate (optional, upload)
  - Inspection Certificate (optional, upload)
  - Bill of Lading (generated post-departure; can be draft auto + final from carrier/forwarder)
- Key fields
  - Incoterms (FOB/CIF/CFR/DAP/DDP), insurance selection and value
  - Ports (POL/POD), pickup/delivery addresses, customs clearance requirement
  - Cargo: HS codes, commodity, weight (kg), volume (CBM), packages
  - Container details (FCL): 20GP/40GP/40HC, count, ready date
- Flow
  - Quote → Booking → Shipping Instructions → B/L draft → Departure → Final B/L → Pre-Alert → Arrival Notice → Release (O-B/L/Telex)
- Emails
  - Booking confirmation, SI requested, Pre-Alert, Arrival Notice, Documents ready

### Air Freight
- Required documents
  - Commercial Invoice (auto)
  - Packing List (auto)
  - Air Waybill (carrier issued; draft can be produced)
- Key fields
  - Dimensional weight, chargeable weight, pieces
  - Origin/Destination airports, pickup/delivery

### Document upload/print/email patterns
- Upload to cloud storage with metadata in DB
- Render label/CI/PL PDFs on-demand; provide download/print buttons
- Email with attachment or signed URL (24h) if >10MB

## Form Field Requirements
- See SeaFreightForm.tsx for exact UI fields

## Print/Download Flow
- View opens modal/lightbox or new tab (for PDF/image)
- Download direct link to storage
- Print opens a new window with print-optimized HTML/CSS or PDF

## Email Templates
- booking-confirmation
- label-ready
- shipped
- out-for-delivery
- delivered
- document-ready

Each includes shipment summary, customer greeting, and clear CTAs (track, download docs).*** End Patch ***!

