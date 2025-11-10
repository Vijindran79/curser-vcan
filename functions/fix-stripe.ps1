# PowerShell script to add V2 callable to stripe.ts properly

$filePath = "c:\Users\vijin\curser-vcan\functions\src\stripe.ts"

# Read the file
$content = Get-Content $filePath -Raw

# 1. Update imports at the top
$content = $content -replace 'import \{ onRequest \} from ''firebase-functions/v2/https'';', 'import { onRequest, onCall, HttpsError, CallableRequest } from ''firebase-functions/v2/https'';'

# 2. Add interface and V2 function at the very end
$v2Addition = @'


// ==================== V2 CALLABLE WITH APP CHECK ====================
interface PaymentIntentData {
    amount: number;
    currency: string;
    description?: string;
}

// V2 Callable version with App Check enforcement
export const createPaymentIntentV2 = onCall<PaymentIntentData>(
    { 
        enforceAppCheck: true,  // Enables App Check enforcement at platform level
        cors: true
    },
    async (request: CallableRequest<PaymentIntentData>) => {
        console.log('[Payment Intent V2] Function invoked');
        console.log('[Payment Intent V2] App Check verified:', !!request.app);
        
        const { amount, currency, description } = request.data;

        // Validate input
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            console.error('[Payment Intent V2] Invalid amount:', amount);
            throw new HttpsError('invalid-argument', 'Invalid amount');
        }

        if (!currency || typeof currency !== 'string') {
            console.error('[Payment Intent V2] Invalid currency:', currency);
            throw new HttpsError('invalid-argument', 'Invalid currency');
        }

        console.log('[Payment Intent V2] Creating payment intent:', { amount, currency, description });

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

            console.log('[Payment Intent V2] Created successfully:', paymentIntent.id);

            return {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id
            };
        } catch (error: any) {
            console.error('[Payment Intent V2] Error:', error);
            console.error('[Payment Intent V2] Error details:', {
                message: error.message,
                type: error.type,
                code: error.code
            });
            throw new HttpsError('internal', error.message || 'Failed to create payment intent');
        }
    }
);
'@

# Only add if not already present
if ($content -notmatch 'createPaymentIntentV2') {
    $content = $content.TrimEnd() + $v2Addition
}

# Write back
$content | Set-Content $filePath -NoNewline

Write-Host "✅ stripe.ts updated successfully"
