import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getShippoQuotes } from './shippo';
import { getSendcloudQuotes } from './sendcloud';
import { getFCLRates, getLCLRates, getAirFreightRates } from './searates';

admin.initializeApp();

// Unified function to get parcel quotes from different providers
export const getParcelQuotes = functions.https.onCall(async (data: any, context) => {
  const { provider } = data;

  if (!provider) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required parameter: provider'
    );
  }

  switch (provider) {
    case 'shippo':
      return getShippoQuotes(data);
    case 'sendcloud':
      return getSendcloudQuotes(data);
    default:
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Unsupported provider: ${provider}`
      );
  }
});

// Unified function to get SeaRates quotes from different providers
export const getSeaRatesQuotes = functions.https.onCall(async (data: any, context) => {
    const { serviceType } = data;

    if (!serviceType) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing required parameter: serviceType'
        );
    }

    switch (serviceType) {
        case 'fcl':
            return getFCLRates(data, context);
        case 'lcl':
            return getLCLRates(data, context);
        case 'air':
            return getAirFreightRates(data, context);
        default:
            throw new functions.https.HttpsError(
                'invalid-argument',
                `Unsupported serviceType: ${serviceType}`
            );
    }
});


// Get HS Code suggestions
export const getHsCode = functions.https.onCall(async (request, context: any) => {
  try {
    const data = request.data as any;
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

// Health check endpoint
export const healthCheck = functions.https.onCall(async (data, context: any) => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
});

// Import and export Stripe functions
export { stripeWebhook, createSubscriptionCheckout, cancelSubscription } from './stripe';

// Land transport functions are temporarily removed for deployment
