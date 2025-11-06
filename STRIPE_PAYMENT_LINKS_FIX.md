# 🚨 CRITICAL: Fix Stripe Payment Links

## Problem
Your Stripe Payment Links are returning 404 errors:
- Monthly link: `https://buy.stripe.com/6oU8wR9uDb0gayL6gv7Vm00` ❌
- Yearly link: `https://buy.stripe.com/3cI4g8fgX36kdKXgV97Vm01` ❌

## Why This Happened
These payment links were either:
1. Deleted from your Stripe dashboard
2. Created in test mode but you're using live mode
3. Invalid/expired link IDs

## 5-MINUTE FIX (Do This Now!)

### Step 1: Create New Payment Links in Stripe

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/payment-links
2. **Click "New"** (top right corner)

#### For MONTHLY Plan:
3. Fill in these details:
   - **Product name**: "VCanship Pro - Monthly"
   - **Price**: $9.99 USD
   - **Billing period**: Monthly (Recurring)
   - **Payment link name**: "VCanship Pro Monthly"
4. **Click "Create link"**
5. **COPY THE FULL URL** (looks like `https://buy.stripe.com/XXXXXXXXX`)

#### For YEARLY Plan:
6. **Click "New"** again
7. Fill in these details:
   - **Product name**: "VCanship Pro - Yearly"
   - **Price**: $99.00 USD
   - **Billing period**: Yearly (Recurring)
   - **Payment link name**: "VCanship Pro Yearly"
8. **Click "Create link"**
9. **COPY THE FULL URL**

### Step 2: Update Your Code

Open file: `c:\Users\vijin\curser-vcan\subscription.ts`

Find lines 9 and 14, replace with your NEW URLs:

```typescript
const SUBSCRIPTION_PAYMENT_LINKS = {
    monthly: {
        amount: 999,
        url: "https://buy.stripe.com/YOUR_NEW_MONTHLY_URL_HERE",  // ← Paste here
        label: "$9.99/month"
    },
    yearly: {
        amount: 9900,
        url: "https://buy.stripe.com/YOUR_NEW_YEARLY_URL_HERE",   // ← Paste here
        label: "$99/year"
    }
} as const;
```

### Step 3: Rebuild and Deploy

```powershell
npm run build
firebase deploy --only hosting
```

## ✅ The Language Error is FIXED!

Your first error: `Cannot find module './en'` is now SOLVED! ✅

The locale files are now properly copied to the build folder.

## Test Your Site

After deploying, test:
1. Go to: https://vcanship-onestop-logistics.web.app
2. **Language switching should work** ✅
3. Click subscription button
4. Should redirect to working Stripe payment page ✅

## If You Need Help

The payment link creation takes 2 minutes in Stripe. Just:
1. Make the product
2. Copy the link
3. Replace in code
4. Deploy

**You can do this!** 💪
