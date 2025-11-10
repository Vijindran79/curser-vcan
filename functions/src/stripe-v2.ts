import * as functions from 'firebase-functions';
import { onRequest, onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Lazy-load Stripe to avoid initialization timeouts
let stripe: Stripe | null = null;

function getStripeClient(): Stripe {
    if (!stripe) {
        const apiKey = process.env.STRIPE_SECRET_KEY;
        if (!apiKey) {
            throw new Error('STRIPE_SECRET_KEY not configured');
        }
        stripe = new Stripe(apiKey, {
            apiVersion: '2023-10-16'
        });
    }
    return stripe;
}

// Initialize Firestore
const db = admin.firestore();

// Type definitions
interface SubscriptionData {
    priceId: string;
    plan: 'monthly' | 'yearly';
}

interface PaymentIntentData {
    amount: number;
    currency: string;
    description?: string;
}

export const stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
        const stripeClient = getStripeClient();
        const event = stripeClient.webhooks.constructEvent(
            req.rawBody,
            sig,
            webhookSecret!
        );

        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.customer && session.subscription) {
                    await db.collection('users').doc(session.client_reference_id!).update({
                        subscription: {
                            id: session.subscription,
                            status: 'active',
                            customerId: session.customer,
                            plan: session.metadata?.plan || 'monthly',
                            startDate: admin.firestore.Timestamp.fromDate(new Date()),
                            endDate: admin.firestore.Timestamp.fromDate(
                                new Date(Date.now() + (session.metadata?.plan === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)
                            )
                        }
                    });
                }
                break;

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                const subscription = event.data.object as Stripe.Subscription;
                const snapshot = await db.collection('users')
                    .where('subscription.id', '==', subscription.id)
                    .limit(1)
                    .get();

                if (!snapshot.empty) {
                    await snapshot.docs[0].ref.update({
                        'subscription.status': subscription.status,
                        'subscription.endDate': admin.firestore.Timestamp.fromDate(
                            new Date(subscription.current_period_end * 1000)
                        )
                    });
                }
                break;
        }

        res.json({ received: true });
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
});

export const createSubscriptionCheckout = functions.https.onCall(async (request: functions.https.CallableRequest<SubscriptionData>) => {
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { priceId, plan } = request.data;
    
    try {
        const stripeClient = getStripeClient();
        const session = await stripeClient.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            client_reference_id: request.auth.uid,
            customer_email: request.auth.token.email || undefined,
            line_items: [{
                price: priceId,
                quantity: 1,
            }],
            success_url: `${process.env.WEBAPP_URL}/#/dashboard?subscription=success`,
            cancel_url: `${process.env.WEBAPP_URL}/#/subscription?canceled=true`,
            metadata: {
                plan
            }
        });

        return { sessionId: session.id };
    } catch (error) {
        console.error('Subscription creation error:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Unable to create subscription session'
        );
    }
});

export const cancelSubscription = functions.https.onCall(async (request: functions.https.CallableRequest<any>) => {
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    try {
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.data();

        if (!userData?.subscription?.id) {
            throw new Error('No active subscription found');
        }

        const stripeClient = getStripeClient();
        await stripeClient.subscriptions.cancel(userData.subscription.id);

        await userDoc.ref.update({
            'subscription.status': 'canceled'
        });

        return { success: true };
    } catch (error) {
        console.error('Subscription cancellation error:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Unable to cancel subscription'
        );
    }
});

// Create Payment Intent for shipment payments (v2 with CORS)
export const createPaymentIntent = onRequest({
    cors: true,
    maxInstances: 10
}, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { amount, currency, description } = req.body;

        // Validate input
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            res.status(400).json({ error: 'Invalid amount' });
            return;
        }

        if (!currency || typeof currency !== 'string') {
            res.status(400).json({ error: 'Invalid currency' });
            return;
        }

        console.log('[Payment Intent] Creating payment intent:', { amount, currency, description });

        // Create payment intent
        const stripeClient = getStripeClient();
        const paymentIntent = await stripeClient.paymentIntents.create({
            amount: Math.round(amount), // Ensure integer
            currency: currency.toLowerCase(),
            description: description || 'Vcanship Shipment',
            automatic_payment_methods: {
                enabled: true,
            },
        });

        console.log('[Payment Intent] Created successfully:', paymentIntent.id);

        res.status(200).json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error: any) {
        console.error('[Payment Intent] Error:', error);
        res.status(500).json({
            error: error.message || 'Failed to create payment intent'
        });
    }
});

// V2 Callable version with App Check enforcement
export const createPaymentIntentCallable = onCall<PaymentIntentData>(
    { 
        enforceAppCheck: true,  // Enables App Check enforcement at platform level
        cors: true
    },
    async (request: CallableRequest<PaymentIntentData>) => {
        console.log('[Payment Intent Callable V2] Function invoked');
        console.log('[Payment Intent Callable V2] App Check verified:', !!request.app);
        
        const { amount, currency, description } = request.data;

        // Validate input
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            console.error('[Payment Intent Callable V2] Invalid amount:', amount);
            throw new HttpsError('invalid-argument', 'Invalid amount');
        }

        if (!currency || typeof currency !== 'string') {
            console.error('[Payment Intent Callable V2] Invalid currency:', currency);
            throw new HttpsError('invalid-argument', 'Invalid currency');
        }

        console.log('[Payment Intent Callable V2] Creating payment intent:', { amount, currency, description });

        try {
            // Create payment intent
            const stripeClient = getStripeClient();
            const paymentIntent = await stripeClient.paymentIntents.create({
                amount: Math.round(amount),
                currency: currency.toLowerCase(),
                description: description || 'Vcanship Shipment',
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            console.log('[Payment Intent Callable V2] Created successfully:', paymentIntent.id);

            return {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id
            };
        } catch (error: any) {
            console.error('[Payment Intent Callable V2] Error:', error);
            console.error('[Payment Intent Callable V2] Error details:', {
                message: error.message,
                type: error.type,
                code: error.code
            });
            throw new HttpsError('internal', error.message || 'Failed to create payment intent');
        }
    }
);
