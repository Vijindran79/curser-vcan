import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Secure Trade Firestore schema (reference)
export interface SecureTrade {
	id: string;
	buyerId: string;
	sellerId: string;
	productDetails: {
		name: string;
		quantity: number;
		value: number; // USD
		description: string;
		photos: string[]; // URLs
	};
	escrow: {
		amount: number;
		status: 'pending' | 'funded' | 'released' | 'refunded';
		fundedAt: FirebaseFirestore.Timestamp | null;
		releasedAt: FirebaseFirestore.Timestamp | null;
	};
	verification: {
		status: 'waiting_delivery' | 'in_inspection' | 'approved' | 'rejected';
		warehouseLocation: string;
		inspectorId: string | null;
		inspectionReport: string | null; // PDF URL
		inspectionPhotos: string[];
		approvedAt: FirebaseFirestore.Timestamp | null;
	};
	shipping: {
		status: 'pending' | 'in_transit' | 'delivered';
		trackingNumber: string | null;
		carrier: string;
	};
	timeline: {
		buyerPaid: FirebaseFirestore.Timestamp | null;
		sellerDelivered: FirebaseFirestore.Timestamp | null;
		verified: FirebaseFirestore.Timestamp | null;
		shipped: FirebaseFirestore.Timestamp | null;
		sellerPaid: FirebaseFirestore.Timestamp | null;
	};
	status: 'draft' | 'active' | 'completed' | 'disputed' | 'cancelled';
	dispute: {
		isDisputed: boolean;
		reason: string | null;
		resolution: 'buyer' | 'seller' | 'split' | null;
	};
	createdAt?: FirebaseFirestore.Timestamp;
}

const db = admin.firestore();

let stripe: Stripe | null = null;
function getStripe(): Stripe {
	if (!stripe) {
		const key = process.env.STRIPE_SECRET_KEY;
		if (!key) {
			throw new Error('STRIPE_SECRET_KEY is not set');
		}
		stripe = new Stripe(key, { apiVersion: '2023-10-16' });
	}
	return stripe;
}

// Helper notifications (Fire-and-forget logging + Firestore notifications)
async function sendSellerDeliveryInstructions(tradeId: string) {
	try {
		await db.collection('notifications').add({
			type: 'seller_delivery_instructions',
			tradeId,
			createdAt: admin.firestore.FieldValue.serverTimestamp(),
			status: 'queued'
		});
	} catch (e) {
		console.warn('sendSellerDeliveryInstructions failed:', e);
	}
}
async function notifyBuyerInspectionStarted(tradeId: string) {
	try {
		await db.collection('notifications').add({
			type: 'buyer_inspection_started',
			tradeId,
			createdAt: admin.firestore.FieldValue.serverTimestamp(),
			status: 'queued'
		});
	} catch (e) {
		console.warn('notifyBuyerInspectionStarted failed:', e);
	}
}
async function notifyBuyerVerificationComplete(tradeId: string) {
	try {
		await db.collection('notifications').add({
			type: 'buyer_verification_complete',
			tradeId,
			createdAt: admin.firestore.FieldValue.serverTimestamp(),
			status: 'queued'
		});
	} catch (e) {
		console.warn('notifyBuyerVerificationComplete failed:', e);
	}
}

async function initiateRefund(tradeId: string, reason: string) {
	// In a production-grade system, we would:
	// 1) Look up the escrow PaymentIntent for the trade
	// 2) Perform stripe.refunds.create({ payment_intent: ... })
	// For now, mark Firestore state and create a refund request record.
	try {
		await db.collection('secureTrades').doc(tradeId).update({
			'escrow.status': 'refunded',
			status: 'cancelled'
		});
		await db.collection('refundRequests').add({
			tradeId,
			reason,
			createdAt: admin.firestore.FieldValue.serverTimestamp(),
			status: 'queued'
		});
	} catch (e) {
		console.warn('initiateRefund failed:', e);
	}
}

