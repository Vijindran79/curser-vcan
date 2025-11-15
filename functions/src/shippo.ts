import * as functions from 'firebase-functions';
import axios from 'axios';
import { parseAddress } from './shared';

// Function to get Shippo API key from Firebase config
function getShippoApiKey() {
  const apiKey = functions.config().shippo?.api_key || process.env.SHIPPO_API_KEY;
  if (!apiKey || apiKey === 'your-shippo-api-key-here') {
    throw new Error('Shippo API key not configured in Firebase.');
  }
  return apiKey;
}

// Main function to get parcel rates from Shippo
export async function getShippoQuotes(data: any) {
  try {
    const apiKey = getShippoApiKey();
    const { origin, destination, weight, dimensions } = data;

    // Parse the address strings into structured objects
    const fromAddress = parseAddress(origin);
    const toAddress = parseAddress(destination);

    console.log('[Shippo] Parsed addresses:', { fromAddress, toAddress });

    // Create Shippo shipment request
    const shippoPayload = {
      address_from: {
        street1: fromAddress.street1,
        city: fromAddress.city,
        state: fromAddress.state,
        zip: fromAddress.zip,
        country: fromAddress.country,
      },
      address_to: {
        street1: toAddress.street1,
        city: toAddress.city,
        state: toAddress.state,
        zip: toAddress.zip,
        country: toAddress.country,
      },
      parcels: [
        {
          length: dimensions?.length?.toString() || '10',
          width: dimensions?.width?.toString() || '10',
          height: dimensions?.height?.toString() || '10',
          distance_unit: 'cm',
          weight: weight?.toString() || '1',
          mass_unit: 'kg',
        },
      ],
      async: false,
    };

    // Call Shippo API
    const shippoResponse = await axios.post('https://api.goshippo.com/shipments', shippoPayload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ShippoToken ${apiKey}`,
      },
      timeout: 10000,
    });

    const rates = shippoResponse.data.rates || [];
    if (rates.length === 0) {
      throw new Error('No rates available from carriers');
    }

    const quotes = rates.map((rate: any) => ({
      carrier: rate.provider || 'Unknown',
      service_name: rate.servicelevel?.name || 'Standard',
      total_rate: parseFloat(rate.amount) || 0,
      transit_time: rate.estimated_days ? `${rate.estimated_days} days` : 'N/A',
      source: 'live_carrier_api',
    }));

    return {
      success: true,
      quotes,
      source: 'live_carrier_api',
      message: `Live rates from ${quotes.length} carriers via Shippo API`,
    };
  } catch (error: any) {
    console.error('[Shippo] API call failed:', error.message);
    return getShippoFallbackRates(error.message);
  }
}

// Fallback function for Shippo
function getShippoFallbackRates(errorMessage: string) {
  console.log('[Shippo] Returning estimated rates as fallback');
  return {
    success: true,
    quotes: [
      {
        carrier: 'UPS',
        service_name: 'Ground (Estimated)',
        total_rate: 25,
        transit_time: '3-5 days',
        source: 'estimated_rates',
      },
      {
        carrier: 'FedEx',
        service_name: 'Express (Estimated)',
        total_rate: 35,
        transit_time: '2-3 days',
        source: 'estimated_rates',
      },
    ],
    source: 'estimated_rates',
    message: `Shippo API unavailable: ${errorMessage}. Showing estimated rates.`,
  };
}
