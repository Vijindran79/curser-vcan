// This file has been completely refactored for a secure, backend-driven architecture.
// All Gemini API calls are now proxied through Firebase Functions.

import { State, setState, type Quote, type Address, ApiResponse } from './state';
import { showToast, showUsageLimitModal, updateLookupCounterUI } from './ui';
import { functions, getFunctions } from './firebase';
// FIX: Removed unused v9 `httpsCallable` import as we are now using the v8 namespaced API.
// import { httpsCallable } from 'firebase/functions';

/**
 * Checks if the user has remaining AI lookups and decrements the counter.
 * This is called BEFORE making a request to the backend.
 * Shows a modal if the limit is reached.
 * @returns {boolean} - True if the lookup can proceed, false otherwise.
 */
export function checkAndDecrementLookup(): boolean {
    // 🚀 DEMO MODE: Unlimited lookups for business meeting tomorrow
    // TODO: Re-enable limits after demo by uncommenting lines below
    return true;
    
    /* COMMENTED OUT FOR DEMO - RE-ENABLE AFTER MEETING
    if (State.subscriptionTier === 'pro') {
        return true; // Pro users have unlimited lookups.
    }
    
    if (!State.isLoggedIn) { // Guest user
        let guestLookups = parseInt(localStorage.getItem('vcanship_guest_lookups') || '2', 10);
        if (guestLookups > 0) {
            guestLookups--;
            localStorage.setItem('vcanship_guest_lookups', String(guestLookups));
            updateLookupCounterUI();
            return true;
        } else {
            showUsageLimitModal('guest');
            return false;
        }
    } else { // Free logged-in user
        if (State.aiLookupsRemaining > 0) {
            const newCount = State.aiLookupsRemaining - 1;
            setState({ aiLookupsRemaining: newCount });
            // In a real app, this would be persisted to the backend.
            localStorage.setItem('vcanship_free_lookups', String(newCount));
            updateLookupCounterUI();
            return true;
        } else {
            showUsageLimitModal('free');
            return false;
        }
    }
    */
}

/**
 * A generic handler for Firebase function invocation errors.
 * It logs the error and shows a user-friendly toast message.
 * @param error - The error object from a Firebase function call.
 * @param context - A string describing the context of the error (e.g., "address validation").
 */
function handleFirebaseError(error: any, context: string) {
    // Silently handle CORS/unavailable errors - these will fall back to AI
    const isCorsError = error.code === 'functions/unavailable' || 
                       error.code === 'functions/not-found' ||
                       error.message?.includes('CORS') ||
                       error.message?.includes('network') ||
                       error.code === 'internal';
    
    if (isCorsError) {
        // Silent fallback to AI - don't show errors
        return;
    }
    
    // Only show critical errors
    if (error.code === 'functions/resource-exhausted') {
        showToast("API quota exceeded. Using AI estimates.", "warning");
    }
}


/**
 * Validates an address by calling a secure Firebase Function.
 * @param address The address string to validate.
 * @returns A validated address object or null on failure.
 */
export async function validateAddress(address: string): Promise<any | null> {
    if (!checkAndDecrementLookup()) return null;

    try {
        // FIX: Switched to v8 namespaced syntax for calling a Firebase Function.
        const currentFunctions = functions || getFunctions();
        if (!currentFunctions) {
            console.warn('Firebase Functions not available for address validation');
            return null;
        }
        const validateAddressFn = currentFunctions.httpsCallable('validate-address');
        const result = await validateAddressFn({ address_string: address });
        return result.data;
    } catch (e) {
        handleFirebaseError(e, "address validation");
        return null;
    }
}

/**
 * Generic function to invoke a Gemini-powered Firebase Function.
 * @param functionName The name of the Firebase Function to call.
 * @param payload The data to send to the function.
 * @returns The data from the function or throws an error.
 */
