# Auto-update stripe.ts to use V2 onCall with enforceAppCheck

$filePath = "c:\Users\vijin\curser-vcan\functions\src\stripe.ts"
$backupPath = "c:\Users\vijin\curser-vcan\functions\src\stripe.ts.before-v2"

Write-Host "Backing up stripe.ts to $backupPath" -ForegroundColor Yellow
Copy-Item $filePath $backupPath -Force

Write-Host "Reading file..." -ForegroundColor Cyan
$content = Get-Content $filePath -Raw

# Update import statement
Write-Host "Updating imports..." -ForegroundColor Cyan
$content = $content -replace "import { onRequest } from 'firebase-functions/v2/https';", "import { onRequest, onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';"

# Replace the old createPaymentIntentCallable function
Write-Host "Replacing createPaymentIntentCallable function..." -ForegroundColor Cyan

$oldFunction = @'
// Callable version for Firebase SDK \(v1 - bypasses IAM issues\)
export const createPaymentIntentCallable = functions\.https\.onCall\(async \(request, context: any\) => \{[\s\S]*?\}\);
'@

$newFunction = @'
// V2 Callable version with App Check enforcement
export const createPaymentIntentCallable = onCall<{amount: number; currency: string; description?: string}>(
    { 
        enforceAppCheck: true,  // Enables App Check enforcement at platform level
        cors: true
    },
    async (request: CallableRequest<{amount: number; currency: string; description?: string}>) => {
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
'@

$content = $content -replace $oldFunction, $newFunction

Write-Host "Writing updated file..." -ForegroundColor Cyan
$content | Set-Content $filePath -NoNewline

Write-Host "Done! stripe.ts updated successfully." -ForegroundColor Green
Write-Host "Backup saved at: $backupPath" -ForegroundColor Green
