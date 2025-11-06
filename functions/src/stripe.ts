import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Stripe with proper typing
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16'
});

// Initialize Firestore
const db = admin.firestore();

// Type definitions
interface SubscriptionData {
    priceId: string;
    plan: 'monthly' | 'yearly';
}

export const stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
        const event = stripe.webhooks.constructEvent(
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
        const session = await stripe.checkout.sessions.create({
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

        await stripe.subscriptions.cancel(userData.subscription.id);

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