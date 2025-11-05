// Address Autocomplete Utility using Google Maps Places API
import { showToast } from './ui';

interface AddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
}

interface PlaceResult {
    formatted_address: string;
    address_components: AddressComponent[];
    geometry: {
        location: google.maps.LatLng;
    };
    place_id: string;
    name?: string;
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

let autocompleteInstances: google.maps.places.Autocomplete[] = [];

/**
 * Initialize Google Maps autocomplete on an input field
 * @param inputId - ID of the input element
 * @param onAddressSelected - Callback when address is selected
 * @param options - Additional autocomplete options
 */
export function initAddressAutocomplete(
    inputId: string,
    onAddressSelected: (address: ParsedAddress) => void,
    options: {
        types?: string[];
        componentRestrictions?: google.maps.places.ComponentRestrictions;
        fields?: string[];
    } = {}
): google.maps.places.Autocomplete | null {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (!input) {
        console.error(`Input element with id "${inputId}" not found`);
        return null;
    }

    // Check if Google Maps API is loaded
    if (typeof google === 'undefined' || !google.maps) {
        console.error('Google Maps API not loaded');
        showToast('Address autocomplete is not available. Please check your internet connection.', 'error');
        return null;
    }

    try {
        // Default options
        const autocompleteOptions: google.maps.places.AutocompleteOptions = {
            types: options.types || ['address'],
            fields: options.fields || ['formatted_address', 'address_components', 'geometry', 'place_id', 'name'],
            ...options
        };

        // Create autocomplete instance
        const autocomplete = new google.maps.places.Autocomplete(input, autocompleteOptions);

        // Add listener for place selection
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace() as PlaceResult;

            if (!place.geometry || !place.geometry.location) {
                showToast('No details available for the selected address', 'warning');
                return;
            }

            // Parse address components
            const parsedAddress = parseAddressComponents(place);
            onAddressSelected(parsedAddress);
        });

        // Store instance for cleanup
        autocompleteInstances.push(autocomplete);

        // Add visual indicator that autocomplete is active
        input.setAttribute('placeholder', 'Start typing address...');
        input.style.borderColor = '#667eea';

        return autocomplete;
    } catch (error) {
        console.error('Error initializing address autocomplete:', error);
        showToast('Failed to initialize address autocomplete', 'error');
        return null;
    }
}

/**
 * Parse Google Maps address components into structured format
 */
function parseAddressComponents(place: PlaceResult): ParsedAddress {
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
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
        placeId: place.place_id
    };
}

/**
 * Search addresses by postal code
 */
export async function searchByPostalCode(
    postalCode: string,
    countryCode?: string
): Promise<ParsedAddress[]> {
    if (!google || !google.maps) {
        showToast('Google Maps API not loaded', 'error');
        return [];
    }

    return new Promise((resolve, reject) => {
        const geocoder = new google.maps.Geocoder();
        const address = countryCode ? `${postalCode}, ${countryCode}` : postalCode;

        geocoder.geocode({ address }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
                const parsedAddresses = results.map((result: any) => 
                    parseAddressComponents(result as PlaceResult)
                );
                resolve(parsedAddresses);
            } else {
                showToast('No addresses found for this postal code', 'warning');
                resolve([]);
            }
        });
    });
}

/**
 * Get current location address
 */
export async function getCurrentLocationAddress(): Promise<ParsedAddress | null> {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser', 'error');
        return null;
    }

    if (!google || !google.maps) {
        showToast('Google Maps API not loaded', 'error');
        return null;
    }

    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const geocoder = new google.maps.Geocoder();
                const latlng = { lat: latitude, lng: longitude };

                geocoder.geocode({ location: latlng }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                        const parsedAddress = parseAddressComponents(results[0] as PlaceResult);
                        resolve(parsedAddress);
                    } else {
                        showToast('Could not retrieve address for your location', 'error');
                        resolve(null);
                    }
                });
            },
            (error) => {
                console.error('Geolocation error:', error);
                showToast('Failed to get your location. Please enter address manually.', 'error');
                resolve(null);
            }
        );
    });
}

/**
 * Validate if address has all required components
 */
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

/**
 * Format address for display
 */
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

/**
 * Calculate distance between two addresses
 */
export async function calculateDistance(
    origin: ParsedAddress,
    destination: ParsedAddress
): Promise<{ distance: string; duration: string } | null> {
    if (!google || !google.maps) {
        showToast('Google Maps API not loaded', 'error');
        return null;
    }

    return new Promise((resolve, reject) => {
        const service = new google.maps.DistanceMatrixService();
        
        service.getDistanceMatrix(
            {
                origins: [{ lat: origin.latitude, lng: origin.longitude }],
                destinations: [{ lat: destination.latitude, lng: destination.longitude }],
                travelMode: google.maps.TravelMode.DRIVING,
            },
            (response, status) => {
                if (status === 'OK' && response && response.rows[0].elements[0].status === 'OK') {
                    const element = response.rows[0].elements[0];
                    resolve({
                        distance: element.distance.text,
                        duration: element.duration.text
                    });
                } else {
                    resolve(null);
                }
            }
        );
    });
}

/**
 * Cleanup all autocomplete instances
 */
export function cleanupAutocomplete(): void {
    autocompleteInstances.forEach(instance => {
        google.maps.event.clearInstanceListeners(instance);
    });
    autocompleteInstances = [];
}

/**
 * Create enhanced address input with autocomplete and postal code search
 */
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

/**
 * Attach event listeners to enhanced address input
 */
export function attachEnhancedAddressListeners(
    inputId: string,
    onAddressSelected: (address: ParsedAddress) => void
): void {
    // Initialize autocomplete
    initAddressAutocomplete(inputId, (address) => {
        showAddressPreview(inputId, address);
        onAddressSelected(address);
    });

    // Postal code search button
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

    // Current location button
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

/**
 * Show address preview after selection
 */
function showAddressPreview(inputId: string, address: ParsedAddress): void {
    const preview = document.getElementById(`${inputId}-address-preview`);
    const previewText = document.getElementById(`${inputId}-address-text`);
    
    if (preview && previewText) {
        previewText.textContent = formatAddressForDisplay(address);
        preview.style.display = 'block';
    }
}
