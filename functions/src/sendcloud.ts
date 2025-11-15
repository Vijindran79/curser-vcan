import * as functions from 'firebase-functions';
import axios from 'axios';
import { parseAddress } from './shared';

// Function to get Sendcloud API credentials from Firebase config
function getSendcloudCredentials() {
  const apiKey = functions.config().sendcloud?.api_key;
  const apiSecret = functions.config().sendcloud?.api_secret;
  if (!apiKey || !apiSecret) {
    throw new Error('Sendcloud API key or secret not configured in Firebase.');
  }
  return { apiKey, apiSecret };
}

// Main function to get parcel rates from Sendcloud
export async function getSendcloudQuotes(data: any) {
  try {
    const { apiKey, apiSecret } = getSendcloudCredentials();
    const { origin, destination, weight } = data;

    // Parse the address strings into structured objects
    const fromAddress = parseAddress(origin);
    const toAddress = parseAddress(destination);

    console.log('[Sendcloud] Parsed addresses:', { fromAddress, toAddress });

    // Call Sendcloud API to get shipping options
    const response = await axios.post(
      'https://panel.sendcloud.sc/api/v2/shipping-methods',
      {
        from_country: fromAddress.country,
        from_postal_code: fromAddress.zip,
        to_country: toAddress.country,
        to_postal_code: toAddress.zip,
        weight: weight.toString(),
        weight_unit: 'kg',
      },
      {
        auth: {
          username: apiKey,
          password: apiSecret,
        },
        timeout: 10000,
      }
    );

    const quotes = response.data.shipping_methods.map((rate: any) => ({
      carrier: rate.carrier.code,
      service_name: rate.name,
      total_rate: parseFloat(rate.price.amount),
      currency: rate.price.currency,
      transit_time: rate.carrier.transit_time,
      source: 'live_carrier_api',
    }));

    return {
      success: true,
      quotes,
      source: 'live_carrier_api',
      message: `Live rates from ${quotes.length} carriers via Sendcloud API`,
    };
  } catch (error: any) {
    console.error('[Sendcloud] API call failed:', error.message);
    return getSendcloudFallbackRates(error.message);
  }
}

// Fallback function for Sendcloud
function getSendcloudFallbackRates(errorMessage: string) {
  console.log('[Sendcloud] Returning estimated rates as fallback');
  return {
    success: true,
    quotes: [
      {
        carrier: 'DPD',
        service_name: 'Standard (Estimated)',
        total_rate: 22,
        transit_time: '2-4 days',
        source: 'estimated_rates',
      },
      {
        carrier: 'DHL',
        service_name: 'Express (Estimated)',
        total_rate: 30,
        transit_time: '1-2 days',
        source: 'estimated_rates',
      },
    ],
    source: 'estimated_rates',
    message: `Sendcloud API unavailable: ${errorMessage}. Showing estimated rates.`,
  };
}
