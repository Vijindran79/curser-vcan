import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();

/**
 * Phase 1: User Role & Subscription Management
 * 
 * This function triggers when a subscription document is updated in Firestore
 * by the Stripe Firebase Extension. It sets custom claims on the user's auth token
 * based on their subscription status.
 */

// API Usage limits by tier
const API_LIMITS = {
  free: 100,    // 100 calls per month
  pro: 1000,    // 1000 calls per month
  premium: 5000 // 5000 calls per month
};

// Set custom user claims based on subscription status
export const onSubscriptionUpdate = functions.firestore.document('customers/{userId}/subscriptions/{subId}')
  .onWrite(async (change, context) => {
    const subscription = change.after.data();
    const userId = context.params.userId;
    
    console.log(`[Subscription] Processing update for user: ${userId}`);
    
    try {
      // Determine user role based on subscription status
      let role = 'free'; // Default role
      
      if (subscription && subscription.status === 'active') {
        // Check the price ID to determine which tier
        const priceId = subscription.items?.[0]?.price?.id;
        
        if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
          role = 'pro';
          console.log(`[Subscription] User ${userId} upgraded to PRO tier`);
        } else if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
          role = 'premium';
          console.log(`[Subscription] User ${userId} upgraded to PREMIUM tier`);
        } else {
          console.log(`[Subscription] User ${userId} has active subscription with price: ${priceId}`);
        }
      } else if (subscription && subscription.status === 'canceled') {
        console.log(`[Subscription] User ${userId} subscription canceled, downgrading to FREE`);
      } else {
        console.log(`[Subscription] User ${userId} has no active subscription, role: FREE`);
      }
      
      // Set custom claims on the user's auth token
      await admin.auth().setCustomUserClaims(userId, { role });
      
      // Also update the user's document in Firestore for easy querying
      await admin.firestore().collection('users').doc(userId).set({
        subscriptionTier: role,
        subscriptionStatus: subscription?.status || 'none',
        lastSubscriptionUpdate: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log(`[Subscription] Successfully set role: ${role} for user: ${userId}`);
      
      return { success: true, role };
      
    } catch (error) {
      console.error(`[Subscription] Error updating claims for user ${userId}:`, error);
      throw error;
    }
  });

/**
 * Phase 2: API Usage Tracking & Throttling
 * 
 * This is the core of the subscription enforcement logic.
 * This proxy function is the ONLY way the frontend interacts with the SeaRates API.
 */

// Helper function to get the start of the current month
function getCurrentMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Helper function to check if we need to reset the monthly counter
function shouldResetCounter(lastReset: Date): boolean {
  const currentMonthStart = getCurrentMonthStart();
  return lastReset < currentMonthStart;
}

