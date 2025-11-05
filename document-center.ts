/**
 * Document Center - Sample PDFs, Templates & Compliance Guides
 * 
 * Provides users with essential shipping documents, templates, and guides
 * Helps users prepare proper documentation for customs clearance
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State } from './state';
import { showToast, toggleLoading } from './ui';

export interface DocumentTemplate {
    id: string;
    name: string;
    description: string;
    category: 'invoice' | 'packing' | 'certificate' | 'customs' | 'compliance' | 'guide';
    icon: string;
    required: boolean;
    downloadable: boolean;
}

const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
    // INVOICES
    {
        id: 'commercial-invoice',
        name: 'Commercial Invoice',
        description: 'Required for all international shipments. Includes item descriptions, values, HS codes, and buyer/seller information.',
        category: 'invoice',
        icon: 'fa-file-invoice-dollar',
        required: true,
        downloadable: true
    },
    {
        id: 'proforma-invoice',
        name: 'Proforma Invoice',
        description: 'Preliminary bill of sale for customs purposes. Used when actual invoice is not available.',
        category: 'invoice',
        icon: 'fa-file-invoice',
        required: false,
        downloadable: true
    },
    
    // PACKING DOCUMENTS
    {
        id: 'packing-list',
        name: 'Packing List',
        description: 'Detailed list of all packages with weights, dimensions, and contents. Essential for customs inspection.',
        category: 'packing',
        icon: 'fa-boxes-packing',
        required: true,
        downloadable: true
    },
    {
        id: 'cargo-manifest',
        name: 'Cargo Manifest',
        description: 'Complete list of all cargo on the vessel or aircraft. Required for customs clearance.',
        category: 'packing',
        icon: 'fa-clipboard-list',
        required: true,
        downloadable: true
    },
    
    // CERTIFICATES
    {
        id: 'certificate-origin',
        name: 'Certificate of Origin',
        description: 'Certifies the country where goods were manufactured. Required for preferential tariff treatment.',
        category: 'certificate',
        icon: 'fa-certificate',
        required: false,
        downloadable: true
    },
    {
        id: 'certificate-inspection',
        name: 'Inspection Certificate',
        description: 'Certifies that goods have been inspected and meet quality standards.',
        category: 'certificate',
        icon: 'fa-clipboard-check',
        required: false,
        downloadable: true
    },
    {
        id: 'certificate-insurance',
        name: 'Insurance Certificate',
        description: 'Proof of cargo insurance coverage. Required for CIF/CIP shipments.',
        category: 'certificate',
        icon: 'fa-shield-halved',
        required: false,
        downloadable: true
    },
    
    // CUSTOMS DOCUMENTS
    {
        id: 'bill-of-lading',
        name: 'Bill of Lading (BOL)',
        description: 'Contract between shipper and carrier. Serves as receipt and title document.',
        category: 'customs',
        icon: 'fa-ship',
        required: true,
        downloadable: true
    },
    {
        id: 'customs-declaration',
        name: 'Customs Declaration Form',
        description: 'Official form declaring goods for import/export. Required by all countries.',
        category: 'customs',
        icon: 'fa-file-circle-check',
        required: true,
        downloadable: true
    },
    {
        id: 'export-license',
        name: 'Export License',
        description: 'Permission to export controlled goods. Check if your cargo requires this.',
        category: 'customs',
        icon: 'fa-stamp',
        required: false,
        downloadable: true
    },
    
    // COMPLIANCE GUIDES
    {
        id: 'guide-hs-codes',
        name: 'HS Code Classification Guide',
        description: 'Learn how to classify your goods using Harmonized System codes.',
        category: 'compliance',
        icon: 'fa-book',
        required: false,
        downloadable: true
    },
    {
        id: 'guide-incoterms',
        name: 'Incoterms 2020 Guide',
        description: 'Understand international trade terms (FOB, CIF, DDP, etc.) and responsibilities.',
        category: 'compliance',
        icon: 'fa-handshake',
        required: false,
        downloadable: true
    },
    {
        id: 'guide-customs',
        name: 'Customs Clearance Handbook',
        description: 'Step-by-step guide to customs procedures, duties, and common issues.',
        category: 'compliance',
        icon: 'fa-book-open',
        required: false,
        downloadable: true
    },
    {
        id: 'guide-prohibited',
        name: 'Prohibited & Restricted Items',
        description: 'Complete list of items that cannot be shipped or require special permits.',
        category: 'compliance',
        icon: 'fa-ban',
        required: false,
        downloadable: true
    }
];

/**
 * Show Document Center Modal
 */
