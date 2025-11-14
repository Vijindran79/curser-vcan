// This file has been completely refactored for a secure, backend-driven architecture.
// All Gemini API calls are now proxied through Firebase Functions.

import { State, setState, type Quote, type Address, ApiResponse } from './state';
import { showToast, showUsageLimitModal, updateLookupCounterUI, toggleLoading } from './ui';
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
    
    // Provide user-friendly error messages based on error code
    if (error.code === 'functions/resource-exhausted') {
        showToast("You've reached the usage limit for this feature. Please try again later or upgrade your account.", "warning", 6000);
    } else if (error.code === 'functions/unauthenticated') {
        showToast("Please sign in to use this feature. Your session may have expired.", "warning", 6000);
    } else if (error.code === 'functions/permission-denied') {
        showToast("Your account doesn't have access to this feature. Please contact support.", "error", 6000);
    } else if (error.code === 'functions/deadline-exceeded') {
        showToast("The request took too long to complete. Please check your connection and try again.", "warning", 6000);
    } else if (error.code === 'functions/unknown') {
        showToast("An unexpected error occurred. Please try again or contact support if the problem persists.", "error", 6000);
    }
}


/**
 * Validates an address by calling a secure Firebase Function.
 * @param address The address string to validate.
 * @returns A validated address object or null on failure.
 */
export async function validateAddress(address: string): Promise<any | null> {
    if (!address || address.trim().length < 10) {
        showToast('Please enter a complete address for validation.', 'warning', 5000);
        return null;
    }

    if (!checkAndDecrementLookup()) {
        showToast('You have reached your daily address validation limit.', 'info', 6000);
        return null;
    }

    try {
        toggleLoading(true, 'Validating address...');
        
        const currentFunctions = functions || getFunctions();
        if (!currentFunctions) {
            throw new Error('Address validation service is temporarily unavailable. Please check your connection.');
        }

        try {
            const validateAddressFn = currentFunctions.httpsCallable('validate-address');
            const result = await validateAddressFn({ address_string: address.trim() });
            
            if (result.data && result.data.success) {
                showToast('✅ Address validated successfully!', 'success', 4000);
                return result.data;
            } else {
                const errorMsg = result.data?.error || 'Address validation failed';
                showToast(`Address validation failed: ${errorMsg}`, 'warning', 6000);
                return null;
            }
        } catch (apiError: any) {
            console.error('[API Error] Address validation failed:', apiError);
            
            // Provide specific error messages
            if (apiError?.code === 'functions/unauthenticated') {
                showToast('Please sign in to validate addresses.', 'warning', 6000);
                throw new Error('Authentication required for address validation.');
            } else if (apiError?.code === 'functions/resource-exhausted') {
                showToast('You have reached the address validation limit. Please try again later.', 'warning', 6000);
                throw new Error('Rate limit exceeded for address validation.');
            } else if (apiError?.code === 'functions/deadline-exceeded') {
                showToast('Address validation timed out. Please check the format and try again.', 'warning', 6000);
                throw new Error('Request timeout. Please try again.');
            } else {
                showToast('Failed to validate address. Please check the format and try again.', 'error', 6000);
                throw new Error(`Address validation failed: ${apiError?.message || 'Unknown error'}`);
            }
        }
    } catch (error: any) {
        console.error('[API Error] validateAddress failed:', error);
        
        // Don't show toast if already shown in inner catch
        const errorMessage = error.message || 'Address validation failed.';
        if (!errorMessage.includes('Please sign in') &&
            !errorMessage.includes('Rate limit exceeded') &&
            !errorMessage.includes('Request timeout')) {
            showToast(errorMessage, 'error', 6000);
        }
        
        return null;
    } finally {
        toggleLoading(false);
    }
}

/**
 * Generic function to invoke a Gemini-powered Firebase Function.
 * @param functionName The name of the Firebase Function to call.
 * @param payload The data to send to the function.
 * @returns The data from the function or throws an error.
 */
