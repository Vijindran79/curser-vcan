# API Keys Configuration Update

## ✅ Changes Applied

All API keys in Firebase Functions now follow the secure pattern:
```typescript
const apiKey = process.env.API_KEY || functions.config().service.apikey || functions.config().service.api_key;
```

### Updated Functions

1. **Shippo API** (`getShippoQuotes`)
   ```typescript
   const shippoApiKey = process.env.SHIPPO_API_KEY || functions.config().shippo?.apikey || functions.config().shippo?.api_key;
   ```

2. **Sea Rates API** (`getSeaRates`)
   ```typescript
   const seaRatesApiKey = process.env.SEARATES_API_KEY || process.env.SEA_RATES_API_KEY || functions.config().searates?.apikey || functions.config().sea_rates?.api_key;
   const seaRatesApiUrl = process.env.SEA_RATES_API_URL || functions.config().searates?.apiurl || functions.config().sea_rates?.api_url || 'https://api.searates.com/v1';
   ```

3. **Stripe API** (`createPaymentIntent`)
   ```typescript
   const stripeSecretKey = process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secretkey || functions.config().stripe?.secret_key;
   ```

## 🔒 Security Improvements

- ✅ **Removed hardcoded API keys** - No fallback values in code
- ✅ **Environment variables first** - Most secure option prioritized
- ✅ **Flexible config naming** - Supports both `apikey` and `api_key` formats
- ✅ **Proper error handling** - Functions throw errors if keys not configured

## 📝 How to Set API Keys

### Option 1: Environment Variables (Recommended for Production)

In Firebase Console → Functions → Configuration:
- Add `SHIPPO_API_KEY` environment variable
- Add `SEARATES_API_KEY` or `SEA_RATES_API_KEY` environment variable  
- Add `SEA_RATES_API_URL` environment variable (optional)
- Add `STRIPE_SECRET_KEY` environment variable

### Option 2: Firebase Config (Legacy)

```bash
firebase functions:config:set shippo.apikey="YOUR_KEY"
firebase functions:config:set searates.apikey="YOUR_KEY"
firebase functions:config:set searates.apiurl="YOUR_URL"
firebase functions:config:set stripe.secretkey="YOUR_KEY"
```

## ✅ Build Status

- ✅ TypeScript compilation successful
- ✅ All references updated
- ✅ No linter errors
- ✅ Ready to deploy

## 🚀 Next Steps

1. **Set API keys** in Firebase Console or via Firebase Config
2. **Deploy functions:**
   ```bash
   firebase deploy --only functions
   ```
3. **Test API calls** to verify keys are working

---

**Note:** Functions will throw errors if API keys are not configured, preventing unauthorized API usage.



