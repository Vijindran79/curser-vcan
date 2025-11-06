# Stripe Subscription Setup Guide

## ✅ What's Already Working
- Subscription page with beautiful pricing cards ($9.99/month, $99/year)
- Frontend payment flow complete
- Firebase Function `createSubscriptionCheckout` deployed with CORS
- Error handling with user-friendly messages

## ⚠️ What Needs Configuration

### Step 1: Create Stripe Account
1. Go to https://stripe.com
2. Sign up for a Stripe account
3. Complete business verification

### Step 2: Get Stripe API Keys
1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable Key** (starts with `pk_live_...` or `pk_test_...`)
3. Copy your **Secret Key** (starts with `sk_live_...` or `sk_test_...`)

### Step 3: Create Subscription Products & Prices
1. Go to https://dashboard.stripe.com/products
2. Click "Add Product"

**Monthly Product:**
- Name: "Pro Subscription - Monthly"
- Description: "Unlimited real-time rates for $9.99/month"
- Pricing: $9.99 USD / month (recurring)
- Click "Save Product"
- Copy the **Price ID** (starts with `price_...`)

**Yearly Product:**
- Name: "Pro Subscription - Yearly"  
- Description: "Unlimited real-time rates for $99/year (17% savings)"
- Pricing: $99 USD / year (recurring)
- Click "Save Product"
- Copy the **Price ID** (starts with `price_...`)

### Step 4: Configure Firebase Environment Variables

Run these commands in your terminal:

```bash
# Set Stripe Secret Key
firebase functions:config:set stripe.secret_key="sk_test_YOUR_SECRET_KEY_HERE"

# Optionally set publishable key
firebase functions:config:set stripe.publishable_key="pk_test_YOUR_PUBLISHABLE_KEY_HERE"

# Optionally set frontend URL
firebase functions:config:set frontend.url="https://vcanship-onestop-logistics.web.app"
```

### Step 5: Update Frontend Stripe Keys

Edit `subscription.ts` line 10:
```typescript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_KEY_HERE'; // Replace with your key
```

### Step 6: Update Stripe Price IDs

Edit `subscription.ts` lines 30-36:
```typescript
const SUBSCRIPTION_PRICES = {
    monthly: {
        amount: 999,
        priceId: 'price_YOUR_MONTHLY_PRICE_ID', // ← Update this
        label: '$9.99/month',
        savings: null
    },
    yearly: {
        amount: 9900,
        priceId: 'price_YOUR_YEARLY_PRICE_ID', // ← Update this
        label: '$99/year',
        savings: '$20.88 (17% off)'
    }
};
```

### Step 7: Redeploy

```bash
# Build frontend
npm run build

# Deploy hosting
firebase deploy --only hosting

# Deploy functions
firebase deploy --only functions
```

### Step 8: Configure Stripe Webhook (Optional but Recommended)

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add Endpoint"
3. URL: `https://us-central1-vcanship-onestop-logistics.cloudfunctions.net/stripeWebhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing Secret** (starts with `whsec_...`)
6. Set in Firebase:
   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET"
   ```

## 🧪 Testing the Subscription Flow

### Using Stripe Test Mode
Use these test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Auth**: `4000 0025 0000 3155`

Expiry: Any future date (e.g., 12/25)  
CVC: Any 3 digits (e.g., 123)  
ZIP: Any 5 digits (e.g., 12345)

### Test Flow:
1. Visit https://vcanship-onestop-logistics.web.app
2. Sign in with a test account
3. Click "Upgrade Now" button
4. Click "Subscribe Monthly" or "Subscribe Yearly"
5. Should redirect to Stripe Checkout
6. Use test card `4242 4242 4242 4242`
7. Complete payment
8. Should redirect back with success message

## 🚨 Current Status

**Subscription Page:** ✅ Working  
**Stripe Configuration:** ❌ Not configured  
**Payment Flow:** ⏸️ Blocked until Stripe configured

Once you configure Stripe, the full payment flow will work automatically!

## 📧 Support

For issues, contact: vg@vcanresources.com
