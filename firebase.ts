// firebase.ts
// FIX: Use side-effect imports and the global `window.firebase` object.
// The Firebase v9 compatibility scripts are packaged as UMD modules. When loaded via importmap,
// they don't expose a standard ES module interface, leading to a loop of import errors.
// This approach executes the scripts, which then correctly attach to the global `window.firebase` object,
// resolving the `Cannot read properties of undefined` errors reliably.

// Note: Firebase scripts are now loaded directly via script tags in index.html
// These imports are kept for type safety but may not execute if scripts already loaded
// We primarily check window.firebase which is set by the script tags
// import "firebase/compat/app";
// import "firebase/compat/auth";
// import "firebase/compat/firestore";
// import "firebase/compat/functions";
// import "firebase/compat/storage";
import { v4 as uuidv4 } from 'uuid';
import { State } from './state';

// Add a type declaration for the global firebase object to satisfy TypeScript
declare global {
  interface Window {
    firebase: any;
  }
}

// Vite environment variables type declaration
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_GEOAPIFY_API_KEY: string;
  readonly VITE_NVIDIA_API_KEY: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Production Firebase configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "REPLACE_WITH_NEW_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "vcanship-onestop-logistics.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "vcanship-onestop-logistics",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "vcanship-onestop-logistics.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "685756131515",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:685756131515:web:55eb447560c628f12da19e",
  measurementId: "G-ESVXH80BP1" // Google Analytics Measurement ID
};

console.log('[FIREBASE DEBUG] Firebase config loaded from environment');

// Geoapify API key for geolocation and map services
export const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || "REPLACE_WITH_NEW_KEY";
export const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY || "REPLACE_WITH_NEW_KEY";

// Wait for Firebase to be available on window object
// Firebase scripts are loaded via importmap and may not be immediately available
function getFirebase(): any {
    if (typeof window !== 'undefined' && window.firebase) {
        return window.firebase;
    }
    return null;
}

// Initialize Firebase when available
function initializeFirebaseIfReady(): any {
    console.log('[FIREBASE DEBUG] Attempting to initialize Firebase');
    const firebase = getFirebase();
    console.log('[FIREBASE DEBUG] Firebase from getFirebase():', firebase ? 'Available' : 'Null');
    
    if (firebase) {
        try {
            // Check if already initialized
            console.log('[FIREBASE DEBUG] Firebase apps array:', firebase.apps);
            if (!firebase.apps || firebase.apps.length === 0) {
                console.log('[FIREBASE DEBUG] Initializing new Firebase app');
                const app = firebase.initializeApp(firebaseConfig);
                console.log('[FIREBASE DEBUG] Firebase initialized successfully with project:', firebaseConfig.projectId);
                
                // ✅ Initialize Google Analytics
                if (firebase.analytics && typeof firebase.analytics === 'function') {
                    try {
                        const analytics = firebase.analytics();
                        console.log('[FIREBASE DEBUG] ✅ Google Analytics initialized successfully');
                    } catch (analyticsError) {
                        console.warn('[FIREBASE DEBUG] Analytics initialization failed:', analyticsError);
                    }
                }
                
                return firebase;
            } else {
                // Return existing app
                const existingApp = firebase.apps[0];
                console.log('[FIREBASE DEBUG] Firebase already initialized with project:', existingApp.options?.projectId || firebaseConfig.projectId);
                return firebase;
            }
        } catch (error: any) {
            // If already initialized, that's fine
            if (error.code === 'app/duplicate-app') {
                console.log('[FIREBASE DEBUG] Firebase already initialized (duplicate app error)');
                return firebase;
            }
            console.error('[FIREBASE DEBUG] Firebase initialization error:', error);
            console.error('[FIREBASE DEBUG] Firebase config used:', { projectId: firebaseConfig.projectId, authDomain: firebaseConfig.authDomain });
            console.error('[FIREBASE DEBUG] Error code:', error.code);
            console.error('[FIREBASE DEBUG] Error message:', error.message);
        }
    } else {
        console.warn('[FIREBASE DEBUG] Firebase not available for initialization');
    }
    return firebase;
}

// Wait for window to be available and Firebase scripts to load
// The side-effect imports execute asynchronously, so we need to poll for availability
let firebase: any = null;

// Function to wait for Firebase to be available
function waitForFirebase(callback: (fb: any) => void, maxRetries = 20, retryInterval = 300) {
    let retryCount = 0;
    
    const checkFirebase = () => {
        if (typeof window !== 'undefined' && window.firebase) {
            callback(window.firebase);
        } else if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(checkFirebase, retryInterval);
        } else {
            console.warn('Firebase failed to load after waiting', maxRetries * retryInterval, 'ms');
            callback(null);
        }
    };
    
    // Start checking immediately
    checkFirebase();
}

