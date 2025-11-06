/**
 * Enhanced HS Code Intelligence System
 * 
 * Uses Gemini AI to automatically generate HS codes from cargo descriptions
 * Provides customs requirements, duty rates, prohibited items warnings
 * Country-specific compliance information
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { State } from './state';
import { showToast, toggleLoading } from './ui';

// Initialize Gemini AI
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'REPLACE_WITH_NEW_GEMINI_KEY';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface HSCodeResult {
    code: string;
    description: string;
    confidence: number; // 0-100
    category: string;
    dutyRate?: {
        min: number;
        max: number;
        country: string;
    };
    restrictions?: string[];
    prohibitedCountries?: string[];
    requiredDocuments?: string[];
    complianceNotes?: string[];
    relatedCodes?: Array<{
        code: string;
        description: string;
        reason: string;
    }>;
}

/**
 * Generate HS code using Gemini AI
 */
export async function generateHSCode(
    cargoDescription: string,
    originCountry?: string,
    destinationCountry?: string
): Promise<HSCodeResult | null> {
    if (!cargoDescription || cargoDescription.trim().length < 3) {
        showToast('Please provide a cargo description', 'warning');
        return null;
    }

    try {
        toggleLoading(true, 'AI analyzing cargo description...');

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });

        const prompt = `You are an expert customs classifier specializing in HS (Harmonized System) codes for international trade.

Analyze this cargo description and provide the most accurate 6-digit HS code:

CARGO DESCRIPTION: "${cargoDescription}"
${originCountry ? `ORIGIN COUNTRY: ${originCountry}` : ''}
${destinationCountry ? `DESTINATION COUNTRY: ${destinationCountry}` : ''}

Provide your response in this EXACT JSON format (no markdown, no code blocks):
{
  "code": "123456",
  "description": "Detailed description of what this HS code covers",
  "confidence": 85,
  "category": "Main category name",
  "dutyRate": {
    "min": 0,
    "max": 15,
    "country": "${destinationCountry || 'General'}"
  },
  "restrictions": ["Any import restrictions", "Special requirements"],
  "prohibitedCountries": ["Countries where this item is prohibited"],
  "requiredDocuments": ["Commercial Invoice", "Certificate of Origin", "Other required documents"],
  "complianceNotes": ["Important compliance information", "Special handling requirements"],
  "relatedCodes": [
    {
      "code": "123457",
      "description": "Similar product description",
      "reason": "Why this might be an alternative"
    }
  ]
}

IMPORTANT RULES:
1. Use only valid 6-digit HS codes (format: 123456)
2. Confidence should reflect certainty (100 = certain, 50 = needs verification)
3. Include realistic duty rates (0-50% range typically)
4. List actual restrictions that apply
5. Only list prohibited countries if truly prohibited
6. Include essential documents (minimum: Commercial Invoice, Packing List)
7. Provide 2-3 related codes if applicable
8. Return ONLY the JSON object, no other text`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();
        
        // Clean up response - remove markdown code blocks if present
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/```\n?/g, '');
        }
        
        const hsCodeData: HSCodeResult = JSON.parse(cleanResponse);
        
        // Validate the response
        if (!hsCodeData.code || hsCodeData.code.length !== 6) {
            throw new Error('Invalid HS code format');
        }

        toggleLoading(false);
        return hsCodeData;

    } catch (error) {
        console.error('HS Code generation error:', error);
        toggleLoading(false);
        showToast('Failed to generate HS code. Please try again.', 'error');
        return null;
    }
}

/**
 * Display HS code results in a modal
 */
export function displayHSCodeResults(hsCode: HSCodeResult) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'hs-code-results-modal';
    
    const confidenceColor = hsCode.confidence >= 80 ? '#10b981' : 
                           hsCode.confidence >= 60 ? '#f59e0b' : '#ef4444';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
            <button class="close-btn" id="close-hs-modal">×</button>
            
            <div style="text-align: center; padding-bottom: 1.5rem; border-bottom: 2px solid var(--border-color);">
                <h2 style="margin: 0 0 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.75rem; color: var(--text-color);">
                    <i class="fa-solid fa-barcode" style="color: var(--primary-orange);"></i>
                    HS Code Analysis
                </h2>
                <p style="color: var(--medium-gray); margin: 0; font-size: 0.875rem;">
                    AI-Powered Customs Classification
                </p>
            </div>

            <!-- Main HS Code Display -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 12px; margin: 1.5rem 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div>
                        <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.25rem;">HS Code</div>
                        <div style="font-size: 2.5rem; font-weight: 700; letter-spacing: 2px;">${hsCode.code}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.25rem;">Confidence</div>
                        <div style="font-size: 2rem; font-weight: 700; color: ${confidenceColor};">
                            ${hsCode.confidence}%
                        </div>
                    </div>
                </div>
                <div style="font-size: 1rem; opacity: 0.95; line-height: 1.5;">
                    ${hsCode.description}
                </div>
                <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255, 255, 255, 0.2); font-size: 0.875rem; opacity: 0.9;">
                    <i class="fa-solid fa-tag"></i> ${hsCode.category}
                </div>
            </div>

            <!-- Duty Rate -->
            ${hsCode.dutyRate ? `
                <div style="background: var(--light-gray); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <h3 style="margin: 0 0 0.75rem; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-color);">
                        <i class="fa-solid fa-percent"></i> Estimated Duty Rate
                    </h3>
                    <div style="font-size: 1.5rem; font-weight: 600; color: var(--primary-orange);">
                        ${hsCode.dutyRate.min === hsCode.dutyRate.max ? 
                            `${hsCode.dutyRate.min}%` : 
                            `${hsCode.dutyRate.min}% - ${hsCode.dutyRate.max}%`}
                    </div>
                    <div style="font-size: 0.875rem; color: var(--medium-gray); margin-top: 0.25rem;">
                        ${hsCode.dutyRate.country}
                    </div>
                </div>
            ` : ''}

            <!-- Required Documents -->
            ${hsCode.requiredDocuments && hsCode.requiredDocuments.length > 0 ? `
                <div style="margin-bottom: 1rem;">
                    <h3 style="margin: 0 0 0.75rem; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-color);">
                        <i class="fa-solid fa-file-lines"></i> Required Documents
                    </h3>
                    <div style="display: grid; gap: 0.5rem;">
                        ${hsCode.requiredDocuments.map(doc => `
                            <div style="padding: 0.75rem; background: var(--light-gray); border-left: 3px solid var(--primary-orange); border-radius: 4px; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fa-solid fa-check-circle" style="color: var(--success-color);"></i>
                                <span style="color: var(--text-color);">${doc}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Restrictions -->
            ${hsCode.restrictions && hsCode.restrictions.length > 0 ? `
                <div style="margin-bottom: 1rem;">
                    <h3 style="margin: 0 0 0.75rem; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-color);">
                        <i class="fa-solid fa-triangle-exclamation"></i> Import Restrictions
                    </h3>
                    <div style="display: grid; gap: 0.5rem;">
                        ${hsCode.restrictions.map(restriction => `
                            <div style="padding: 0.75rem; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px; color: #92400e;">
                                <i class="fa-solid fa-exclamation-circle"></i> ${restriction}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Prohibited Countries -->
            ${hsCode.prohibitedCountries && hsCode.prohibitedCountries.length > 0 ? `
                <div style="margin-bottom: 1rem;">
                    <h3 style="margin: 0 0 0.75rem; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; color: var(--error-color);">
                        <i class="fa-solid fa-ban"></i> Prohibited Countries
                    </h3>
                    <div style="padding: 1rem; background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px;">
                        <p style="color: #991b1b; margin: 0; font-weight: 500;">
                            This item cannot be shipped to:
                        </p>
                        <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
                            ${hsCode.prohibitedCountries.map(country => `
                                <span style="background: white; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.875rem; color: #991b1b;">
                                    ${country}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Compliance Notes -->
            ${hsCode.complianceNotes && hsCode.complianceNotes.length > 0 ? `
                <div style="margin-bottom: 1rem;">
                    <h3 style="margin: 0 0 0.75rem; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-color);">
                        <i class="fa-solid fa-clipboard-check"></i> Compliance Notes
                    </h3>
                    <div style="display: grid; gap: 0.5rem;">
                        ${hsCode.complianceNotes.map(note => `
                            <div style="padding: 0.75rem; background: var(--light-gray); border-radius: 4px; color: var(--text-color); font-size: 0.875rem;">
                                <i class="fa-solid fa-info-circle" style="color: var(--primary-orange);"></i> ${note}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Related Codes -->
            ${hsCode.relatedCodes && hsCode.relatedCodes.length > 0 ? `
                <div style="margin-bottom: 1rem;">
                    <h3 style="margin: 0 0 0.75rem; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-color);">
                        <i class="fa-solid fa-code-branch"></i> Related HS Codes
                    </h3>
                    <div style="display: grid; gap: 0.75rem;">
                        ${hsCode.relatedCodes.map(related => `
                            <div style="padding: 1rem; background: var(--light-gray); border-radius: 8px; border: 1px solid var(--border-color);">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                                    <span style="font-weight: 600; font-size: 1.125rem; color: var(--text-color);">
                                        ${related.code}
                                    </span>
                                    <button class="use-related-code-btn" data-code="${related.code}" style="padding: 0.25rem 0.75rem; background: var(--primary-orange); color: white; border: none; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">
                                        Use This
                                    </button>
                                </div>
                                <div style="color: var(--text-color); font-size: 0.875rem; margin-bottom: 0.5rem;">
                                    ${related.description}
                                </div>
                                <div style="color: var(--medium-gray); font-size: 0.8125rem; font-style: italic;">
                                    ${related.reason}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Disclaimer -->
            <div style="margin-top: 1.5rem; padding: 1rem; background: #f3f4f6; border-radius: 8px; font-size: 0.8125rem; color: #6b7280;">
                <strong style="color: #374151;">⚠️ Important:</strong> This HS code is AI-generated and should be verified with customs authorities.
                Vcanship is not responsible for any customs issues resulting from incorrect classification.
                For high-value or sensitive shipments, please consult a licensed customs broker.
            </div>

            <!-- Actions -->
            <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid var(--border-color);">
                <button id="use-hs-code-btn" style="flex: 1; padding: 0.875rem; background: var(--primary-orange); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 1rem;">
                    <i class="fa-solid fa-check"></i> Use This Code
                </button>
                <button id="search-again-btn" style="flex: 1; padding: 0.875rem; background: transparent; color: var(--text-color); border: 2px solid var(--border-color); border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 1rem;">
                    <i class="fa-solid fa-rotate"></i> Search Again
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close button
    const closeBtn = document.getElementById('close-hs-modal');
    closeBtn?.addEventListener('click', () => {
        modal.remove();
    });

    // Use code button
    const useBtn = document.getElementById('use-hs-code-btn');
    useBtn?.addEventListener('click', () => {
        // Store in State or fill form field
        const hsCodeInput = document.querySelector('[data-hs-code-input]') as HTMLInputElement;
        if (hsCodeInput) {
            hsCodeInput.value = hsCode.code;
        }
        showToast(`HS Code ${hsCode.code} applied successfully`, 'success');
        modal.remove();
    });

    // Search again button
    const searchBtn = document.getElementById('search-again-btn');
    searchBtn?.addEventListener('click', () => {
        modal.remove();
        showHSCodeSearchModal();
    });

    // Related code buttons
    const relatedBtns = modal.querySelectorAll('.use-related-code-btn');
    relatedBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const code = (e.target as HTMLButtonElement).dataset.code;
            if (code) {
                const hsCodeInput = document.querySelector('[data-hs-code-input]') as HTMLInputElement;
                if (hsCodeInput) {
                    hsCodeInput.value = code;
                }
                showToast(`HS Code ${code} applied successfully`, 'success');
                modal.remove();
            }
        });
    });
}

/**
 * Show HS code search modal
 */
export function showHSCodeSearchModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'hs-code-search-modal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 550px;">
            <button class="close-btn" id="close-search-modal">×</button>
            
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="width: 70px; height: 70px; background: linear-gradient(135deg, var(--primary-orange) 0%, #fb923c 100%); border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-wand-magic-sparkles" style="font-size: 2rem; color: white;"></i>
                </div>
                <h2 style="margin: 0 0 0.5rem; color: var(--text-color);">AI HS Code Generator</h2>
                <p style="color: var(--medium-gray); margin: 0; font-size: 0.9375rem;">
                    Describe your cargo and get instant customs classification
                </p>
            </div>

            <form id="hs-code-search-form">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-color);">
                        Cargo Description <span style="color: #ef4444;">*</span>
                    </label>
                    <textarea 
                        id="cargo-description" 
                        required
                        rows="4"
                        style="width: 100%; padding: 0.875rem; border: 2px solid var(--border-color); border-radius: 8px; font-size: 0.9375rem; font-family: inherit; resize: vertical; background: var(--light-gray); color: var(--text-color);"
                        placeholder="e.g., Cotton t-shirts, women's size M-L, printed design, 100% cotton, made in Bangladesh"
                    ></textarea>
                    <small style="color: var(--medium-gray); font-size: 0.8125rem; display: block; margin-top: 0.25rem;">
                        Be specific: Include material, purpose, size, manufacturing process
                    </small>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-color);">
                            Origin Country
                        </label>
                        <input 
                            type="text" 
                            id="origin-country" 
                            value="${State.userCountry?.name || ''}"
                            style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.9375rem; background: var(--light-gray); color: var(--text-color);"
                            placeholder="e.g., Bangladesh"
                        />
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-color);">
                            Destination Country
                        </label>
                        <input 
                            type="text" 
                            id="destination-country" 
                            style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.9375rem; background: var(--light-gray); color: var(--text-color);"
                            placeholder="e.g., United States"
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    style="width: 100%; padding: 1rem; background: linear-gradient(135deg, var(--primary-orange) 0%, #fb923c 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;"
                >
                    <i class="fa-solid fa-sparkles"></i> Generate HS Code
                </button>
            </form>

            <div style="margin-top: 1.5rem; padding: 1rem; background: #eff6ff; border-radius: 8px; font-size: 0.8125rem; color: #1e40af;">
                <strong>💡 Tip:</strong> More details = better accuracy. Include material composition, intended use, and manufacturing process.
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close button
    const closeBtn = document.getElementById('close-search-modal');
    closeBtn?.addEventListener('click', () => {
        modal.remove();
    });

    // Form submission
    const form = document.getElementById('hs-code-search-form') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const description = (document.getElementById('cargo-description') as HTMLTextAreaElement).value.trim();
        const origin = (document.getElementById('origin-country') as HTMLInputElement).value.trim();
        const destination = (document.getElementById('destination-country') as HTMLInputElement).value.trim();

        modal.remove();

        const result = await generateHSCode(description, origin, destination);
        if (result) {
            displayHSCodeResults(result);
        }
    });
}

/**
 * Initialize HS code intelligence on forms
 */
export function initializeHSCodeIntelligence() {
    // Add "Generate HS Code" button to any form with HS code input
    const hsCodeInputs = document.querySelectorAll('[data-hs-code-input]');
    
    hsCodeInputs.forEach((input) => {
        if (input.parentElement && !input.parentElement.querySelector('.generate-hs-btn')) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'generate-hs-btn';
            button.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI Generate';
            button.style.cssText = 'margin-top: 0.5rem; padding: 0.5rem 1rem; background: var(--primary-orange); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500;';
            
            button.addEventListener('click', () => {
                showHSCodeSearchModal();
            });
            
            input.parentElement.appendChild(button);
        }
    });
}