// STEP 1: Buyer initiates Secure Trade and gets client_secret to fund escrow
export const createSecureTrade = functions.https.onCall(async (data: any, context: any) => {
	if (!context?.auth) {
		throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
	}

	const { buyerId, sellerId, productDetails, amount } = (data || {}) as { buyerId: string; sellerId: string; productDetails: any; amount: number; };
	if (!buyerId || !sellerId || !productDetails || !amount || amount <= 0) {
		throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid required parameters');
	}

	// 1) Create Firestore trade document first to get tradeId
	const tradeRef = await db.collection('secureTrades').add({
		buyerId,
		sellerId,
		productDetails,
		escrow: {
			amount,
			status: 'pending',
			fundedAt: null,
			releasedAt: null
		},
		verification: {
			status: 'waiting_delivery',
			warehouseLocation: 'Vcanship Warehouse - Port of Rotterdam',
			inspectorId: null,
			inspectionReport: null,
			inspectionPhotos: [],
			approvedAt: null
		},
		shipping: {
			status: 'pending',
			trackingNumber: null,
			carrier: ''
		},
		timeline: {
			buyerPaid: null,
			sellerDelivered: null,
			verified: null,
			shipped: null,
			sellerPaid: null
		},
		status: 'draft',
		createdAt: admin.firestore.FieldValue.serverTimestamp()
	});

	const tradeId = tradeRef.id;

	// 2) Create Stripe PaymentIntent for escrow, with metadata including tradeId
	const pi = await getStripe().paymentIntents.create({
		amount: Math.round(Number(amount) * 100),
		currency: 'usd',
		metadata: {
			type: 'secure_trade_escrow',
			tradeId,
			buyerId,
			sellerId
		},
		automatic_payment_methods: { enabled: true }
	});

	return {
		tradeId,
		clientSecret: pi.client_secret,
		message: 'Escrow payment initiated. Complete payment to secure trade.'
	};
});

// STEP 2: Webhook to confirm escrow funded
export const secureTradeWebhook = functions.https.onRequest(async (req, res) => {
	const sig = req.headers['stripe-signature'] as string;
	const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

	if (!endpointSecret) {
		console.error('STRIPE_WEBHOOK_SECRET missing');
		res.status(500).send('Webhook not configured');
		return;
	}

	let event: Stripe.Event;
	try {
		event = getStripe().webhooks.constructEvent((req as any).rawBody || req.body, sig, endpointSecret);
	} catch (err: any) {
		console.error('Webhook signature verification failed:', err.message);
		res.status(400).send(`Webhook Error: ${err.message}`);
		return;
	}

	try {
		if (event.type === 'payment_intent.succeeded') {
			const paymentIntent = event.data.object as Stripe.PaymentIntent;
			const metadata = paymentIntent.metadata || {};
			if (metadata.type === 'secure_trade_escrow' && metadata.tradeId) {
				const tradeId = metadata.tradeId;
				await db.collection('secureTrades').doc(tradeId).update({
					'escrow.status': 'funded',
					'escrow.fundedAt': admin.firestore.FieldValue.serverTimestamp(),
					'timeline.buyerPaid': admin.firestore.FieldValue.serverTimestamp(),
					status: 'active'
				});
				await sendSellerDeliveryInstructions(tradeId);
			}
		}
	} catch (e: any) {
		console.error('secureTradeWebhook handler error:', e.message || e);
		res.status(500).json({ error: 'Internal error' });
		return;
	}

	res.json({ received: true });
});

// STEP 3: Warehouse confirms delivery (manual trigger)
export const confirmWarehouseDelivery = functions.https.onCall(async (data: any, context: any) => {
	// Simple role check; production should integrate proper custom claims
	if (!context?.auth) {
		throw new functions.https.HttpsError('unauthenticated', 'Unauthorized');
	}
	// Allow for now; in production check context.auth.token.role === 'warehouse_staff'
	const { tradeId, verifiedProductPhotos } = (data || {}) as { tradeId: string; verifiedProductPhotos?: string[] };
	if (!tradeId) {
		throw new functions.https.HttpsError('invalid-argument', 'tradeId required');
	}

	await db.collection('secureTrades').doc(tradeId).update({
		'verification.status': 'in_inspection',
		'verification.inspectionPhotos': Array.isArray(verifiedProductPhotos) ? verifiedProductPhotos : [],
		'timeline.sellerDelivered': admin.firestore.FieldValue.serverTimestamp()
	});
	await notifyBuyerInspectionStarted(tradeId);
	return { success: true };
});

