# Update Firebase Functions to V2 with App Check Enforcement
# This script guides you through updating your functions

Write-Host "`n=== Firebase Functions V2 + App Check Update Guide ===" -ForegroundColor Cyan
Write-Host "`nThis will update your functions to use Firebase Functions V2 with enforceAppCheck: true`n"

Write-Host "STEP 1: Update stripe.ts" -ForegroundColor Yellow
Write-Host "---------------------------------------"
Write-Host "1. Open: c:\Users\vijin\curser-vcan\functions\src\stripe.ts"
Write-Host "2. Find line 2 (import statement) and REPLACE:"
Write-Host "   OLD: import { onRequest } from 'firebase-functions/v2/https';"
Write-Host "   NEW: import { onRequest, onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';"
Write-Host "`n3. Find line ~205 'export const createPaymentIntentCallable' and REPLACE the entire function with:"
Write-Host @"

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

"@ -ForegroundColor Green

Read-Host "`nPress Enter after updating stripe.ts..."

Write-Host "`nSTEP 2: Update index.ts" -ForegroundColor Yellow
Write-Host "---------------------------------------"
Write-Host "1. Open: c:\Users\vijin\curser-vcan\functions\src\index.ts"
Write-Host "2. Add to imports at the top (after line 1):"
Write-Host "   import { onCall as onCallV2, HttpsError, CallableRequest } from 'firebase-functions/v2/https';"
Write-Host "`n3. Find line ~901 'export const getShippoQuotes' and ADD this NEW function AFTER it:"
Write-Host @"

// V2 Shippo Callable with App Check enforcement
export const getShippoQuotesV2 = onCallV2(
  { 
    enforceAppCheck: true,  // Enables App Check enforcement at platform level
    cors: true
  },
  async (request: CallableRequest) => {
    console.log('[Shippo V2] Callable invoked');
    console.log('[Shippo V2] App Check verified:', !!request.app);
    
    try {
      const requestData = request.data as ShippoCallableData;
      const userEmail = request.auth?.token?.email || requestData.userEmail || 'guest';
      
      const result = await buildShippoResponse(requestData, userEmail);
      
      console.log('[Shippo V2] Callable returning success with', result.quotes?.length || 0, 'quotes');
      return result;
    } catch (error: any) {
      console.error('[Shippo V2] Callable error:', error);
      console.error('[Shippo V2] Error stack:', error?.stack);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      const errorMessage = error?.message || 'Failed to fetch Shippo quotes';
      console.error('[Shippo V2] Throwing HttpsError with message:', errorMessage);
      throw new HttpsError('unavailable', errorMessage);
    }
  }
);

"@ -ForegroundColor Green

Read-Host "`nPress Enter after updating index.ts..."

Write-Host "`nSTEP 3: Build and Deploy" -ForegroundColor Yellow
Write-Host "---------------------------------------"
Write-Host "Run these commands:"
Write-Host "  cd c:\Users\vijin\curser-vcan\functions"
Write-Host "  npm run build"
Write-Host "  cd .."
Write-Host "  firebase deploy --only functions:createPaymentIntentCallable,functions:getShippoQuotesV2"
Write-Host ""

$continue = Read-Host "Do you want to run the build and deploy now? (y/n)"

if ($continue -eq 'y' -or $continue -eq 'Y') {
    Write-Host "`nBuilding functions..." -ForegroundColor Cyan
    Set-Location c:\Users\vijin\curser-vcan\functions
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nBuild successful! Deploying..." -ForegroundColor Green
        Set-Location c:\Users\vijin\curser-vcan
        firebase deploy --only functions
    } else {
        Write-Host "`nBuild failed! Please fix errors before deploying." -ForegroundColor Red
    }
} else {
    Write-Host "`nSkipping build and deploy. Run manually when ready." -ForegroundColor Yellow
}

Write-Host "`n=== IMPORTANT: Update Frontend ===" -ForegroundColor Cyan
Write-Host "After deployment, update your frontend code to call the NEW functions:"
Write-Host "  OLD: const fn = getFunctions().httpsCallable('createPaymentIntentCallable');"
Write-Host "  NEW: const fn = getFunctions().httpsCallable('createPaymentIntentCallable');" -ForegroundColor Green
Write-Host "  (Same name - no frontend changes needed!)"
Write-Host ""
Write-Host "For Shippo:"
Write-Host "  OLD: const fn = getFunctions().httpsCallable('getShippoQuotes');"
Write-Host "  NEW: const fn = getFunctions().httpsCallable('getShippoQuotesV2');" -ForegroundColor Green
Write-Host ""