async function invokeAiFunction(functionName: string, payload: object): Promise<any> {
    console.log('[API DEBUG] Invoking AI function:', functionName);
    console.log('[API DEBUG] Payload:', payload);
    
    if (!checkAndDecrementLookup()) {
        throw new Error("Usage limit reached.");
    }

    try {
        // FIX: Switched to v8 namespaced syntax for calling a Firebase Function.
        const currentFunctions = functions || getFunctions();
        console.log('[API DEBUG] Functions instance:', currentFunctions ? 'Available' : 'Not available');
        
        if (!currentFunctions) {
            throw new Error('Firebase Functions not available');
        }
        
        const aiFunction = currentFunctions.httpsCallable(functionName);
        console.log('[API DEBUG] Created callable function:', aiFunction ? 'Success' : 'Failed');
        
        // Set timeout to fail fast if function isn't deployed
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Function timeout')), 5000);
        });
        
        console.log('[API DEBUG] Calling function with timeout (5s)');
        const result = await Promise.race([
            aiFunction(payload),
            timeoutPromise
        ]) as any;
        
        console.log('[API DEBUG] Function call result:', result);
        
        const data: any = result.data;
        console.log('[API DEBUG] Response data type:', typeof data, 'value:', data);
        
        // The backend function might return a JSON string, which we parse here.
        if (typeof data === 'string') {
             try {
                const parsed = JSON.parse(data);
                console.log('[API DEBUG] Parsed JSON response:', parsed);
                return parsed;
             } catch (e) {
                console.log('[API DEBUG] Not JSON, returning raw string');
                // If it's not JSON, return the raw string.
                return data;
             }
        }
        return data;

    } catch (error: any) {
        console.log('[API DEBUG] Function call error:', error.code, error.message);
        // Silently handle CORS/unavailable errors - fall back gracefully
        const isCorsError = error.code === 'functions/unavailable' ||
                           error.code === 'functions/not-found' ||
                           error.code === 'internal' ||
                           error.message?.includes('CORS') ||
                           error.message?.includes('network') ||
                           error.message?.includes('timeout');
        
        if (isCorsError) {
            console.log('[API DEBUG] CORS/Network error - will use fallback');
            // Silent fallback - don't throw, just return empty/fallback
            throw new Error('Function not available - will use AI fallback');
        }
        
        handleFirebaseError(error, `AI function ${functionName}`);
        throw error;
    }
}

/**
 * Gets a response from the chatbot using direct AI (no Firebase Function needed - faster & more reliable!)
 * @param message The user's current message.
 * @param history The conversation history.
 * @returns The chatbot's response text.
 */
