/**
 * Real-Time Compliance Checklist System
 * 
 * Shows users country-specific requirements BEFORE payment
 * Reduces customs rejections and delays
 * Provides clear guidance on documents, restrictions, and duties
 */

import { State } from './state';
import { showToast } from './ui';
import { checkCompliance, type ComplianceCheck } from './compliance';

export interface ComplianceChecklistItem {
    id: string;
    title: string;
    description: string;
    status: 'completed' | 'pending' | 'warning' | 'error';
    category: 'documents' | 'restrictions' | 'duties' | 'regulations';
    required: boolean;
    helpLink?: string;
}

export interface ComplianceChecklistData {
    origin: string;
    destination: string;
    cargoType: string;
    hsCode?: string;
    items: ComplianceChecklistItem[];
    overallStatus: 'ready' | 'needs-attention' | 'blocked';
    estimatedDuty?: {
        min: number;
        max: number;
        currency: string;
    };
    prohibitedItems?: string[];
    requiredCertificates?: string[];
}

/**
 * Generate compliance checklist based on shipment details
 */
export async function generateComplianceChecklist(
    origin: string,
    destination: string,
    cargoType: string,
    hsCode?: string,
    cargoValue?: number
): Promise<ComplianceChecklistData> {
    
    const items: ComplianceChecklistItem[] = [];
    
    // Check basic compliance using existing system
    const complianceCheck = await checkCompliance(origin, destination, cargoType);
    
    // 1. DOCUMENTS CHECKLIST
    items.push({
        id: 'commercial-invoice',
        title: 'Commercial Invoice',
        description: 'Detailed invoice with item descriptions, values, and HS codes',
        status: 'pending',
        category: 'documents',
        required: true,
        helpLink: '#'
    });
    
    items.push({
        id: 'packing-list',
        title: 'Packing List',
        description: 'List of all packages with weights, dimensions, and contents',
        status: 'pending',
        category: 'documents',
        required: true,
        helpLink: '#'
    });
    
    items.push({
        id: 'bill-of-lading',
        title: 'Bill of Lading (BOL)',
        description: 'Contract between shipper and carrier',
        status: 'pending',
        category: 'documents',
        required: true,
        helpLink: '#'
    });
    
    // Certificate of Origin (required for certain countries)
    const requiresCertificateOrigin = ['US', 'GB', 'EU', 'CA', 'AU', 'JP', 'CN', 'IN'];
    if (requiresCertificateOrigin.includes(destination)) {
        items.push({
            id: 'certificate-origin',
            title: 'Certificate of Origin',
            description: `Required for imports into ${destination}`,
            status: 'pending',
            category: 'documents',
            required: true,
            helpLink: '#'
        });
    }
    
    // 2. RESTRICTIONS & REGULATIONS
    if (complianceCheck.isRestricted) {
        items.push({
            id: 'special-permit',
            title: 'Special Import Permit',
            description: complianceCheck.message || 'This cargo type requires special authorization',
            status: 'warning',
            category: 'restrictions',
            required: true,
            helpLink: '#'
        });
    }
    
    // Country-specific regulations
    const countryRegulations = getCountryRegulations(destination);
    countryRegulations.forEach((reg, index) => {
        items.push({
            id: `regulation-${index}`,
            title: reg.title,
            description: reg.description,
            status: 'pending',
            category: 'regulations',
            required: reg.required,
            helpLink: reg.helpLink
        });
    });
    
    // 3. DUTIES & TAXES
    const dutyInfo = estimateDuties(destination, cargoValue || 0, hsCode);
    items.push({
        id: 'customs-duties',
        title: 'Customs Duties & Taxes',
        description: `Estimated ${dutyInfo.min}% - ${dutyInfo.max}% of cargo value`,
        status: 'pending',
        category: 'duties',
        required: true,
        helpLink: '#'
    });
    
    // 4. PROHIBITED ITEMS CHECK
    const prohibitedItems = getProhibitedItems(destination, cargoType);
    if (prohibitedItems.length > 0) {
        items.push({
            id: 'prohibited-items',
            title: 'Prohibited Items Warning',
            description: `${prohibitedItems.length} potential restrictions detected`,
            status: 'error',
            category: 'restrictions',
            required: true,
            helpLink: '#'
        });
    }
    
    // Determine overall status
    const hasErrors = items.some(i => i.status === 'error');
    const hasWarnings = items.some(i => i.status === 'warning');
    const overallStatus = hasErrors ? 'blocked' : hasWarnings ? 'needs-attention' : 'ready';
    
    return {
        origin,
        destination,
        cargoType,
        hsCode,
        items,
        overallStatus,
        estimatedDuty: dutyInfo,
        prohibitedItems: prohibitedItems.length > 0 ? prohibitedItems : undefined,
        requiredCertificates: countryRegulations.filter(r => r.required).map(r => r.title)
    };
}