export function showDocumentCenter() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'document-center-modal';
    
    const categories = [
        { id: 'invoice', name: 'Invoices', icon: 'fa-file-invoice', color: '#3b82f6' },
        { id: 'packing', name: 'Packing Documents', icon: 'fa-boxes-packing', color: '#8b5cf6' },
        { id: 'certificate', name: 'Certificates', icon: 'fa-certificate', color: '#10b981' },
        { id: 'customs', name: 'Customs Documents', icon: 'fa-landmark', color: '#f59e0b' },
        { id: 'compliance', name: 'Compliance Guides', icon: 'fa-book-open-reader', color: '#ef4444' }
    ];
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1000px; max-height: 90vh; overflow-y: auto;">
            <button class="close-btn" id="close-doc-center">×</button>
            
            <!-- Header -->
            <div style="text-align: center; padding-bottom: 1.5rem; border-bottom: 2px solid var(--border-color);">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: white;"></i>
                </div>
                <h2 style="margin: 0 0 0.5rem; color: var(--text-color);">Document Center</h2>
                <p style="color: var(--medium-gray); margin: 0; font-size: 0.9375rem;">
                    Download templates, samples, and guides for international shipping
                </p>
            </div>

            <!-- Category Tabs -->
            <div style="display: flex; gap: 0.5rem; margin: 1.5rem 0; overflow-x: auto; padding-bottom: 0.5rem;">
                ${categories.map((cat, index) => `
                    <button class="doc-category-tab ${index === 0 ? 'active' : ''}" data-category="${cat.id}" style="padding: 0.75rem 1.25rem; background: ${index === 0 ? cat.color : 'var(--light-gray)'}; color: ${index === 0 ? 'white' : 'var(--text-color)'}; border: none; border-radius: 8px; cursor: pointer; white-space: nowrap; font-weight: 500; transition: all 0.3s; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid ${cat.icon}"></i>
                        ${cat.name}
                    </button>
                `).join('')}
            </div>

            <!-- Documents Grid -->
            <div id="documents-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <!-- Documents will be rendered here -->
            </div>

            <!-- Upload Section -->
            <div style="margin-top: 2rem; padding: 1.5rem; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px dashed #0ea5e9; border-radius: 12px;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <i class="fa-solid fa-cloud-arrow-up" style="font-size: 2.5rem; color: #0284c7;"></i>
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 0.5rem; color: #0c4a6e;">Upload Your Documents</h3>
                        <p style="margin: 0; color: #075985; font-size: 0.875rem;">
                            Upload your shipping documents for secure storage and easy access
                        </p>
                    </div>
                    <button id="upload-doc-btn" style="padding: 0.75rem 1.5rem; background: #0ea5e9; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; white-space: nowrap;">
                        <i class="fa-solid fa-upload"></i> Upload Files
                    </button>
                </div>
                <input type="file" id="doc-file-input" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display: none;">
            </div>

            <!-- Help Text -->
            <div style="margin-top: 1.5rem; padding: 1rem; background: #f3f4f6; border-radius: 8px; font-size: 0.8125rem; color: #6b7280; text-align: center;">
                <i class="fa-solid fa-info-circle"></i> These templates are for reference only. Consult with customs authorities or a licensed broker for specific requirements.
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Render initial category
    renderDocumentCategory('invoice');
    
    // Close button
    document.getElementById('close-doc-center')?.addEventListener('click', () => {
        modal.remove();
    });
    
    // Category tabs
    const tabs = modal.querySelectorAll('.doc-category-tab');
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            const category = (tab as HTMLElement).dataset.category as string;
            const color = categories.find(c => c.id === category)?.color || '#667eea';
            
            // Update active state
            tabs.forEach(t => {
                t.style.background = 'var(--light-gray)';
                t.style.color = 'var(--text-color)';
            });
            (tab as HTMLElement).style.background = color;
            (tab as HTMLElement).style.color = 'white';
            
            // Render documents
            renderDocumentCategory(category);
        });
    });
    
    // Upload button
    const uploadBtn = document.getElementById('upload-doc-btn');
    const fileInput = document.getElementById('doc-file-input') as HTMLInputElement;
    
    uploadBtn?.addEventListener('click', () => {
        fileInput?.click();
    });
    
    fileInput?.addEventListener('change', (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
            handleFileUpload(Array.from(files));
        }
    });
}