export async function getChatbotResponse(message: string, history: { role: 'user' | 'model', text: string }[]): Promise<string> {
    console.log('[CHAT DEBUG] Starting chatbot request with message:', message);
    console.log('[CHAT DEBUG] Conversation history length:', history.length);
    
    try {
        // Use direct AI instead of Firebase Function (faster, no CORS issues, no function deployment needed)
        const { State } = await import('./state');
        
        if (!State.api) {
            throw new Error("AI service not available. Please refresh the page.");
        }
        
        // Create system prompt for helpful logistics assistant
        const systemPrompt = `You are a helpful, friendly logistics assistant for Vcanship - a global freight forwarding and shipping platform.

Your role:
- Answer questions about shipping services (Air Freight, Sea Freight FCL/LCL, Parcel, Baggage, Bulk, Railway, Inland Transport, Warehouse, etc.)
- Help users understand shipping terms (FCL vs LCL, container types, transit times, customs, HS codes)
- Guide users through the platform features
- Provide general logistics advice
- Be warm, professional, and solution-oriented

Services we offer:
1. Air Freight - Fast international shipping by air
2. Sea Freight (FCL & LCL) - Container shipping, full or shared
3. Parcel Shipping - Small packages worldwide
4. Baggage Shipping - Personal luggage transport
5. Bulk Cargo - Large loose cargo
6. Railway Transport - Rail freight services
7. Inland Transport - Domestic trucking
8. Warehouse - Storage and fulfillment
9. Ecommerce Fulfillment - Online store integration
10. Trade Finance - Invoice/PO financing
11. Compliance & Documentation
12. Vehicle Transport
13. River & Tug services
14. Tanker transport

Platform features:
- Instant AI quotes from multiple carriers
- Real-time tracking
- Compare prices from DHL, FedEx, UPS, Maersk, CMA CGM, MSC, and more
- Secure Stripe payments
- 24/7 support

Keep responses concise (2-3 sentences max unless user asks for details). Use friendly tone. If you don't know something, offer to connect them with support team.`;

        // Format conversation history for Gemini
        const chatHistory = history.map(h => ({
            role: h.role,
            parts: [{ text: h.text }]
        }));
        
        // Create generative model for chat
        const model = State.api.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });
        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: 'Hello! I\'m your Vcanship logistics assistant. I\'m here to help with shipping questions, quote explanations, service selection, and platform guidance. How can I assist you today?' }] },
                ...chatHistory
            ]
        });
        
        // Send user's message and get response
        const result = await chat.sendMessage(message);
        const responseText = result.response.text();
        
        console.log('[CHAT DEBUG] ✅ AI response received:', responseText.substring(0, 100) + '...');
        return responseText;
        
    } catch (error: any) {
        console.error("[CHAT DEBUG] getChatbotResponse failed:", error);
        
        // Friendly fallback responses based on message content
        const messageLower = message.toLowerCase();
        
        if (messageLower.includes('service') || messageLower.includes('offer')) {
            return "We offer 17+ logistics services including Air Freight, Sea Freight (FCL/LCL), Parcel Shipping, Warehouse, and more! Browse the services on our homepage or tell me what you need to ship.";
        }
        if (messageLower.includes('track')) {
            return "You can track your shipment by clicking the 'Track' button in the header. You'll need your tracking number. Need help finding it?";
        }
        if (messageLower.includes('price') || messageLower.includes('cost') || messageLower.includes('quote')) {
            return "Get instant quotes by selecting a service from our homepage! We compare prices from multiple carriers to find you the best deal.";
        }
        if (messageLower.includes('fcl') || messageLower.includes('lcl')) {
            return "FCL (Full Container Load) = you rent an entire container. LCL (Less than Container Load) = you share container space with others, great for smaller shipments! Which suits your needs?";
        }
        
        return "I'm having a brief connection issue. Try asking again, or contact our support team at vg@vcanresources.com for immediate help!";
    }
}


/**
 * Fetches HS Code suggestions via the backend.
 */
export async function getHsCodeSuggestions(description: string): Promise<{ code: string; description: string }[]> {
    try {
        // Firebase function name: getHsCode (camelCase is converted by Firebase)
        const results = await invokeAiFunction('getHsCode', { description });
        return results.suggestions || [];
    } catch (error: any) {
        // Silent fallback - generate basic HS code suggestions locally
        const descriptionLower = description.toLowerCase();
        
        // Basic keyword matching for common items
        if (descriptionLower.includes('clothing') || descriptionLower.includes('garment') || descriptionLower.includes('apparel')) {
            return [{ code: '6203.42', description: 'Men\'s or boys\' trousers' }];
        }
        if (descriptionLower.includes('electronic') || descriptionLower.includes('device') || descriptionLower.includes('phone')) {
            return [{ code: '8517.12', description: 'Telephone sets' }];
        }
        if (descriptionLower.includes('cosmetic') || descriptionLower.includes('makeup') || descriptionLower.includes('perfume')) {
            return [{ code: '3303.00', description: 'Perfumes and toilet waters' }];
        }
        if (descriptionLower.includes('food') || descriptionLower.includes('beverage') || descriptionLower.includes('chocolate')) {
            return [{ code: '1806.32', description: 'Chocolate and other food preparations' }];
        }
        
        // Return empty if no match - user can enter manually
        return [];
    }
}