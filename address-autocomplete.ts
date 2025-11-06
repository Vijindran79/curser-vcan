// Address Autocomplete Utility using a secure Google Maps Proxy
import { showToast } from './ui';
import { functions } from './firebase'; // Assuming you have a firebase utility that exports a functions instance

interface AddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
}

export interface ParsedAddress {
    fullAddress: string;
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude: number;
    longitude: number;
    placeId: string;
}

/**
 * Fetches address predictions from the secure proxy.
 * @param input - The address fragment to search for.
 * @returns A promise that resolves to an array of predictions.
 */
async function fetchPredictions(input: string): Promise<any[]> {
    if (input.length < 3) {
        return [];
    }
    try {
        const googleMapsProxy = functions.httpsCallable('googleMapsProxy');
        const response = await googleMapsProxy({
            endpoint: '/autocomplete',
            params: { input }
        });
        
        const data = response.data as any;
        if (data.status === 'OK') {
            return data.predictions;
        }
        return [];
    } catch (error) {
        console.error('Error fetching address predictions:', error);
        showToast('Could not fetch address suggestions.', 'error');
        return [];
    }
}

/**
 * Fetches the details for a specific place ID from the secure proxy.
 * @param placeId - The ID of the place to get details for.
 * @returns A promise that resolves to the place details.
 */
async function fetchPlaceDetails(placeId: string): Promise<any> {
    try {
        const googleMapsProxy = functions.httpsCallable('googleMapsProxy');
        const response = await googleMapsProxy({
            endpoint: '/place-details',
            params: { place_id: placeId }
        });

        const data = response.data as any;
        if (data.status === 'OK') {
            return data.result;
        }
        return null;
    } catch (error) {
        console.error('Error fetching place details:', error);
        showToast('Could not fetch address details.', 'error');
        return null;
    }
}

/**
 * Initializes the custom address autocomplete on an input field.
 * @param inputId - ID of the input element.
 * @param onAddressSelected - Callback when an address is selected.
 */
export function initAddressAutocomplete(
    inputId: string,
    onAddressSelected: (address: ParsedAddress) => void
): void {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (!input) {
        console.error(`Input element with id "${inputId}" not found`);
        return;
    }

    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'autocomplete-suggestions';
    input.parentNode?.insertBefore(suggestionsContainer, input.nextSibling);

    let debounceTimer: number;
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(async () => {
            const predictions = await fetchPredictions(input.value);
            renderSuggestions(predictions, suggestionsContainer, input, onAddressSelected);
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (e.target !== input) {
            suggestionsContainer.innerHTML = '';
        }
    });
}

/**
 * Renders the autocomplete suggestions in the suggestions container.
 */
function renderSuggestions(
    predictions: any[],
    suggestionsContainer: HTMLDivElement,
    input: HTMLInputElement,
    onAddressSelected: (address: ParsedAddress) => void
): void {
    suggestionsContainer.innerHTML = '';
    if (predictions.length === 0) {
        return;
    }

    predictions.forEach(prediction => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = prediction.description;
        suggestionItem.addEventListener('click', async () => {
            input.value = prediction.description;
            suggestionsContainer.innerHTML = '';
            const placeDetails = await fetchPlaceDetails(prediction.place_id);
            if (placeDetails) {
                const parsedAddress = parseAddressComponents(placeDetails);
                onAddressSelected(parsedAddress);
            }
        });
        suggestionsContainer.appendChild(suggestionItem);
    });
}

/**
 * Parse Google Maps address components into structured format
 */
function parseAddressComponents(place: any): ParsedAddress {
    const components = place.address_components || [];
    
    let streetNumber = '';
    let route = '';
    let city = '';
    let state = '';
    let country = '';
    let postalCode = '';

    components.forEach((component: AddressComponent) => {
        const types = component.types;

        if (types.includes('street_number')) {
            streetNumber = component.long_name;
        }
        if (types.includes('route')) {
            route = component.long_name;
        }
        if (types.includes('locality')) {
            city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
            state = component.short_name;
        }
        if (types.includes('country')) {
            country = component.long_name;
        }
        if (types.includes('postal_code')) {
            postalCode = component.long_name;
        }
    });

    const streetAddress = `${streetNumber} ${route}`.trim();

    return {
        fullAddress: place.formatted_address,
        streetAddress: streetAddress || place.name || '',
        city,
        state,
        country,
        postalCode,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        placeId: place.place_id
    };
}

// The following functions are not directly related to autocomplete, but are kept for compatibility.
// They might need to be updated to use the proxy if they are used elsewhere.

export async function searchByPostalCode(
    postalCode: string,
    countryCode?: string
): Promise<ParsedAddress[]> {
    // This function would need to be updated to use the proxy
    showToast('Search by postal code is not yet implemented with the proxy.', 'info');
    return [];
}

