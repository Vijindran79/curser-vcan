import { Request, Response } from 'express';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { Request, Response } from 'express';

// Initialize Firebase
admin.initializeApp();
const db = admin.firestore();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

// Price IDs from your Stripe Dashboard
const PRICE_IDS = {
  monthly: 'price_1SQGZWPyJngwy6BVs5l7MyOM', // $9.99/month
  yearly: 'price_1SQGdnPyJngwy6BVuvDoVkUC',  // $99/year
} as const;

/**
 * Create Stripe Checkout Session for subscription
 * Callable from frontend
 */
export const createStripeSubscription = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { plan, userEmail } = data;
  const userId = context.auth.uid;

  if (!plan || !['monthly', 'yearly'].includes(plan)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid plan selected');
  }

  try {
    // Get or create Stripe customer
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    let customerId = userData?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || userData?.email,
        metadata: { firebaseUid: userId },
      });
      customerId = customer.id;

      // Save customer ID
      await db.collection('users').doc(userId).update({
        stripeCustomerId: customerId,
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[plan],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'https://vcanship.com'}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://vcanship.com'}/subscription-cancelled`,
      metadata: {
        userId,
        plan,
        userEmail: userEmail || userData?.email || '',
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error: any) {
    console.error('Stripe session creation error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create subscription session');
  }
});

/**
 * Handle Stripe subscription webhook events
 * HTTP endpoint for Stripe to call
 */
export const stripeWebhook = functions.https.onRequest(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, plan } = session.metadata!;

        // Get subscription details
        const subscriptionData = await stripe.subscriptions.retrieve(session.subscription as string);

        // Update user document
        await db.collection('users').doc(userId).set({
          subscription: {
            status: 'active',
            plan: plan,
            subscriptionId: subscriptionData.id,
            customerId: session.customer,
            currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscriptionData.current_period_start * 1000),
            currentPeriodEnd: admin.firestore.Timestamp.fromMillis(subscriptionData.current_period_end * 1000), 
          },
        }, { merge: true });

        // Add to subscription history
        await db.collection('subscriptions').add({
          userId,
          plan,
          subscriptionId: subscriptionData.id,
          status: 'active',
          amount: subscriptionData.items.data[0].price.unit_amount,
          currency: subscriptionData.currency,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ Subscription activated for user ${userId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find user by Stripe customer ID
        const userSnapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).get();

        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          const subscription = invoice.subscription as string;

          await db.collection('users').doc(userDoc.id).update({
            'subscription.currentPeriodStart': admin.firestore.Timestamp.fromMillis(invoice.period_start * 1000),
            'subscription.currentPeriodEnd': admin.firestore.Timestamp.fromMillis(invoice.period_end * 1000),
          });

          console.log(`✅ Payment succeeded for subscription ${subscription}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const userSnapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).get();

        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];

          await db.collection('users').doc(userDoc.id).update({
            'subscription.status': 'canceled',
          });

          console.log(`❌ Subscription cancelled: ${subscription.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Cancel a user's subscription
 * Callable from frontend
 */
export const cancelSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = context.auth.uid;

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const subscriptionId = userDoc.data()?.subscription?.subscriptionId;

    if (!subscriptionId) {
      throw new functions.https.HttpsError('failed-precondition', 'No active subscription found');
    }

    // Cancel at period end (customer keeps access until billing cycle ends)
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    await db.collection('users').doc(userId).update({
      'subscription.cancelAtPeriodEnd': true,
    });

    return { success: true, message: 'Subscription will be cancelled at end of billing period' };
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to cancel subscription');
  }
});

/**
 * Get user's subscription status
 * Callable from frontend
 */
export const getSubscriptionStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = context.auth.uid;
  const userDoc = await db.collection('users').doc(userId).get();
  const subscription = userDoc.data()?.subscription;

  return {
    subscription: subscription || null,
    isPro: subscription?.status === 'active',
  };
});