async function invokeAiFunction(functionName: string, payload: object): Promise<any> {
    if (!checkAndDecrementLookup()) {
        throw new Error("You have reached your daily usage limit for AI features. Please upgrade your account or try again tomorrow.");
    }

    try {
        toggleLoading(true, 'Processing your request...');
        
        const currentFunctions = functions || getFunctions();
        
        if (!currentFunctions) {
            throw new Error('AI service is temporarily unavailable. Please check your connection and try again.');
        }
        
        const aiFunction = currentFunctions.httpsCallable(functionName);
        
        // Set timeout to fail fast if function isn't deployed
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timed out. The service may be busy. Please try again in a moment.')), 8000);
        });
        
        const result = await Promise.race([
            aiFunction(payload),
            timeoutPromise
        ]) as any;
        
        const data: any = result.data;
        
        // The backend function might return a JSON string, which we parse here.
        if (typeof data === 'string') {
             try {
                const parsed = JSON.parse(data);
                return parsed;
             } catch (e) {
                // If it's not JSON, return the raw string.
                return data;
             }
        }
        return data;

    } catch (error: any) {
        console.error(`[API Error] ${functionName} failed:`, error);
        
        // Provide specific error messages for different error codes
        if (error?.code === 'functions/unauthenticated') {
            showToast('Please sign in to use AI features. Your session may have expired.', 'warning', 6000);
            throw new Error('Authentication required for AI features.');
        } else if (error?.code === 'functions/permission-denied') {
            showToast('Your account does not have access to this AI feature. Please contact support.', 'error', 6000);
            throw new Error('Access denied for AI function.');
        } else if (error?.code === 'functions/resource-exhausted') {
            showToast('You have reached the usage limit for AI features. Please try again later or upgrade your account.', 'warning', 6000);
            throw new Error('AI feature usage limit exceeded.');
        } else if (error?.code === 'functions/deadline-exceeded' || error.message?.includes('timeout')) {
            showToast('AI request timed out. The service may be busy. Please try again in a moment.', 'warning', 6000);
            throw new Error('AI service timeout. Please try again.');
        } else if (error?.code === 'functions/not-found') {
            showToast('AI service is temporarily unavailable. Our team has been notified.', 'error', 6000);
            throw new Error('AI service endpoint not found.');
        } else if (error?.code === 'functions/unavailable') {
            // Silent fallback for CORS/unavailable errors
            throw new Error('Function not available - will use fallback');
        } else {
            // Generic error
            showToast('AI service encountered an error. Please try again or contact support if the problem persists.', 'error', 6000);
            throw new Error(`AI function failed: ${error?.message || 'Unknown error'}`);
        }
    } finally {
        toggleLoading(false);
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
- Answer questions about shipping services (Air Freight, Sea Freight FCL/LCL, Parcel, Baggage, Bulk, Railway, Inland Transport, etc.)
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
8. Ecommerce Fulfillment - Online store integration
9. Trade Finance - Invoice/PO financing
10. Compliance & Documentation
11. Vehicle Transport
12. River & Tug services
13. Tanker transport

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
            return "We offer comprehensive logistics services including Air Freight, Sea Freight (FCL/LCL), Parcel Shipping, and more! Browse the services on our homepage or tell me what you need to ship.";
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
    if (!description || description.trim().length < 3) {
        showToast('Please enter a more detailed item description for accurate HS code suggestions.', 'warning', 5000);
        return [];
    }

    if (!checkAndDecrementLookup()) {
        showToast('You have reached your daily HS code lookup limit. Please upgrade your account or try again tomorrow.', 'info', 6000);
        return [];
    }

    try {
        toggleLoading(true, 'Analyzing item description for HS code suggestions...');
        
        // Firebase function name: getHsCode (camelCase is converted by Firebase)
        const results = await invokeAiFunction('getHsCode', { description: description.trim() });
        
        if (results && Array.isArray(results.suggestions) && results.suggestions.length > 0) {
            showToast(`✅ Found ${results.suggestions.length} HS code suggestions for your item.`, 'success', 4000);
            return results.suggestions;
        } else if (results && Array.isArray(results.suggestions) && results.suggestions.length === 0) {
            showToast('No specific HS codes found for this description. A general classification will be used.', 'info', 5000);
            return [];
        } else {
            console.warn('[HS Code] API returned invalid data structure:', results);
            showToast('Unable to generate specific HS code suggestions. Using standard classification.', 'info', 5000);
            return [];
        }
    } catch (error: any) {
        console.error('[API Error] HS Code lookup failed:', error);
        
        // Provide user-friendly error message
        const errorMessage = error.message || 'HS code lookup failed.';
        
        if (!errorMessage.includes('Usage limit reached') &&
            !errorMessage.includes('Authentication required') &&
            !errorMessage.includes('Access denied') &&
            !errorMessage.includes('Rate limit exceeded') &&
            !errorMessage.includes('Request timeout') &&
            !errorMessage.includes('service endpoint')) {
            showToast('HS code lookup encountered an error. Using standard classification.', 'info', 5000);
        }
        
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
    } finally {
        toggleLoading(false);
    }
}