/**
 * Render documents for a category
 */
function renderDocumentCategory(category: string) {
    const grid = document.getElementById('documents-grid');
    if (!grid) return;
    
    const docs = DOCUMENT_TEMPLATES.filter(d => d.category === category);
    
    grid.innerHTML = docs.map(doc => `
        <div class="document-card" style="padding: 1.5rem; background: var(--light-gray); border-radius: 12px; border: 2px solid var(--border-color); transition: all 0.3s; cursor: pointer;" onmouseover="this.style.borderColor='var(--primary-orange)'; this.style.transform='translateY(-4px)'" onmouseout="this.style.borderColor='var(--border-color)'; this.style.transform='translateY(0)'">
            <div style="display: flex; align-items: start; gap: 1rem; margin-bottom: 1rem;">
                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, var(--primary-orange) 0%, #fb923c 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fa-solid ${doc.icon}" style="font-size: 1.5rem; color: white;"></i>
                </div>
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 0.25rem; color: var(--text-color); font-size: 1rem;">
                        ${doc.name}
                        ${doc.required ? '<span style="color: #ef4444; font-size: 0.75rem; font-weight: 600; margin-left: 0.5rem;">REQUIRED</span>' : ''}
                    </h4>
                    <p style="margin: 0; color: var(--medium-gray); font-size: 0.8125rem; line-height: 1.5;">
                        ${doc.description}
                    </p>
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                ${doc.downloadable ? `
                    <button class="download-doc-btn" data-doc-id="${doc.id}" style="flex: 1; padding: 0.625rem; background: var(--primary-orange); color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 0.875rem;">
                        <i class="fa-solid fa-download"></i> Download
                    </button>
                ` : ''}
                <button class="preview-doc-btn" data-doc-id="${doc.id}" style="flex: 1; padding: 0.625rem; background: transparent; color: var(--text-color); border: 2px solid var(--border-color); border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 0.875rem;">
                    <i class="fa-solid fa-eye"></i> Preview
                </button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners
    grid.querySelectorAll('.download-doc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const docId = (e.currentTarget as HTMLElement).dataset.docId;
            if (docId) downloadDocument(docId);
        });
    });
    
    grid.querySelectorAll('.preview-doc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const docId = (e.currentTarget as HTMLElement).dataset.docId;
            if (docId) previewDocument(docId);
        });
    });
}

/**
 * Download document template
 */
function downloadDocument(docId: string) {
    const doc = DOCUMENT_TEMPLATES.find(d => d.id === docId);
    if (!doc) return;
    
    toggleLoading(true, `Generating ${doc.name}...`);
    
    setTimeout(() => {
        const pdf = new jsPDF();
        
        // Generate PDF based on document type
        switch (docId) {
            case 'commercial-invoice':
                generateCommercialInvoice(pdf);
                break;
            case 'packing-list':
                generatePackingList(pdf);
                break;
            case 'certificate-origin':
                generateCertificateOfOrigin(pdf);
                break;
            case 'bill-of-lading':
                generateBillOfLading(pdf);
                break;
            case 'customs-declaration':
                generateCustomsDeclaration(pdf);
                break;
            default:
                generateGenericTemplate(pdf, doc);
        }
        
        pdf.save(`${docId}-template.pdf`);
        toggleLoading(false);
        showToast(`${doc.name} downloaded successfully`, 'success');
    }, 500);
}

/**
 * Preview document
 */
function previewDocument(docId: string) {
    const doc = DOCUMENT_TEMPLATES.find(d => d.id === docId);
    if (!doc) return;
    
    showToast(`Opening ${doc.name} preview...`, 'info');
    
    // For now, just download it
    // In production, you'd show a preview modal with the PDF embedded
    downloadDocument(docId);
}

/**
 * Generate Commercial Invoice PDF
 */
function generateCommercialInvoice(pdf: jsPDF) {
    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('COMMERCIAL INVOICE', 105, 20, { align: 'center' });
    
    // Company info
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Your Company Name', 20, 35);
    pdf.text('123 Business Street', 20, 40);
    pdf.text('City, Country', 20, 45);
    pdf.text('Phone: +1 234 567 8900', 20, 50);
    
    // Invoice details
    pdf.text('Invoice No: INV-2024-001', 140, 35);
    pdf.text('Date: ' + new Date().toLocaleDateString(), 140, 40);
    pdf.text('Terms: Net 30', 140, 45);
    
    // Buyer info
    pdf.setFont('helvetica', 'bold');
    pdf.text('BUYER:', 20, 60);
    pdf.setFont('helvetica', 'normal');
    pdf.text('[Buyer Company Name]', 20, 65);
    pdf.text('[Buyer Address]', 20, 70);
    pdf.text('[City, Country]', 20, 75);
    
    // Consignee info
    pdf.setFont('helvetica', 'bold');
    pdf.text('CONSIGNEE:', 110, 60);
    pdf.setFont('helvetica', 'normal');
    pdf.text('[Same as buyer or different]', 110, 65);
    
    // Items table
    autoTable(pdf, {
        startY: 85,
        head: [['Item Description', 'HS Code', 'Quantity', 'Unit Price', 'Total']],
        body: [
            ['Sample Product 1', '1234.56.78', '100 pcs', '$10.00', '$1,000.00'],
            ['Sample Product 2', '9876.54.32', '50 pcs', '$25.00', '$1,250.00'],
            ['[Add more items]', '', '', '', '']
        ],
        foot: [
            ['', '', '', 'Subtotal:', '$2,250.00'],
            ['', '', '', 'Shipping:', '$150.00'],
            ['', '', '', 'Insurance:', '$50.00'],
            ['', '', '', 'TOTAL:', '$2,450.00']
        ]
    });
    
    // Footer
    const finalY = (pdf as any).lastAutoTable.finalY + 10;
    pdf.setFontSize(9);
    pdf.text('Declaration: I declare that this invoice shows the actual price of the goods described.', 20, finalY);
    pdf.text('Signature: ___________________  Date: ___________________', 20, finalY + 15);
}

/**
 * Generate Packing List PDF
 */
function generatePackingList(pdf: jsPDF) {
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PACKING LIST', 105, 20, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Shipper: Your Company Name', 20, 35);
    pdf.text('Consignee: [Buyer Name]', 20, 40);
    pdf.text('Invoice No: INV-2024-001', 20, 45);
    pdf.text('Date: ' + new Date().toLocaleDateString(), 140, 35);
    
    autoTable(pdf, {
        startY: 55,
        head: [['Package No.', 'Description', 'Quantity', 'Weight (kg)', 'Dimensions (cm)', 'Volume (m³)']],
        body: [
            ['1', 'Carton - Product A', '50 pcs', '25.5', '40 x 30 x 20', '0.024'],
            ['2', 'Carton - Product B', '30 pcs', '18.2', '35 x 25 x 15', '0.013'],
            ['3', 'Pallet - Mixed', '120 pcs', '156.8', '120 x 100 x 80', '0.960'],
            ['[...]', '[Add more packages]', '', '', '', '']
        ],
        foot: [['TOTAL:', '', '200 pcs', '200.5 kg', '', '0.997 m³']]
    });
    
    const finalY = (pdf as any).lastAutoTable.finalY + 10;
    pdf.setFontSize(9);
    pdf.text('All goods are properly packed and marked for international shipment.', 20, finalY);
}

/**
 * Generate Certificate of Origin PDF
 */
function generateCertificateOfOrigin(pdf: jsPDF) {
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CERTIFICATE OF ORIGIN', 105, 20, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    pdf.text('Exporter: ___________________________________', 20, 40);
    pdf.text('Address: ____________________________________', 20, 50);
    pdf.text('Country: ____________________________________', 20, 60);
    
    pdf.text('Consignee: __________________________________', 20, 75);
    pdf.text('Address: ____________________________________', 20, 85);
    pdf.text('Country: ____________________________________', 20, 95);
    
    pdf.text('Port of Loading: _____________________________', 20, 110);
    pdf.text('Final Destination: ___________________________', 20, 120);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('GOODS DESCRIPTION:', 20, 135);
    pdf.setFont('helvetica', 'normal');
    pdf.rect(20, 140, 170, 40);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('ORIGIN DECLARATION:', 20, 190);
    pdf.setFont('helvetica', 'normal');
    pdf.text('The undersigned hereby certifies that the goods described above', 20, 200);
    pdf.text('originated in [COUNTRY NAME] and meet the origin criteria', 20, 207);
    pdf.text('required under the relevant trade agreement.', 20, 214);
    
    pdf.text('Signature: ___________________  Date: ___________________', 20, 240);
    pdf.text('Company Stamp:', 20, 250);
    pdf.rect(80, 245, 40, 30);
}

/**
 * Generate Bill of Lading PDF
 */
function generateBillOfLading(pdf: jsPDF) {
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BILL OF LADING', 105, 20, { align: 'center' });
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    pdf.text('B/L No: ___________________', 140, 30);
    pdf.text('Date: ' + new Date().toLocaleDateString(), 140, 35);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('SHIPPER:', 20, 45);
    pdf.setFont('helvetica', 'normal');
    pdf.rect(20, 48, 85, 25);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('CONSIGNEE:', 110, 45);
    pdf.setFont('helvetica', 'normal');
    pdf.rect(110, 48, 85, 25);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('NOTIFY PARTY:', 20, 80);
    pdf.setFont('helvetica', 'normal');
    pdf.rect(20, 83, 85, 20);
    
    pdf.text('Port of Loading: _____________________', 110, 85);
    pdf.text('Port of Discharge: ___________________', 110, 92);
    pdf.text('Final Destination: ___________________', 110, 99);
    
    autoTable(pdf, {
        startY: 110,
        head: [['Container No.', 'Seal No.', 'Marks & Numbers', 'No. of Packages', 'Description', 'Gross Weight']],
        body: [
            ['XXXX1234567', 'SEAL123', 'Order #12345', '10 Cartons', 'Electronics', '500 kg'],
            ['', '', '', '', '', '']
        ]
    });
    
    const finalY = (pdf as any).lastAutoTable.finalY + 10;
    pdf.setFontSize(8);
    pdf.text('Freight: Prepaid [ ] Collect [ ]', 20, finalY);
    pdf.text('Carrier: ______________________', 20, finalY + 7);
    pdf.text('Signature: ___________________', 20, finalY + 20);
}

/**
 * Generate Customs Declaration PDF
 */
function generateCustomsDeclaration(pdf: jsPDF) {
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CUSTOMS DECLARATION', 105, 20, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    pdf.text('Declaration No: ___________________', 20, 35);
    pdf.text('Date: ' + new Date().toLocaleDateString(), 140, 35);
    
    pdf.text('Importer/Exporter: __________________________________________', 20, 50);
    pdf.text('Address: ____________________________________________________', 20, 57);
    pdf.text('Tax ID: ______________________  Phone: _____________________', 20, 64);
    
    autoTable(pdf, {
        startY: 75,
        head: [['HS Code', 'Description', 'Origin', 'Quantity', 'Value', 'Duty Rate']],
        body: [
            ['1234.56', 'Product Description', 'Country', '100', '$1,000', '10%'],
            ['', '', '', '', '', '']
        ],
        foot: [['', '', '', '', 'Total Value:', '$1,000']]
    });
    
    const finalY = (pdf as any).lastAutoTable.finalY + 10;
    pdf.text('I declare that the information provided is true and accurate.', 20, finalY);
    pdf.text('Signature: ___________________  Date: ___________________', 20, finalY + 15);
}

/**
 * Generate generic template
 */
function generateGenericTemplate(pdf: jsPDF, doc: DocumentTemplate) {
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(doc.name.toUpperCase(), 105, 20, { align: 'center' });
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(doc.description, 105, 35, { align: 'center', maxWidth: 170 });
    
    pdf.setFontSize(10);
    pdf.text('This is a template document. Please fill in the required information.', 20, 60);
    
    pdf.text('[Add your content here]', 20, 80);
    
    pdf.setFontSize(8);
    pdf.text('Generated by Vcanship - ' + new Date().toLocaleDateString(), 105, 280, { align: 'center' });
}

/**
 * Handle file upload
 */
function handleFileUpload(files: File[]) {
    toggleLoading(true, `Uploading ${files.length} file(s)...`);
    
    // Simulate upload
    setTimeout(() => {
        toggleLoading(false);
        showToast(`Successfully uploaded ${files.length} document(s)`, 'success');
        
        // In production, you would:
        // 1. Upload to Firebase Storage
        // 2. Store metadata in Firestore
        // 3. Link to user account
        // 4. Show in "My Documents" section
    }, 1500);
}

/**
 * Show document center button in dashboard
 */
export function addDocumentCenterButton(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const button = document.createElement('button');
    button.className = 'document-center-btn';
    button.innerHTML = `
        <i class="fa-solid fa-folder-open"></i> Document Center
    `;
    button.style.cssText = `
        padding: 1rem 1.5rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 1rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        transition: transform 0.2s;
    `;
    
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
    });
    
    button.addEventListener('click', () => {
        showDocumentCenter();
    });
    
    container.appendChild(button);
}
