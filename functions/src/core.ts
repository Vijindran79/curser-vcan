// Simplified Firebase Functions - Core API functions only
// This file contains only the essential functions needed for the app

import * as functions from 'firebase-functions';

// ==========================================
// HS CODE SUGGESTIONS
// ==========================================

interface HSCodeRequest {
    description: string;
}

/**
 * Generates HS Code suggestions using keyword matching
 */
export const getHsCode = functions.https.onCall(async (request, context) => {
    try {
        const data = request.data as HSCodeRequest;
        const { description } = data;
        
        if (!description || description.trim().length < 3) {
            throw new functions.https.HttpsError('invalid-argument', 'Item description must be at least 3 characters');
        }
        
        const descriptionLower = description.toLowerCase();
        const suggestions: { code: string; description: string }[] = [];
        
        // Basic keyword matching for common items
        if (descriptionLower.includes('clothing') || descriptionLower.includes('garment') || descriptionLower.includes('apparel')) {
            suggestions.push({ code: '6203.42', description: 'Men\'s or boys\' trousers' });
            suggestions.push({ code: '6204.62', description: 'Women\'s or girls\' trousers' });
            suggestions.push({ code: '6109.10', description: 'Cotton t-shirts' });
        }
        
        if (descriptionLower.includes('electronic') || descriptionLower.includes('device') || descriptionLower.includes('phone')) {
            suggestions.push({ code: '8517.12', description: 'Telephone sets' });
            suggestions.push({ code: '8543.70', description: 'Electronic integrated circuits' });
        }
        
        if (descriptionLower.includes('cosmetic') || descriptionLower.includes('makeup') || descriptionLower.includes('perfume')) {
            suggestions.push({ code: '3303.00', description: 'Perfumes and toilet waters' });
            suggestions.push({ code: '3304.30', description: 'Beauty or make-up preparations' });
        }
        
        if (descriptionLower.includes('food') || descriptionLower.includes('beverage') || descriptionLower.includes('chocolate')) {
            suggestions.push({ code: '1806.32', description: 'Chocolate and other food preparations' });
            suggestions.push({ code: '2201.10', description: 'Waters, including natural or artificial mineral waters' });
        }
        
        // If no specific matches, return general category
        if (suggestions.length === 0) {
            suggestions.push({ code: '9999.99', description: 'General merchandise - please specify item type for accurate HS code' });
        }
        
        return {
            success: true,
            suggestions: suggestions.slice(0, 5)
        };
        
    } catch (error: any) {
        console.error('HS Code generation error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to generate HS code: ${error.message}`);
    }
});

// ==========================================
// SHIPPO QUOTES
// ==========================================

/**
 * Fetches real parcel quotes from Shippo API
 * Currently returns unavailable status to allow graceful fallback to AI
 */
export const getShippoQuotes = functions.https.onCall(async (request, context) => {
    try {
        // For now, return a message that backend integration is in progress
        // This prevents CORS errors and provides graceful degradation
        throw new functions.https.HttpsError(
            'unavailable',
            'Shippo API integration is currently being configured. Please use AI estimates for now.'
        );
        
        // TODO: Uncomment below when Shippo API key is properly configured
        /*
        const shippoApiKey = process.env.SHIPPO_API_KEY;
        
        if (!shippoApiKey) {
            throw new functions.https.HttpsError('failed-precondition', 'Shippo API key not configured.');
        }
        
        // ... rest of Shippo API implementation
        */
        
    } catch (error: any) {
        console.error('Shippo quotes error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to fetch quotes: ${error.message}`);
    }
});
