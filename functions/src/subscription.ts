// Firebase Functions for Stripe Subscription Management

// Load environment variables
// import * as dotenv from 'dotenv';
// dotenv.config(); // Disabled - using Firebase Secrets instead

import { onCall, CallableRequest, HttpsError, onRequest, Request } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const db = admin.firestore();

// Initialize Stripe from environment variables (.env file - secure backend storage)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

/**
 * Create Stripe Checkout Session for subscription
 * Function name: create-subscription-checkout
 * IMPORTANT: No invoker setting means authenticated users only (Firebase handles auth automatically)
 */
export const createSubscriptionCheckout = onCall<{ priceId: string; plan: string; userEmail?: string }>(
    {
        memory: '256MiB'
        // No invoker setting = Firebase automatically enforces authentication
    },
    async (req: CallableRequest<{ priceId: string; plan: string; userEmail?: string }>) => {
        if (!req.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        // Runtime check for Stripe key from environment variables
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey || stripeKey === 'sk_test_placeholder') {
            throw new HttpsError('failed-precondition', 'Stripe is not configured. Please contact vg@vcanresources.com');
        }
        
        const { priceId, plan, userEmail } = req.data;
        const userId = req.auth.uid;

        try {
            // Create Stripe Checkout Session
            const session = await stripe.checkout.sessions.create({
                customer_email: userEmail || req.auth.token?.email,
                payment_method_types: ['card'],
                line_items: [{
                    price: priceId,
                    quantity: 1,
                }],
                mode: 'subscription',
                success_url: `${process.env.FRONTEND_URL || 'https://vcanship.com'}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL || 'https://vcanship.com'}/subscription`,
                metadata: {
                    userId: userId,
                    userEmail: userEmail || req.auth.token?.email || '',
                    plan: plan
                }
            });

            return {
                sessionId: session.id,
                url: session.url
            };
        } catch (error: any) {
            console.error('Stripe checkout error:', error);
            throw new HttpsError('internal', `Failed to create checkout session: ${error.message}`);
        }
    }
);

/**
 * Webhook handler for Stripe events
 * Function name: stripe-webhook
 */
export const stripeWebhook = onRequest(
    { memory: '256MiB' },
    async (req: Request, res: any) => {
        const sig = req.headers['stripe-signature'] as string;
        // Webhook secret will be set after you configure the webhook in Stripe Dashboard
        // You'll get this from: Stripe Dashboard → Developers → Webhooks → Your endpoint → Signing secret
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

        let event: Stripe.Event;

        // Get raw body for Stripe webhook verification
        // Firebase Functions provides rawBody automatically for onRequest handlers
        let rawBody: string | Buffer;

        if ((req as any).rawBody) {
            rawBody = (req as any).rawBody;
        } else if (Buffer.isBuffer(req.body)) {
            rawBody = req.body;
        } else {
            rawBody = JSON.stringify(req.body);
        }

        try {
            if (!sig) {
                console.error('Missing Stripe signature header');
                res.status(400).send('Missing Stripe signature header');
                return;
            }

            if (webhookSecret) {
                event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
            } else {
                // For testing without webhook secret, skip verification
                // WARNING: Only use this for development/testing
                console.warn('Webhook secret not configured. Signature verification skipped.');
                event = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString()) as Stripe.Event;
            }
        } catch (err: any) {
            console.error('Webhook signature verification failed:', err.message);
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }

        // Handle the event
        try {
            switch (event.type) {
                case 'checkout.session.completed':
                    const session = event.data.object as Stripe.Checkout.Session;
                    await handleSubscriptionCreated(session);
                    break;

                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                    const subscription = event.data.object as Stripe.Subscription;
                    await handleSubscriptionUpdated(subscription);
                    break;

                case 'customer.subscription.deleted':
                    const deletedSubscription = event.data.object as Stripe.Subscription;
                    await handleSubscriptionDeleted(deletedSubscription);
                    break;

                case 'invoice.payment_succeeded':
                    const invoice = event.data.object as Stripe.Invoice;
                    await handlePaymentSucceeded(invoice);
                    break;

                case 'invoice.payment_failed':
                    const failedInvoice = event.data.object as Stripe.Invoice;
                    await handlePaymentFailed(failedInvoice);
                    break;

                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }

            res.json({ received: true });
        } catch (error: any) {
            console.error('Unexpected error in webhook handler:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(session: Stripe.Checkout.Session) {
    const userEmail = session.metadata?.userEmail || session.customer_email;

    if (!userEmail) {
        console.error('No user email in session metadata');
        return;
    }

    // Get subscription details
    // session.subscription can be a string (subscription ID) or a Subscription object
    const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
        console.error('No subscription ID in checkout session');
        return;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Calculate expiry date
    const expiryDate = new Date(subscription.current_period_end * 1000);

    // Update user document in Firestore
    await db.collection('users').doc(userEmail).set({
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscriptionId,
        subscriptionExpiry: admin.firestore.Timestamp.fromDate(expiryDate),
        subscriptionPlan: session.metadata?.plan || 'monthly',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`Subscription created for user: ${userEmail}`);
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const userEmail = customer.email;

    if (!userEmail) {
        console.error('No email found for customer:', customerId);
        return;
    }

    const expiryDate = new Date(subscription.current_period_end * 1000);

    await db.collection('users').doc(userEmail).update({
        subscriptionStatus: subscription.status,
        stripeSubscriptionId: subscription.id,
        subscriptionExpiry: admin.firestore.Timestamp.fromDate(expiryDate),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
}

/**
 * Handle subscription deleted (cancelled)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const userEmail = customer.email;

    if (!userEmail) {
        console.error('No email found for customer:', customerId);
        return;
    }

    await db.collection('users').doc(userEmail).update({
        subscriptionTier: 'free',
        subscriptionStatus: 'cancelled',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
}

/**
 * Handle payment succeeded
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const userEmail = customer.email;

    if (!userEmail) {
        return;
    }

    // Subscription is confirmed active
    await db.collection('users').doc(userEmail).update({
        subscriptionStatus: 'active',
        lastPaymentDate: admin.firestore.FieldValue.serverTimestamp()
    });
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const userEmail = customer.email;

    if (!userEmail) {
        return;
    }

    // Mark subscription as past due
    await db.collection('users').doc(userEmail).update({
        subscriptionStatus: 'past_due',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
}

/**
 * Cancel subscription
 * Function name: cancel-subscription
 * IMPORTANT: No invoker setting means authenticated users only (Firebase handles auth automatically)
 */
export const cancelSubscription = onCall(
    {
        memory: '256MiB'
        // No invoker setting = Firebase automatically enforces authentication
    },
    async (req: CallableRequest<void>) => {
        if (!req.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userEmail = req.auth.token?.email;
        if (!userEmail) {
            throw new HttpsError('failed-precondition', 'User email not found');
        }

        try {
            // Get user's subscription ID
            const userDoc = await db.collection('users').doc(userEmail).get();
            if (!userDoc.exists) {
                throw new HttpsError('not-found', 'User not found');
            }

            const userData = userDoc.data();
            const subscriptionId = userData?.stripeSubscriptionId;

            if (!subscriptionId) {
                throw new HttpsError('failed-precondition', 'No active subscription found');
            }

            // Cancel subscription in Stripe (at period end)
            await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true
            });

            return {
                success: true,
                message: 'Subscription will be cancelled at the end of the billing period'
            };
        } catch (error: any) {
            console.error('Cancel subscription error:', error);
            throw new HttpsError('internal', `Failed to cancel subscription: ${error.message}`);
        }
    }
);
