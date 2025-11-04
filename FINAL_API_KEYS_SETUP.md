# ✅ API Keys Setup - Final Guide

## 🎯 **Status: Code Updated & Ready**

All Firebase Functions now use secure API key patterns. You need to **set your API keys** in Firebase Console before deploying.

---

## 📝 **Quick Setup Steps**

### Step 1: Set API Keys in Firebase Console

1. **Go to:** https://console.firebase.google.com/project/vcanship-onestop-logistics/functions/config

2. **Click:** **"Edit"** or **"Add Variable"**

3. **Add these environment variables:**

   | Variable Name | Value (Your Actual Key) | Required |
   |--------------|------------------------|----------|
   | `SHIPPO_API_KEY` | Your Shippo API key | ✅ Yes |
   | `SEARATES_API_KEY` | Your Sea Rates API key | ✅ Yes |
   | `STRIPE_SECRET_KEY` | Your Stripe Secret Key | ✅ Yes |
   | `SEA_RATES_API_URL` | `https://api.searates.com/v1` (or custom) | ⚠️ Optional |

4. **Click:** **"Save"**

---

### Step 2: Deploy Functions

```bash
firebase deploy --only functions
```

**This will deploy all 5 functions with secure API key access:**
- ✅ `createPaymentIntent`
- ✅ `getHsCode`
- ✅ `getSeaRates`
- ✅ `getShippoQuotes`
- ✅ `sendQuoteInquiry`

---

### Step 3: Verify Deployment

1. **Check function status:**
   ```bash
   firebase functions:list
   ```

2. **Test payment flow:**
   - Go to: https://vcanship-onestop-logistics.web.app
   - Navigate through Parcel Wizard
   - Select a quote
   - Try payment (should work now)

3. **Test quote fetching:**
   - Send a parcel → Should get real Shippo quotes
   - Sea Freight → Should get real Sea Rates quotes

---

## 🔒 **Security Features Implemented**

✅ **Environment Variables First** - Most secure option  
✅ **Flexible Config Support** - Works with `apikey` or `api_key`  
✅ **No Hardcoded Keys** - All removed for security  
✅ **Clear Error Messages** - Functions fail safely if keys missing  
✅ **Production Ready** - Follows best practices  

---

## 📋 **Current Implementation**

### Shippo API
```typescript
const shippoApiKey = process.env.SHIPPO_API_KEY || 
                     functions.config().shippo?.apikey || 
                     functions.config().shippo?.api_key;
```

### Sea Rates API
```typescript
const seaRatesApiKey = process.env.SEARATES_API_KEY || 
                      process.env.SEA_RATES_API_KEY || 
                      functions.config().searates?.apikey || 
                      functions.config().sea_rates?.api_key;

const seaRatesApiUrl = process.env.SEA_RATES_API_URL || 
                      functions.config().searates?.apiurl || 
                      functions.config().sea_rates?.api_url || 
                      'https://api.searates.com/v1';
```

### Stripe API
```typescript
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 
                       functions.config().stripe?.secretkey || 
                       functions.config().stripe?.secret_key;
```

---

## ⚠️ **Important Notes**

1. **Never commit API keys** to Git
2. **Use environment variables** in Firebase Console (most secure)
3. **Functions will error** if keys are missing (intentional for security)
4. **Test in development** before production deployment

---

## 🚀 **After Deployment**

Your platform will have:
- ✅ **Live Shippo rates** for parcels
- ✅ **Live Sea Rates** for freight
- ✅ **Stripe payments** working globally
- ✅ **Secure key management** - no hardcoded values
- ✅ **Production-ready** configuration

---

## 📞 **Troubleshooting**

### If functions fail with "API key not configured":
1. Check Firebase Console → Functions → Configuration
2. Verify environment variables are set
3. Redeploy: `firebase deploy --only functions`

### If quotes don't fetch:
1. Verify API keys are valid
2. Check function logs: `firebase functions:log`
3. Test API keys independently

---

## ✅ **Ready to Deploy!**

Once you've set your API keys in Firebase Console, run:
```bash
firebase deploy --only functions
```

**You're now ready to scale and accept payments & live shipping rates worldwide!** 🚀



