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
    if (!checkAndDecrementLookup()) {
        throw new Error("Usage limit reached.");
    }

    try {
        // FIX: Switched to v8 namespaced syntax for calling a Firebase Function.
        const currentFunctions = functions || getFunctions();
        if (!currentFunctions) {
            throw new Error('Firebase Functions not available');
        }
        
        const aiFunction = currentFunctions.httpsCallable(functionName);
        
        // Set timeout to fail fast if function isn't deployed
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Function timeout')), 5000);
        });
        
        const result = await Promise.race([
            aiFunction(payload),
            timeoutPromise
        ]) as any;
        
        const data: any = result.data;
        
        // The backend function might return a JSON string, which we parse here.
        if (typeof data === 'string') {
             try {
                return JSON.parse(data);
             } catch (e) {
                // If it's not JSON, return the raw string.
                return data;
             }
        }
        return data;

    } catch (error: any) {
        // Silently handle CORS/unavailable errors - fall back gracefully
        const isCorsError = error.code === 'functions/unavailable' || 
                           error.code === 'functions/not-found' ||
                           error.code === 'internal' ||
                           error.message?.includes('CORS') ||
                           error.message?.includes('network') ||
                           error.message?.includes('timeout');
        
        if (isCorsError) {
            // Silent fallback - don't throw, just return empty/fallback
            throw new Error('Function not available - will use AI fallback');
        }
        
        handleFirebaseError(error, `AI function ${functionName}`);
        throw error;
    }
}

/**
 * Gets a response from the chatbot via the backend.
 * @param message The user's current message.
 * @param history The conversation history.
 * @returns The chatbot's response text.
 */
export async function getChatbotResponse(message: string, history: { role: 'user' | 'model', text: string }[]): Promise<string> {
    try {
        // The backend function will likely expect the message and history for context.
        const response = await invokeAiFunction('get-chatbot-response', { message, history });
        
        // The backend should return a string directly. 
        // If it returns an object like { text: "..." }, this handles it.
        if (typeof response === 'string') {
            return response;
        }
        if (response && typeof response.text === 'string') {
            return response.text;
        }
        
        // Fallback if the response format is unexpected
        throw new Error("Invalid response format from chatbot API.");

    } catch (error) {
        // Errors are already handled by invokeAiFunction (which calls handleFirebaseError)
        // but we'll re-throw a user-friendly message for the UI to catch.
        console.error("getChatbotResponse failed:", error);
        throw new Error("Sorry, I'm having trouble connecting. Please try again later.");
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