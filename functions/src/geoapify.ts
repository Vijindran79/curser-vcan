// Geoapify API Integration for Geocoding and Autocomplete
// Uses Google Geoapify API keys provided

import * as functions from 'firebase-functions';

const GEOAPIFY_API_KEY = functions.config().geoapify?.api_key || process.env.GEOAPIFY_API_KEY || 'b0b098c3980140a9a8f6895c34f1bb29';
const GEOAPIFY_BASE_URL = 'https://api.geoapify.com/v1';

/**
 * Geocode address using Geoapify
 */
export async function geocodeAddress(address: string): Promise<any> {
    try {
        const response = await fetch(`${GEOAPIFY_BASE_URL}/geocode/search?text=${encodeURIComponent(address)}&apiKey=${GEOAPIFY_API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`Geoapify geocoding error: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Geoapify geocoding error:', error);
        throw error;
    }
}

/**
 * Autocomplete address using Geoapify
 */
export async function autocompleteAddress(query: string): Promise<any[]> {
    try {
        const response = await fetch(`${GEOAPIFY_BASE_URL}/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_API_KEY}&limit=5`);
        
        if (!response.ok) {
            throw new Error(`Geoapify autocomplete error: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.features || [];
    } catch (error) {
        console.error('Geoapify autocomplete error:', error);
        throw error;
    }
}

/**
 * Get static map image using Geoapify
 */
export function getStaticMapUrl(lat: number, lon: number, zoom: number = 14): string {
    return `${GEOAPIFY_BASE_URL}/staticmap?center=lonlat:${lon},${lat}&zoom=${zoom}&apiKey=${GEOAPIFY_API_KEY}&width=600&height=400`;
}