/**
 * Get country-specific regulations
 */
function getCountryRegulations(countryCode: string): Array<{ title: string; description: string; required: boolean; helpLink: string }> {
    const regulations: any = {
        'US': [
            { title: 'ISF Filing', description: 'Importer Security Filing required 24 hours before loading', required: true, helpLink: '#' },
            { title: 'FDA Clearance', description: 'Required for food, drugs, cosmetics, and medical devices', required: false, helpLink: '#' },
        ],
        'EU': [
            { title: 'EORI Number', description: 'Economic Operators Registration and Identification number', required: true, helpLink: '#' },
            { title: 'CE Marking', description: 'Required for certain product categories', required: false, helpLink: '#' },
        ],
        'CN': [
            { title: 'CCC Certification', description: 'China Compulsory Certificate for regulated products', required: false, helpLink: '#' },
            { title: 'Import License', description: 'Required for restricted goods', required: false, helpLink: '#' },
        ],
        'AU': [
            { title: 'Quarantine Declaration', description: 'Biosecurity requirements for organic materials', required: true, helpLink: '#' },
            { title: 'AQIS Clearance', description: 'Australian Quarantine and Inspection Service', required: false, helpLink: '#' },
        ],
        'GB': [
            { title: 'UK Customs Declaration', description: 'Required for all imports post-Brexit', required: true, helpLink: '#' },
            { title: 'UKCA Marking', description: 'UK Conformity Assessed marking', required: false, helpLink: '#' },
        ],
    };
    
    return regulations[countryCode] || [];
}

/**
 * Estimate duties and taxes
 */
function estimateDuties(countryCode: string, cargoValue: number, hsCode?: string): { min: number; max: number; currency: string } {
    // Duty rates by country (simplified - in reality would vary by HS code)
    const dutyRates: any = {
        'US': { min: 0, max: 15 },
        'EU': { min: 0, max: 20 },
        'GB': { min: 0, max: 12 },
        'CN': { min: 5, max: 25 },
        'IN': { min: 10, max: 30 },
        'AU': { min: 0, max: 10 },
        'CA': { min: 0, max: 18 },
        'JP': { min: 0, max: 10 },
        'BR': { min: 15, max: 35 },
    };
    
    const rates = dutyRates[countryCode] || { min: 0, max: 15 };
    
    return {
        min: rates.min,
        max: rates.max,
        currency: State.currentCurrency?.code || 'USD'
    };
}

/**
 * Get prohibited items for destination
 */
function getProhibitedItems(countryCode: string, cargoType: string): string[] {
    const prohibited: any = {
        'US': ['Absinthe', 'Cuban cigars', 'Certain animal products', 'Counterfeit goods'],
        'EU': ['Endangered species', 'Illegal drugs', 'Offensive weapons', 'Counterfeit goods'],
        'CN': ['Publications harmful to China', 'Wireless devices without approval', 'Certain chemicals'],
        'AU': ['Fresh food', 'Seeds and plants', 'Animal products', 'Soil and sand'],
        'IN': ['Beef products', 'Tallow', 'E-cigarettes', 'Certain chemicals'],
        'AE': ['Alcohol', 'Pork products', 'Gambling materials', 'Certain books'],
        'SA': ['Alcohol', 'Pork products', 'Religious materials', 'Weapons'],
    };
    
    return prohibited[countryCode] || [];
}

/**
 * Display compliance checklist modal
 */
