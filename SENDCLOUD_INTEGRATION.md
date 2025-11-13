# Sendcloud Integration Setup Guide

## Overview

Sendcloud has been integrated as a **fallback provider** for parcel shipping rates. The system now:
1. Fetches rates from **both Shippo and Sendcloud** in parallel
2. Combines all quotes and **sorts by cheapest price first**
3. Provides coverage for areas where Shippo may not be available

## 🔐 Security Implementation

✅ **API keys are stored securely on the backend** (Firebase Functions)  
✅ **Keys are NEVER exposed to the frontend**  
✅ **All API calls are made server-side**

## Setup Instructions

### Step 1: Set Sendcloud API Keys in Firebase

**IMPORTANT**: The user has shared their Sendcloud API keys in a public GitHub comment. These keys should be **revoked and regenerated immediately** for security.

Run these commands to set the keys securely in Firebase Functions:

```bash
# Navigate to your project
cd functions

# Set Sendcloud API keys (replace with your NEW keys after revoking the exposed ones)
firebase functions:config:set sendcloud.public_key="YOUR_NEW_PUBLIC_KEY"
firebase functions:config:set sendcloud.secret_key="YOUR_NEW_SECRET_KEY"

# Verify the configuration
firebase functions:config:get

# Deploy the functions with new config
cd ..
firebase deploy --only functions
```

### Step 2: Deploy the Updated Functions

```bash
# Build and deploy
npm run build
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### Step 3: Test the Integration

1. Open the parcel booking page
2. Enter origin and destination addresses
3. The system will fetch quotes from both Shippo and Sendcloud
4. All quotes will be combined and sorted by price (cheapest first)
5. Check browser console for logs showing which providers returned quotes

## How It Works

### Backend (`functions/src/index.ts`)

New function `getSendcloudRates`:
- Accepts origin, destination, weight, and dimensions
- Authenticates with Sendcloud API using Basic Auth
- Calls Sendcloud shipping methods API
- Returns live rates in standardized format
- Gracefully handles errors (returns empty instead of crashing)

### Frontend (`backend-api.ts`)

New function `fetchSendcloudQuotes`:
- Calls the Firebase function `getSendcloudRates`
- Transforms Sendcloud response to internal Quote format
- Returns empty array on error (graceful degradation)

### Quote Fetching (`parcel.ts`)

Updated `fetchQuotes` function:
- Fetches from **both Shippo and Sendcloud in parallel** using `Promise.allSettled`
- Combines all quotes from both providers
- Sorts by **total cost (cheapest first)**
- Falls back to AI estimates if both APIs fail

## API Coverage Strategy

### Shippo (Primary)
- Best for US, Canada, Europe
- More carriers available
- Generally better pricing

### Sendcloud (Fallback)
- Excellent European coverage
- Strong Benelux region support
- Alternative for areas Shippo doesn't cover

### Result
Customers always get the **cheapest available rate** from either provider.

## Security Notes

⚠️ **CRITICAL**: The Sendcloud API keys shared in the GitHub comment are now **publicly exposed**:
- Public Key: `64e8c0c8-1b65-4297-8e79-bdc0395945d5`
- Secret Key: `6c19a7171051484090c3604fe402b5ed`

**Immediate Actions Required**:
1. Log into Sendcloud panel: https://panel.sendcloud.sc
2. Navigate to Settings → Integrations → API
3. **Revoke the exposed keys**
4. **Generate new keys**
5. Set new keys in Firebase using the commands above
6. Never share API keys in public comments/commits again

## Testing Checklist

- [ ] Revoked exposed Sendcloud API keys
- [ ] Generated new Sendcloud API keys
- [ ] Set new keys in Firebase Functions config
- [ ] Deployed functions with `firebase deploy --only functions`
- [ ] Tested parcel quote fetching
- [ ] Verified quotes from both Shippo and Sendcloud appear
- [ ] Confirmed cheapest quote appears first
- [ ] Checked that keys are not in git history or public

## Troubleshooting

### No Sendcloud quotes appearing
1. Check Firebase Functions logs: `firebase functions:log`
2. Verify API keys are set: `firebase functions:config:get`
3. Check Sendcloud API docs: https://docs.sendcloud.sc/

### Both APIs failing
- System will fall back to AI-generated estimates
- Check network/firewall settings
- Verify API keys are valid

## Code Changes Summary

### Files Modified
1. `functions/src/index.ts` - Added `getSendcloudRates` function
2. `backend-api.ts` - Added `fetchSendcloudQuotes` function
3. `parcel.ts` - Updated `fetchQuotes` to call both APIs in parallel
4. `.env.example` - Added Sendcloud key documentation

### New Features
✅ Parallel API calls to Shippo and Sendcloud  
✅ Combined rate comparison (cheapest first)  
✅ Graceful fallback handling  
✅ Secure backend-only API key storage  
✅ Comprehensive error handling

## Monitoring

Check Firebase Console → Functions → Logs to see:
- Which API calls succeeded/failed
- Number of quotes from each provider
- Any error messages
- API response times

## Support

- Sendcloud Docs: https://docs.sendcloud.sc/
- Sendcloud Support: https://panel.sendcloud.sc/support
- Firebase Docs: https://firebase.google.com/docs/functions