export async function getCurrentLocationAddress(): Promise<ParsedAddress | null> {
    // This function would need to be updated to use the proxy
    showToast('Get current location is not yet implemented with the proxy.', 'info');
    return null;
}

export function validateAddress(address: ParsedAddress): { valid: boolean; missing: string[] } {
    const required = ['streetAddress', 'city', 'country'];
    const missing: string[] = [];

    required.forEach(field => {
        if (!address[field as keyof ParsedAddress]) {
            missing.push(field);
        }
    });

    return {
        valid: missing.length === 0,
        missing
    };
}

export function formatAddressForDisplay(address: ParsedAddress): string {
    const parts = [
        address.streetAddress,
        address.city,
        address.state,
        address.postalCode,
        address.country
    ].filter(Boolean);

    return parts.join(', ');
}

export function createEnhancedAddressInput(
    containerId: string,
    inputId: string,
    labelText: string,
    onAddressSelected: (address: ParsedAddress) => void,
    options: {
        showPostalCodeSearch?: boolean;
        showCurrentLocation?: boolean;
        required?: boolean;
    } = {}
): string {
    const {
        showPostalCodeSearch = true,
        showCurrentLocation = true,
        required = false
    } = options;

    return `
        <div class="enhanced-address-input" style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">
                ${labelText} ${required ? '<span style="color: #ef4444;">*</span>' : ''}
            </label>
            
            <div style="position: relative;">
                <input 
                    type="text" 
                    id="${inputId}" 
                    placeholder="Start typing address..."
                    style="width: 100%; padding: 12px 12px 12px 40px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; transition: all 0.3s;"
                    ${required ? 'required' : ''}
                />
                <i class="fa-solid fa-location-dot" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af;"></i>
            </div>
            
            <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                ${showPostalCodeSearch ? `
                    <button 
                        type="button" 
                        id="${inputId}-postal-search-btn"
                        style="padding: 6px 12px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;"
                        onmouseover="this.style.background='#f9fafb'; this.style.borderColor='#667eea';"
                        onmouseout="this.style.background='white'; this.style.borderColor='#e5e7eb';"
                    >
                        <i class="fa-solid fa-magnifying-glass"></i>
                        Search by Postal Code
                    </button>
                ` : ''}
                
                ${showCurrentLocation ? `
                    <button 
                        type="button" 
                        id="${inputId}-current-location-btn"
                        style="padding: 6px 12px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;"
                        onmouseover="this.style.background='#f9fafb'; this.style.borderColor='#667eea';"
                        onmouseout="this.style.background='white'; this.style.borderColor='#e5e7eb';"
                    >
                        <i class="fa-solid fa-location-crosshairs"></i>
                        Use Current Location
                    </button>
                ` : ''}
            </div>
            
            <div id="${inputId}-address-preview" style="margin-top: 12px; padding: 12px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; display: none;">
                <div style="display: flex; align-items: start; gap: 8px;">
                    <i class="fa-solid fa-circle-check" style="color: #22c55e; margin-top: 2px;"></i>
                    <div>
                        <div style="font-weight: 500; color: #166534; margin-bottom: 4px;">Address Confirmed</div>
                        <div id="${inputId}-address-text" style="font-size: 13px; color: #15803d;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function attachEnhancedAddressListeners(
    inputId: string,
    onAddressSelected: (address: ParsedAddress) => void
): void {
    initAddressAutocomplete(inputId, (address) => {
        showAddressPreview(inputId, address);
        onAddressSelected(address);
    });

    const postalSearchBtn = document.getElementById(`${inputId}-postal-search-btn`);
    if (postalSearchBtn) {
        postalSearchBtn.addEventListener('click', async () => {
            const postalCode = prompt('Enter postal code:');
            if (postalCode) {
                const addresses = await searchByPostalCode(postalCode);
                if (addresses.length > 0) {
                    const address = addresses[0];
                    const input = document.getElementById(inputId) as HTMLInputElement;
                    if (input) input.value = address.fullAddress;
                    showAddressPreview(inputId, address);
                    onAddressSelected(address);
                }
            }
        });
    }

    const currentLocationBtn = document.getElementById(`${inputId}-current-location-btn`);
    if (currentLocationBtn) {
        currentLocationBtn.addEventListener('click', async () => {
            currentLocationBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Getting location...';
            const address = await getCurrentLocationAddress();
            if (address) {
                const input = document.getElementById(inputId) as HTMLInputElement;
                if (input) input.value = address.fullAddress;
                showAddressPreview(inputId, address);
                onAddressSelected(address);
            }
            currentLocationBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Use Current Location';
        });
    }
}

function showAddressPreview(inputId: string, address: ParsedAddress): void {
    const preview = document.getElementById(`${inputId}-address-preview`);
    const previewText = document.getElementById(`${inputId}-address-text`);
    
    if (preview && previewText) {
        previewText.textContent = formatAddressForDisplay(address);
        preview.style.display = 'block';
    }
}
