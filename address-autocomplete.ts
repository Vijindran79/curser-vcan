export function renderAddressAutocompletePage(): string {
  return `
    <div style="padding:16px">
      <h2>Address Autocomplete</h2>
      <p>This module is coming soon. Enter an address to continue.</p>
      <input id="addr-input" placeholder="Start typing an address..." style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px" />
    </div>
  `;
}

export async function initializeAddressAutocomplete(): Promise<void> {
  // Stub initializer: wire simple event listener
  const input = document.getElementById('addr-input') as HTMLInputElement | null;
  if (!input) return;
  input.addEventListener('input', () => {
    // Future: integrate Places API / Geoapify autocomplete
  });
}

// ----- Stubs used by parcel/FCL flows -----
export type ParsedAddress = {
  streetAddress: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export function createEnhancedAddressInput(
  containerId: string,
  inputId: string,
  label: string,
  onSelected: (address: ParsedAddress) => void,
  _options?: { showPostalCodeSearch?: boolean; showCurrentLocation?: boolean; required?: boolean }
): string {
  // Return HTML to be injected; wire listeners later via attachEnhancedAddressListeners
  return `
    <label for="${inputId}" style="display:block;margin-bottom:6px">${label}</label>
    <input id="${inputId}" placeholder="Start typing address..." style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px" />
  `;
}

export function attachEnhancedAddressListeners(
  inputId: string,
  onSelected: (address: ParsedAddress) => void
): void {
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  if (!input) return;
  input.addEventListener('change', () => {
    const value = input.value || '';
    // Extremely simple parser; replace with real autocomplete later
    const guess: ParsedAddress = {
      streetAddress: value,
      city: value.split(',')[0]?.trim() || undefined
    };
    onSelected(guess);
  });
}

