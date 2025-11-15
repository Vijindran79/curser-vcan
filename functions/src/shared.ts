// shared.ts

// Helper function to parse address strings into structured objects
export const parseAddress = (addressStr: string | any) => {
  if (typeof addressStr === 'object') {
    // If it's already an object, return it as is
    return addressStr;
  }

  if (typeof addressStr !== 'string') {
    // Handle cases where the input is not a string or object
    return {
      street1: '',
      city: '',
      state: '',
      zip: '',
      country: 'US', // Default country
    };
  }

  const parts = addressStr.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    const zipRegex = /\b\d{5}\b/; // Matches 5-digit zip codes
    const stateRegex = /\b([A-Z]{2})\b/; // Matches 2-letter state abbreviations

    const country = parts[parts.length - 1] || 'US';
    const city = parts[1] || '';

    let state = '';
    let zip = '';

    // Extract state and zip from the third part of the address
    const stateAndZipPart = parts[2] || '';
    const stateMatch = stateAndZipPart.match(stateRegex);
    if (stateMatch) {
      state = stateMatch[0];
    }
    const zipMatch = stateAndZipPart.match(zipRegex);
    if (zipMatch) {
      zip = zipMatch[0];
    }

    return {
      street1: parts[0] || '',
      city,
      state,
      zip,
      country,
    };
  }

  // Fallback for incomplete addresses
  return {
    street1: addressStr,
    city: 'City',
    state: 'State',
    zip: '00000',
    country: 'US',
  };
};
