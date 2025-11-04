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

// Production Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBSOfOv9zXBZNI_b0ZAUHmbP0cU8h5Xp_c",
  authDomain: "vcanship-onestop-logistics.firebaseapp.com",
  projectId: "vcanship-onestop-logistics",
  storageBucket: "vcanship-onestop-logistics.firebasestorage.app",
  messagingSenderId: "685756131515",
  appId: "1:685756131515:web:55eb447560c628f12da19e"
};

console.log('[FIREBASE DEBUG] Firebase config:', firebaseConfig);

// Geoapify API key for geolocation and map services
export const GEOAPIFY_API_KEY = "b0b098c3980140a9a8f6895c34f1bb29";
export const NVIDIA_API_KEY = "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";

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
    
    const functionsInstance = fb?.functions?.();
    console.log('[FIREBASE DEBUG] Functions instance:', functionsInstance ? 'Created' : 'Null');
    return functionsInstance;
}

// Export Firebase services with safety checks
// These will be null if Firebase isn't loaded yet, but will work once it is
export const auth = firebase?.auth?.() || null;
export const db = firebase?.firestore?.() || null;
// Fix: Don't pass region - functions() takes no args or app instance
export const functions = firebase?.functions?.() || null;
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