export function showComplianceChecklist(checklistData: ComplianceChecklistData) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'compliance-checklist-modal';
    
    const statusColors = {
        'ready': '#10b981',
        'needs-attention': '#f59e0b',
        'blocked': '#ef4444'
    };
    
    const statusIcons = {
        'ready': 'fa-circle-check',
        'needs-attention': 'fa-triangle-exclamation',
        'blocked': 'fa-circle-xmark'
    };
    
    const statusText = {
        'ready': 'Ready to Ship',
        'needs-attention': 'Action Required',
        'blocked': 'Cannot Ship Yet'
    };
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <button class="close-btn" id="close-compliance-modal">×</button>
            
            <!-- Header -->
            <div style="text-align: center; padding-bottom: 1.5rem; border-bottom: 2px solid var(--border-color);">
                <div style="width: 80px; height: 80px; background: ${statusColors[checklistData.overallStatus]}; border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid ${statusIcons[checklistData.overallStatus]}" style="font-size: 2.5rem; color: white;"></i>
                </div>
                <h2 style="margin: 0 0 0.5rem; color: var(--text-color);">Compliance Checklist</h2>
                <p style="color: var(--medium-gray); margin: 0; font-size: 0.9375rem;">
                    ${checklistData.origin} → ${checklistData.destination}
                </p>
                <div style="display: inline-block; margin-top: 0.75rem; padding: 0.5rem 1rem; background: ${statusColors[checklistData.overallStatus]}; color: white; border-radius: 999px; font-weight: 600; font-size: 0.875rem;">
                    ${statusText[checklistData.overallStatus]}
                </div>
            </div>

            <!-- Progress Bar -->
            <div style="margin: 1.5rem 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="font-weight: 500; color: var(--text-color);">Compliance Progress</span>
                    <span style="font-weight: 600; color: var(--primary-orange);">
                        ${checklistData.items.filter(i => i.status === 'completed').length}/${checklistData.items.length}
                    </span>
                </div>
                <div style="width: 100%; height: 8px; background: var(--light-gray); border-radius: 999px; overflow: hidden;">
                    <div style="width: ${(checklistData.items.filter(i => i.status === 'completed').length / checklistData.items.length) * 100}%; height: 100%; background: linear-gradient(90deg, #10b981 0%, #059669 100%); transition: width 0.3s;"></div>
                </div>
            </div>

            <!-- Estimated Duties -->
            ${checklistData.estimatedDuty ? `
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem; border: 2px solid #fbbf24;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <i class="fa-solid fa-coins" style="font-size: 1.5rem; color: #d97706;"></i>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #78350f; margin-bottom: 0.25rem;">Estimated Customs Duties</div>
                            <div style="font-size: 1.25rem; font-weight: 700; color: #92400e;">
                                ${checklistData.estimatedDuty.min}% - ${checklistData.estimatedDuty.max}%
                            </div>
                            <div style="font-size: 0.8125rem; color: #92400e; margin-top: 0.25rem;">
                                Actual rate depends on HS code and cargo value
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Prohibited Items Warning -->
            ${checklistData.prohibitedItems && checklistData.prohibitedItems.length > 0 ? `
                <div style="background: #fee2e2; padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem; border: 2px solid #f87171;">
                    <div style="display: flex; align-items: start; gap: 0.75rem;">
                        <i class="fa-solid fa-ban" style="font-size: 1.5rem; color: #dc2626; margin-top: 0.125rem;"></i>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #991b1b; margin-bottom: 0.5rem;">Prohibited Items in ${checklistData.destination}</div>
                            <ul style="margin: 0; padding-left: 1.25rem; color: #991b1b; font-size: 0.875rem;">
                                ${checklistData.prohibitedItems.map(item => `<li style="margin-bottom: 0.25rem;">${item}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Checklist Items by Category -->
            <div style="margin-bottom: 1.5rem;">
                ${renderChecklistCategory('Documents Required', checklistData.items.filter(i => i.category === 'documents'))}
                ${renderChecklistCategory('Import Restrictions', checklistData.items.filter(i => i.category === 'restrictions'))}
                ${renderChecklistCategory('Country Regulations', checklistData.items.filter(i => i.category === 'regulations'))}
                ${renderChecklistCategory('Duties & Taxes', checklistData.items.filter(i => i.category === 'duties'))}
            </div>

            <!-- Actions -->
            <div style="display: flex; gap: 0.75rem; padding-top: 1.5rem; border-top: 2px solid var(--border-color);">
                <button id="download-checklist-btn" style="flex: 1; padding: 0.875rem; background: transparent; color: var(--text-color); border: 2px solid var(--border-color); border-radius: 8px; font-weight: 500; cursor: pointer;">
                    <i class="fa-solid fa-download"></i> Download PDF
                </button>
                <button id="proceed-payment-btn" style="flex: 2; padding: 0.875rem; background: ${checklistData.overallStatus === 'blocked' ? '#9ca3af' : 'var(--primary-orange)'}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: ${checklistData.overallStatus === 'blocked' ? 'not-allowed' : 'pointer'};" ${checklistData.overallStatus === 'blocked' ? 'disabled' : ''}>
                    <i class="fa-solid fa-arrow-right"></i> ${checklistData.overallStatus === 'blocked' ? 'Cannot Proceed' : 'Proceed to Payment'}
                </button>
            </div>

            <!-- Disclaimer -->
            <div style="margin-top: 1rem; padding: 0.75rem; background: #f3f4f6; border-radius: 8px; font-size: 0.75rem; color: #6b7280; text-align: center;">
                This checklist is for guidance only. Final compliance requirements are determined by customs authorities.
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close button
    document.getElementById('close-compliance-modal')?.addEventListener('click', () => {
        modal.remove();
    });
    
    // Download PDF button
    document.getElementById('download-checklist-btn')?.addEventListener('click', () => {
        downloadChecklistPDF(checklistData);
    });
    
    // Proceed button
    document.getElementById('proceed-payment-btn')?.addEventListener('click', () => {
        if (checklistData.overallStatus !== 'blocked') {
            modal.remove();
            showToast('Proceeding to payment...', 'success');
            // Continue with existing payment flow
        }
    });
    
    // Checkbox interactions
    const checkboxes = modal.querySelectorAll('.compliance-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('click', (e) => {
            const item = (e.target as HTMLElement).closest('.checklist-item');
            if (item) {
                item.classList.toggle('checked');
                const icon = item.querySelector('.check-icon');
                if (icon) {
                    icon.className = item.classList.contains('checked') ? 
                        'fa-solid fa-circle-check check-icon' : 
                        'fa-regular fa-circle check-icon';
                }
            }
        });
    });
}

/**
 * Render checklist category
 */
function renderChecklistCategory(title: string, items: ComplianceChecklistItem[]): string {
    if (items.length === 0) return '';
    
    const categoryIcons: any = {
        'Documents Required': 'fa-file-lines',
        'Import Restrictions': 'fa-triangle-exclamation',
        'Country Regulations': 'fa-scale-balanced',
        'Duties & Taxes': 'fa-percent'
    };
    
    return `
        <div style="margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 0.75rem; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-color);">
                <i class="fa-solid ${categoryIcons[title]}"></i> ${title}
            </h3>
            <div style="display: grid; gap: 0.75rem;">
                ${items.map(item => `
                    <div class="checklist-item" style="padding: 1rem; background: var(--light-gray); border-radius: 8px; border-left: 4px solid ${getStatusColor(item.status)}; cursor: pointer; transition: all 0.2s;">
                        <div style="display: flex; align-items: start; gap: 0.75rem;">
                            <div class="compliance-checkbox" style="margin-top: 0.125rem;">
                                <i class="fa-regular fa-circle check-icon" style="font-size: 1.25rem; color: ${getStatusColor(item.status)};"></i>
                            </div>
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                    <span style="font-weight: 600; color: var(--text-color);">${item.title}</span>
                                    ${item.required ? '<span style="color: #ef4444; font-size: 0.75rem; font-weight: 600;">REQUIRED</span>' : ''}
                                </div>
                                <p style="margin: 0; color: var(--medium-gray); font-size: 0.875rem;">${item.description}</p>
                            </div>
                            ${item.status === 'error' || item.status === 'warning' ? `
                                <div style="padding: 0.25rem 0.75rem; background: ${item.status === 'error' ? '#fee2e2' : '#fef3c7'}; color: ${item.status === 'error' ? '#991b1b' : '#92400e'}; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">
                                    ${item.status === 'error' ? 'BLOCKED' : 'WARNING'}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Get status color
 */
function getStatusColor(status: string): string {
    const colors: any = {
        'completed': '#10b981',
        'pending': '#9ca3af',
        'warning': '#f59e0b',
        'error': '#ef4444'
    };
    return colors[status] || '#9ca3af';
}

/**
 * Download checklist as PDF
 */
function downloadChecklistPDF(checklistData: ComplianceChecklistData) {
    showToast('Generating compliance checklist PDF...', 'info');
    
    import('jspdf').then(({ jsPDF }) => {
        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(20);
        doc.text('Compliance Checklist', 20, 20);
        
        // Route
        doc.setFontSize(12);
        doc.text(`${checklistData.origin} → ${checklistData.destination}`, 20, 30);
        
        // Status
        doc.setFontSize(14);
        doc.setTextColor(checklistData.overallStatus === 'ready' ? 16 : 239, checklistData.overallStatus === 'ready' ? 185 : 68, checklistData.overallStatus === 'ready' ? 129 : 68);
        doc.text(`Status: ${checklistData.overallStatus.toUpperCase()}`, 20, 40);
        doc.setTextColor(0, 0, 0);
        
        let yPos = 55;
        
        // Items
        checklistData.items.forEach((item, index) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`${index + 1}. ${item.title}`, 20, yPos);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const splitDesc = doc.splitTextToSize(item.description, 170);
            doc.text(splitDesc, 25, yPos + 5);
            
            yPos += 5 + (splitDesc.length * 4) + 5;
        });
        
        // Save
        doc.save(`compliance-checklist-${checklistData.destination}.pdf`);
        showToast('Checklist downloaded successfully', 'success');
    });
}

/**
 * Show inline compliance summary (for quote results pages)
 */
export function showInlineComplianceSummary(
    containerId: string,
    origin: string,
    destination: string,
    cargoType: string
) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    generateComplianceChecklist(origin, destination, cargoType).then(checklist => {
        const summaryHtml = `
            <div style="background: ${checklist.overallStatus === 'blocked' ? '#fee2e2' : checklist.overallStatus === 'needs-attention' ? '#fef3c7' : '#d1fae5'}; padding: 1rem; border-radius: 8px; margin-top: 1rem; border: 2px solid ${checklist.overallStatus === 'blocked' ? '#f87171' : checklist.overallStatus === 'needs-attention' ? '#fbbf24' : '#34d399'};">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                    <i class="fa-solid ${checklist.overallStatus === 'blocked' ? 'fa-circle-xmark' : checklist.overallStatus === 'needs-attention' ? 'fa-triangle-exclamation' : 'fa-circle-check'}" style="font-size: 1.25rem; color: ${checklist.overallStatus === 'blocked' ? '#dc2626' : checklist.overallStatus === 'needs-attention' ? '#d97706' : '#059669'};"></i>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: ${checklist.overallStatus === 'blocked' ? '#991b1b' : checklist.overallStatus === 'needs-attention' ? '#78350f' : '#065f46'};">
                            Compliance: ${checklist.overallStatus === 'blocked' ? 'Issues Detected' : checklist.overallStatus === 'needs-attention' ? 'Action Required' : 'All Clear'}
                        </div>
                        <div style="font-size: 0.875rem; color: ${checklist.overallStatus === 'blocked' ? '#991b1b' : checklist.overallStatus === 'needs-attention' ? '#78350f' : '#065f46'};">
                            ${checklist.items.filter(i => i.required).length} required items • ${checklist.estimatedDuty ? `${checklist.estimatedDuty.min}-${checklist.estimatedDuty.max}% duty` : 'Duty varies'}
                        </div>
                    </div>
                    <button class="view-compliance-btn" style="padding: 0.5rem 1rem; background: white; color: ${checklist.overallStatus === 'blocked' ? '#dc2626' : checklist.overallStatus === 'needs-attention' ? '#d97706' : '#059669'}; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.875rem; white-space: nowrap;">
                        View Details
                    </button>
                </div>
            </div>
        `;
        
        container.innerHTML = summaryHtml;
        
        // Add click handler
        container.querySelector('.view-compliance-btn')?.addEventListener('click', () => {
            showComplianceChecklist(checklist);
        });
    });
}
