// Address Autocomplete - Stub Implementation

export interface ParsedAddress {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    fullAddress?: string;
}

export function attachEnhancedAddressListeners(
    inputId: string,
    onSelect?: (address: ParsedAddress) => void
): void {
    // Stub - no-op
}

export function createEnhancedAddressInput(
    placeholder?: string,
    onSelect?: (address: ParsedAddress) => void
): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder || 'Enter address';
    return input;
}