// Proxy function for SeaRates API with rate limiting
export const proxySeaRatesAPI = functions.https.onCall(async (data, context) => {
  console.log('[API Proxy] Request received');
  
  // 1. Authentication: Verify the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to access this API'
    );
  }
  
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email || 'anonymous';
  const userRole = (context.auth.token.role as string) || 'free';
  
  console.log(`[API Proxy] User: ${userEmail}, Role: ${userRole}, UID: ${userId}`);
  
  try {
    // 2. Check Role: Define limits based on the role
    const apiLimit = API_LIMITS[userRole as keyof typeof API_LIMITS] || API_LIMITS.free;
    console.log(`[API Proxy] User role: ${userRole}, API limit: ${apiLimit}`);
    
    // 3. Read & Reset Usage: Get the user's usage document
    const usageRef = admin.firestore().collection('apiUsage').doc(userId);
    const usageDoc = await usageRef.get();
    
    let currentCount = 0;
    let lastReset = getCurrentMonthStart();
    
    if (usageDoc.exists) {
      const usageData = usageDoc.data()!;
      currentCount = usageData.callCount || 0;
      lastReset = usageData.lastReset?.toDate() || getCurrentMonthStart();
      
      console.log(`[API Proxy] Current usage: ${currentCount}/${apiLimit}, Last reset: ${lastReset}`);
    } else {
      console.log(`[API Proxy] No usage document found, creating new one`);
    }
    
    // Check if we need to reset the monthly counter
    if (shouldResetCounter(lastReset)) {
      console.log(`[API Proxy] New month detected, resetting counter`);
      currentCount = 0;
      lastReset = getCurrentMonthStart();
    }
    
    // 4. Enforce Limit: Check if user has exceeded their limit
    if (currentCount >= apiLimit) {
      console.warn(`[API Proxy] API limit exceeded for user ${userId}: ${currentCount}/${apiLimit}`);
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `API call limit exceeded. You have used ${currentCount} of ${apiLimit} calls this month. Please upgrade your plan to continue.`
      );
    }
    
    // 5. If under limit: Increment count and make the API call
    const newCount = currentCount + 1;
    await usageRef.set({
      callCount: newCount,
      lastReset: admin.firestore.Timestamp.fromDate(lastReset),
      userId: userId,
      userRole: userRole
    }, { merge: true });
    
    console.log(`[API Proxy] Usage updated: ${newCount}/${apiLimit}`);
    
    // Get the SeaRates API key from environment variables
    const searatesApiKey = process.env.SEARATES_API_KEY;
    if (!searatesApiKey) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'SeaRates API key not configured'
      );
    }
    
    // Make the actual server-to-server call to SeaRates API
    const { endpoint, params } = data;
    console.log(`[API Proxy] Calling SeaRates API: ${endpoint}`);
    
    const response = await axios({
      method: 'GET',
      url: `https://www.searates.com/api${endpoint}`,
      params: {
        ...params,
        api_key: searatesApiKey
      },
      timeout: 30000
    });
    
    console.log(`[API Proxy] SeaRates API call successful`);
    
    // Return the data to the client along with usage info
    return {
      success: true,
      data: response.data,
      usage: {
        current: newCount,
        limit: apiLimit,
        remaining: apiLimit - newCount,
        resetDate: new Date(lastReset.getFullYear(), lastReset.getMonth() + 1, 1)
      }
    };
    
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    console.error(`[API Proxy] Error for user ${userId}:`, error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to process API request'
    );
  }
});

/**
 * Get current API usage for a user
 */
export const getApiUsage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  
  try {
    const usageRef = admin.firestore().collection('apiUsage').doc(userId);
    const usageDoc = await usageRef.get();
    
    if (!usageDoc.exists) {
      return {
        current: 0,
        limit: API_LIMITS.free,
        remaining: API_LIMITS.free,
        resetDate: getCurrentMonthStart()
      };
    }
    
    const usageData = usageDoc.data()!;
    const userRole = (context.auth.token.role as string) || 'free';
    const apiLimit = API_LIMITS[userRole as keyof typeof API_LIMITS] || API_LIMITS.free;
    
    return {
      current: usageData.callCount || 0,
      limit: apiLimit,
      remaining: apiLimit - (usageData.callCount || 0),
      resetDate: new Date(usageData.lastReset?.toDate() || getCurrentMonthStart())
    };
  } catch (error) {
    console.error(`[API Usage] Error for user ${userId}:`, error);
    throw new functions.https.HttpsError('internal', 'Failed to get API usage');
  }
});

/**
 * Create Stripe Checkout session for subscription
 */
export const createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email || '';
  const { priceId } = data;
  
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Get or create Stripe customer
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    
    let customerId = userData.stripeCustomerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          firebaseUid: userId
        }
      });
      customerId = customer.id;
      
      // Store customer ID
      await admin.firestore().collection('users').doc(userId).set({
        stripeCustomerId: customerId
      }, { merge: true });
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      metadata: {
        firebaseUid: userId
      }
    });
    
    return {
      success: true,
      sessionId: session.id
    };
  } catch (error) {
    console.error(`[Checkout] Error creating session for user ${userId}:`, error);
    throw new functions.https.HttpsError('internal', 'Failed to create checkout session');
  }
});

/**
 * Create Stripe Customer Portal session
 */
export const createPortalSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Get user's Stripe customer ID
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    
    if (!userData.stripeCustomerId) {
      throw new functions.https.HttpsError('failed-precondition', 'No Stripe customer found');
    }
    
    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard`
    });
    
    return {
      success: true,
      url: session.url
    };
  } catch (error) {
    console.error(`[Portal] Error creating portal session for user ${userId}:`, error);
    throw new functions.https.HttpsError('internal', 'Failed to create portal session');
  }
});
