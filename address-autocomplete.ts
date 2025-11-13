/**
 * Address Autocomplete Module
 * Provides enhanced address input with Geoapify integration
 */

export interface ParsedAddress {
    streetAddress: string;
    city: string;
    country: string;
    postalCode?: string;
    coordinates?: {
        lat: number;
        lon: number;
    };
}

/**
 * Creates an enhanced address input component
 */
export function createEnhancedAddressInput(
    containerId: string,
    inputId: string,
    label: string,
    onSelect: (address: ParsedAddress) => void,
    options?: {
        showPostalCodeSearch?: boolean;
        showCurrentLocation?: boolean;
        required?: boolean;
    }
): string {
    return `
        <div class="input-wrapper">
            <label for="${inputId}">
                <i class="fa-solid fa-location-dot"></i>
                ${label}
            </label>
            <input 
                type="text" 
                id="${inputId}"
                placeholder="Enter address or postcode..."
                ${options?.required ? 'required' : ''}
                autocomplete="off"
            >
            <div class="address-autocomplete-dropdown" id="${containerId}-dropdown" style="display: none;"></div>
            ${options?.showPostalCodeSearch ? `
                <button type="button" class="secondary-btn" style="margin-top: 0.5rem; width: 100%;">
                    <i class="fa-solid fa-search"></i> Search by Postal Code
                </button>
            ` : ''}
            ${options?.showCurrentLocation ? `
                <button type="button" class="secondary-btn" style="margin-top: 0.5rem; width: 100%;">
                    <i class="fa-solid fa-location-crosshairs"></i> Use Current Location
                </button>
            ` : ''}
        </div>
    `;
}

/**
 * Attaches event listeners for address autocomplete functionality
 */
export function attachEnhancedAddressListeners(
    inputId: string,
    onSelect: (address: ParsedAddress) => void
): void {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (!input) return;

    let debounceTimer: NodeJS.Timeout;
    let currentSuggestions: any[] = [];

    // Handle input changes with debouncing
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = input.value.trim();
        
        if (query.length < 3) {
            hideDropdown();
            return;
        }

        debounceTimer = setTimeout(() => {
            fetchAddressSuggestions(query);
        }, 300);
    });

    // Handle keyboard navigation
    input.addEventListener('keydown', (e) => {
        const dropdown = document.getElementById(`${inputId}-dropdown`) as HTMLElement;
        if (!dropdown || dropdown.style.display === 'none') return;

        const items = dropdown.querySelectorAll('.autocomplete-item');
        const currentIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < items.length - 1) {
                    items[currentIndex]?.classList.remove('selected');
                    items[currentIndex + 1]?.classList.add('selected');
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    items[currentIndex]?.classList.remove('selected');
                    items[currentIndex - 1]?.classList.add('selected');
                }
                break;
            case 'Enter':
                e.preventDefault();
                const selectedItem = dropdown.querySelector('.autocomplete-item.selected') as HTMLElement;
                if (selectedItem) {
                    selectAddress(selectedItem.dataset.index || '0');
                }
                break;
            case 'Escape':
                hideDropdown();
                break;
        }
    });

    // Handle click outside to close dropdown
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target as Node)) {
            hideDropdown();
        }
    });

    async function fetchAddressSuggestions(query: string) {
        try {
            // Check for API key
            const geoapifyKey = (window as any).VITE_GEOAPIFY_API_KEY || import.meta.env.VITE_GEOAPIFY_API_KEY;
            
            if (!geoapifyKey) {
                console.warn('Geoapify API key not found - manual address entry only');
                return;
            }

            const response = await fetch(
                `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${geoapifyKey}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch address suggestions');
            }

            const data = await response.json();
            currentSuggestions = data.features || [];
            
            displaySuggestions(currentSuggestions);
        } catch (error) {
            console.error('Error fetching address suggestions:', error);
        }
    }

    function displaySuggestions(suggestions: any[]) {
        const dropdown = document.getElementById(`${inputId}-dropdown`) as HTMLElement;
        if (!dropdown) return;

        if (suggestions.length === 0) {
            hideDropdown();
            return;
        }

        dropdown.innerHTML = suggestions.map((feature, index) => {
            const properties = feature.properties;
            const addressLine = properties.address_line1 || properties.formatted || '';
            const city = properties.city || properties.town || properties.village || '';
            const country = properties.country || '';
            const postalCode = properties.postcode || '';

            return `
                <div class="autocomplete-item ${index === 0 ? 'selected' : ''}" 
                     data-index="${index}"
                     data-address='${JSON.stringify({
                         streetAddress: addressLine,
                         city,
                         country,
                         postalCode,
                         coordinates: feature.geometry?.coordinates
                     })}'>
                    <div class="autocomplete-icon">
                        <i class="fa-solid fa-location-dot"></i>
                    </div>
                    <div class="autocomplete-details">
                        <div class="autocomplete-primary">${addressLine}</div>
                        <div class="autocomplete-secondary">
                            ${city ? `${city}, ` : ''}${country}${postalCode ? ` ${postalCode}` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        dropdown.style.display = 'block';

        // Add click handlers to each item
        dropdown.querySelectorAll('.autocomplete-item').forEach((item, index) => {
            item.addEventListener('click', () => selectAddress(index.toString()));
        });
    }

    function selectAddress(index: string) {
        const dropdown = document.getElementById(`${inputId}-dropdown`) as HTMLElement;
        const item = dropdown?.querySelector(`[data-index="${index}"]`) as HTMLElement;
        
        if (!item) return;

        const addressData = item.dataset.address;
        if (!addressData) return;

        const address: ParsedAddress = JSON.parse(addressData);
        
        // Update input value
        input.value = `${address.streetAddress}, ${address.city}, ${address.country}`;
        
        // Call the selection callback
        onSelect(address);
        
        // Hide dropdown
        hideDropdown();
        
        // Show success feedback
        showAddressValidationFeedback(input, true);
    }

    function hideDropdown() {
        const dropdown = document.getElementById(`${inputId}-dropdown`) as HTMLElement;
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    function showAddressValidationFeedback(input: HTMLInputElement, isValid: boolean) {
        const wrapper = input.closest('.input-wrapper');
        if (!wrapper) return;

        if (isValid) {
            wrapper.classList.add('address-validated');
            wrapper.classList.remove('address-error');

            // Add checkmark icon if not already present
            let checkmark = wrapper.querySelector('.address-checkmark');
            if (!checkmark) {
                checkmark = document.createElement('i');
                checkmark.className = 'fa-solid fa-check-circle address-checkmark';
                wrapper.appendChild(checkmark);
            }
        } else {
            wrapper.classList.remove('address-validated');
            wrapper.classList.add('address-error');
        }
    }
}