// STEP 4: Inspector approves or rejects
export const approveVerification = functions.https.onCall(async (data: any, context: any) => {
	if (!context?.auth) {
		throw new functions.https.HttpsError('unauthenticated', 'Unauthorized');
	}
	// Allow for now; in production check context.auth.token.role === 'inspector'
	const { tradeId, inspectionReportUrl, approved } = (data || {}) as { tradeId: string; inspectionReportUrl?: string; approved: boolean };
	if (!tradeId) {
		throw new functions.https.HttpsError('invalid-argument', 'tradeId required');
	}

	const updateData: any = {
		'verification.inspectorId': context.auth?.uid || null,
		'verification.inspectionReport': inspectionReportUrl || null
	};

	if (approved) {
		updateData['verification.status'] = 'approved';
		updateData['verification.approvedAt'] = admin.firestore.FieldValue.serverTimestamp();
		updateData['timeline.verified'] = admin.firestore.FieldValue.serverTimestamp();
	} else {
		updateData['verification.status'] = 'rejected';
	}

	await db.collection('secureTrades').doc(tradeId).update(updateData);

	if (approved) {
		await notifyBuyerVerificationComplete(tradeId);
	} else {
		await initiateRefund(tradeId, 'verification_failed');
	}

	return { success: true, approved: !!approved };
});

// STEP 5: Warehouse confirms shipment and partial release
export const confirmShipment = functions.https.onCall(async (data: any, context: any) => {
	if (!context?.auth) {
		throw new functions.https.HttpsError('unauthenticated', 'Unauthorized');
	}
	// Allow for now; in production check role 'warehouse_staff'
	const { tradeId, trackingNumber, carrier } = (data || {}) as { tradeId: string; trackingNumber: string; carrier: string };
	if (!tradeId || !trackingNumber || !carrier) {
		throw new functions.https.HttpsError('invalid-argument', 'tradeId, trackingNumber, carrier are required');
	}

	await db.collection('secureTrades').doc(tradeId).update({
		'shipping.trackingNumber': trackingNumber,
		'shipping.carrier': carrier,
		'shipping.status': 'in_transit',
		'timeline.shipped': admin.firestore.FieldValue.serverTimestamp()
	});

	// Partial release (70%)
	await releaseSellerPaymentInternal(tradeId, 0.7);
	return { success: true };
});

// STEP 6: Finance releases funds (default 100% unless specified)
export const releaseSellerPayment = functions.https.onCall(async (data: any, context: any) => {
	if (!context?.auth) {
		throw new functions.https.HttpsError('unauthenticated', 'Unauthorized');
	}
	// Allow for now; in production check role 'finance_admin'
	const { tradeId, percentage = 1.0 } = (data || {}) as { tradeId: string; percentage?: number };
	if (!tradeId) {
		throw new functions.https.HttpsError('invalid-argument', 'tradeId required');
	}
	const result = await releaseSellerPaymentInternal(tradeId, Number(percentage));
	return result;
});

async function releaseSellerPaymentInternal(tradeId: string, percentage: number) {
	if (!(percentage > 0 && percentage <= 1.0)) {
		throw new functions.https.HttpsError('invalid-argument', 'percentage must be between 0 and 1');
	}

	const ref = db.collection('secureTrades').doc(tradeId);
	const snap = await ref.get();
	if (!snap.exists) {
		throw new functions.https.HttpsError('not-found', 'Trade not found');
	}
	const data = snap.data() as any;
	const amount = Number(data?.escrow?.amount || 0);
	const sellerDestination = String(data?.sellerId || '');

	// In production, sellerId should be a Stripe connected account ID.
	// If not configured, just mark firestore and log.
	if (!sellerDestination || sellerDestination.length < 5) {
		console.warn('Seller destination is not a Stripe account id. Skipping actual transfer.');
		await ref.update({
			'escrow.status': 'released',
			'escrow.releasedAt': admin.firestore.FieldValue.serverTimestamp(),
			'timeline.sellerPaid': admin.firestore.FieldValue.serverTimestamp(),
			status: 'completed'
		});
		return { success: true, transferId: null, simulated: true };
	}

	const transfer = await getStripe().transfers.create({
		amount: Math.round(amount * percentage * 100),
		currency: 'usd',
		destination: sellerDestination,
		metadata: {
			tradeId,
			type: 'secure_trade_release',
			percentage: String(percentage)
		}
	});

	await ref.update({
		'escrow.status': percentage === 1.0 ? 'released' : admin.firestore.FieldValue.delete(),
		'escrow.releasedAt': percentage === 1.0 ? admin.firestore.FieldValue.serverTimestamp() : admin.firestore.FieldValue.delete(),
		'timeline.sellerPaid': admin.firestore.FieldValue.serverTimestamp(),
		status: percentage === 1.0 ? 'completed' : admin.firestore.FieldValue.delete()
	});

	return { success: true, transferId: transfer.id };
}