// Initialize Firebase - scripts are loaded via script tags in HTML before this module
// They should be available immediately since script tags load synchronously
if (typeof window !== 'undefined') {
    // Check immediately - scripts load synchronously before modules
    firebase = initializeFirebaseIfReady();
    
    // If still not available (shouldn't happen with script tags), wait briefly
    if (!firebase) {
        waitForFirebase((fb) => {
            if (fb) {
                firebase = fb;
                initializeFirebaseIfReady(); // Initialize once available
            }
        }, 5, 100); // Wait up to 500ms max - scripts should already be loaded
    }
}

// Helper function to get auth instance (may retry if not ready)
// This is useful when Firebase loads after module import
export function getAuth() {
    console.log('[FIREBASE DEBUG] getAuth() called');
    
    // Check window.firebase directly in case it loaded after module initialization
    let fb = firebase;
    console.log('[FIREBASE DEBUG] Current firebase variable:', fb ? 'Set' : 'Null');
    
    if (!fb && typeof window !== 'undefined' && window.firebase) {
        console.log('[FIREBASE DEBUG] Found window.firebase, using it');
        fb = window.firebase;
        firebase = fb;
        initializeFirebaseIfReady();
    }
    
    if (!fb) {
        console.log('[FIREBASE DEBUG] No firebase found, trying to initialize');
        fb = initializeFirebaseIfReady();
        if (fb) {
            console.log('[FIREBASE DEBUG] Firebase initialized successfully');
            firebase = fb;
        } else {
            console.warn('[FIREBASE DEBUG] Failed to initialize Firebase');
        }
    }
    
    const authInstance = fb?.auth?.();
    console.log('[FIREBASE DEBUG] Auth instance:', authInstance ? 'Created' : 'Null');
    return authInstance;
}

// Helper function to get functions instance (may retry if not ready)
export function getFunctions() {
    console.log('[FIREBASE DEBUG] getFunctions() called');
    
    // Check window.firebase directly in case it loaded after module initialization
    let fb = firebase;
    console.log('[FIREBASE DEBUG] Current firebase variable:', fb ? 'Set' : 'Null');
    
    if (!fb && typeof window !== 'undefined' && window.firebase) {
        console.log('[FIREBASE DEBUG] Found window.firebase, using it');
        fb = window.firebase;
        firebase = fb;
        initializeFirebaseIfReady();
    }
    
    if (!fb) {
        console.log('[FIREBASE DEBUG] No firebase found, trying to initialize');
        fb = initializeFirebaseIfReady();
        if (fb) {
            console.log('[FIREBASE DEBUG] Firebase initialized successfully');
            firebase = fb;
        } else {
            console.warn('[FIREBASE DEBUG] Failed to initialize Firebase');
        }
    }
    
    // Create functions instance with explicit region to avoid CORS issues on custom domains
    const functionsInstance = fb?.functions?.('us-central1');
    console.log('[FIREBASE DEBUG] Functions instance:', functionsInstance ? 'Created for region us-central1' : 'Null');
    return functionsInstance;
}

// Export Firebase services with safety checks
// These will be null if Firebase isn't loaded yet, but will work once it is
export const auth = firebase?.auth?.() || null;
export const db = firebase?.firestore?.() || null;

// Initialize functions with us-central1 region for callable functions (v2)
// CRITICAL: Firebase compat library REQUIRES the app instance to get functions
let functionsInstance: any = null;
if (firebase?.functions) {
    try {
        // Get the default Firebase app first
        const app = firebase.app();
        console.log('[FIREBASE] App instance:', app ? 'Available' : 'Null');
        
        // Get functions instance from the app (compat library method)
        functionsInstance = app.functions('us-central1');
        console.log('[FIREBASE] Functions instance created for region us-central1');
        
        // Verify httpsCallable is available
        if (functionsInstance && typeof functionsInstance.httpsCallable === 'function') {
            console.log('[FIREBASE] httpsCallable method is available');
        } else {
            console.error('[FIREBASE] httpsCallable method NOT available!');
        }
    } catch (error) {
        console.error('[FIREBASE] Error initializing functions:', error);
    }
}
export const functions = functionsInstance;

export const storage = firebase?.storage?.() || null;
export const GoogleAuthProvider = firebase?.auth?.GoogleAuthProvider || null;
export const AppleAuthProvider = firebase?.auth?.OAuthProvider || null;


// FIX: Implement and export the `logShipment` function to save shipment data to Firestore.
export async function logShipment(shipmentData: {
    service: string;
    tracking_id: string;
    origin: string;
    destination: string;
    cost: number;
    currency: string;
}) {
    try {
        if (!db) {
            console.error("Firestore is not initialized.");
            return;
        }
        await db.collection('shipments').add({
            ...shipmentData,
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            user_email: State.currentUser?.email || 'unknown',
            user_name: State.currentUser?.name || 'unknown'
        });
    } catch (error) {
        console.error("Error logging shipment to Firestore:", error);
        // This is a non-critical background task, so we don't show a UI error.
    }
}