/**
 * Renders the address autocomplete page
 */
export function renderAddressAutocompletePage(): string {
    return `
        <div class="service-page-header">
            <h2>Address Autocomplete</h2>
            <p class="subtitle">Find addresses quickly with intelligent autocomplete</p>
        </div>
        <div class="form-container">
            <div class="form-section">
                <h3>Search for an Address</h3>
                <div id="address-autocomplete-container"></div>
                <div id="selected-address-display" style="margin-top: 1rem; padding: 1rem; background: var(--card-bg); border-radius: 8px; display: none;">
                    <h4>Selected Address</h4>
                    <div id="selected-address-details"></div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Initializes the address autocomplete functionality
 */
export async function initializeAddressAutocomplete(): Promise<void> {
    const container = document.getElementById('address-autocomplete-container');
    if (!container) return;

    // Create the enhanced address input
    container.innerHTML = createEnhancedAddressInput(
        'address-autocomplete-main',
        'address-search-input',
        'Search Address',
        (address: ParsedAddress) => {
            // Display selected address
            const display = document.getElementById('selected-address-display');
            const details = document.getElementById('selected-address-details');
            
            if (display && details) {
                details.innerHTML = `
                    <div class="review-item"><span>Street:</span><strong>${address.streetAddress}</strong></div>
                    <div class="review-item"><span>City:</span><strong>${address.city}</strong></div>
                    <div class="review-item"><span>Country:</span><strong>${address.country}</strong></div>
                    ${address.postalCode ? `<div class="review-item"><span>Postal Code:</span><strong>${address.postalCode}</strong></div>` : ''}
                    ${address.coordinates ? `
                        <div class="review-item"><span>Coordinates:</span><strong>${address.coordinates.lat.toFixed(4)}, ${address.coordinates.lon.toFixed(4)}</strong></div>
                    ` : ''}
                `;
                display.style.display = 'block';
            }

            // Show success message
            import('./ui').then(({ showToast }) => {
                showToast('✓ Address selected successfully', 'success');
            });
        },
        {
            showPostalCodeSearch: true,
            showCurrentLocation: true,
            required: false
        }
    );

    // Attach event listeners
    attachEnhancedAddressListeners('address-search-input', (address: ParsedAddress) => {
        const display = document.getElementById('selected-address-display');
        const details = document.getElementById('selected-address-details');
        
        if (display && details) {
            details.innerHTML = `
                <div class="review-item"><span>Street:</span><strong>${address.streetAddress}</strong></div>
                <div class="review-item"><span>City:</span><strong>${address.city}</strong></div>
                <div class="review-item"><span>Country:</span><strong>${address.country}</strong></div>
                ${address.postalCode ? `<div class="review-item"><span>Postal Code:</span><strong>${address.postalCode}</strong></div>` : ''}
                ${address.coordinates ? `
                    <div class="review-item"><span>Coordinates:</span><strong>${address.coordinates.lat.toFixed(4)}, ${address.coordinates.lon.toFixed(4)}</strong></div>
                ` : ''}
            `;
            display.style.display = 'block';
        }
    });

    // Add some example addresses for demonstration
    const examples = document.createElement('div');
    examples.className = 'form-section';
    examples.style.marginTop = '2rem';
    examples.innerHTML = `
        <h3>Example Addresses</h3>
        <div style="display: grid; gap: 0.5rem;">
            <button type="button" class="secondary-btn example-address-btn" data-address="1600 Pennsylvania Avenue, Washington, DC, USA">
                <i class="fa-solid fa-landmark"></i> White House, Washington DC
            </button>
            <button type="button" class="secondary-btn example-address-btn" data-address="10 Downing Street, London, UK">
                <i class="fa-solid fa-building"></i> 10 Downing Street, London
            </button>
            <button type="button" class="secondary-btn example-address-btn" data-address="Eiffel Tower, Paris, France">
                <i class="fa-solid fa-tower-eiffel"></i> Eiffel Tower, Paris
            </button>
        </div>
    `;
    container.appendChild(examples);

    // Add click handlers for example buttons
    examples.querySelectorAll('.example-address-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const address = (e.target as HTMLElement).closest('.example-address-btn')?.getAttribute('data-address');
            if (address) {
                const input = document.getElementById('address-search-input') as HTMLInputElement;
                if (input) {
                    input.value = address;
                    // Trigger the autocomplete
                    input.dispatchEvent(new Event('input'));
                }
            }
        });
    });
}