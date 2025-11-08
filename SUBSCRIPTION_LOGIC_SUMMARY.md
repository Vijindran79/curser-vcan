# 🔒 Subscription Logic Summary

## ✅ Current Configuration (Verified)

### 🎯 Subscription Check Function
```typescript
async function checkUserSubscription(userEmail: string): Promise<boolean> {
  if (!userEmail || userEmail === 'anonymous') {
    return false; // Not subscribed
  }
  
  // Owner bypass - vg@vcanresources.com gets full access
  if (userEmail === 'vg@vcanresources.com') {
    return true; // Owner always subscribed
  }
  
  // Check Firestore for subscription tier
  const userData = userDoc.data();
  return userData?.subscriptionTier === 'pro' || userData?.subscriptionTier === 'premium';
}
```

---

## 📊 API Access Matrix

| Service | Free Users | Pro/Premium Users | API Used |
|---------|-----------|-------------------|----------|
| **Shippo Parcel** | ✅ LIVE RATES | ✅ LIVE RATES | Shippo API |
| **FCL Rates** | ❌ Cached/Estimated | ✅ LIVE RATES | SeaRates GraphQL |
| **LCL Rates** | ❌ Cached/Estimated | ✅ LIVE RATES | SeaRates GraphQL |
| **Air Freight** | ❌ Cached/Estimated | ✅ LIVE RATES | SeaRates GraphQL |

---

## 🚢 1. Shippo Parcel (getShippoQuotes)

### ✅ FREE FOR ALL USERS
```typescript
export const getShippoQuotes = functions.https.onCall(async (data, context) => {
  // ✅ Authentication required (all users)
  if (!context || !context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '...');
  }

  const userEmail = context.auth?.token?.email || 'anonymous';
  const isSubscribed = await checkUserSubscription(userEmail);

  // ✅ ALL USERS GET LIVE SHIPPO RATES (FREE SERVICE)
  const SHIPPO_API_KEY = functions.config().shippo?.api_key || process.env.SHIPPO_API_KEY;
  
  // Call Shippo API for REAL LIVE RATES
  const shippoResponse = await axios.post(
    'https://api.goshippo.com/shipments',
    shippoPayload,
    { headers: { 'Authorization': `ShippoToken ${SHIPPO_API_KEY}` } }
  );

  // Return REAL rates with 18 carriers
  return {
    success: true,
    quotes: transformedRates, // Real UPS, USPS, FedEx, DHL rates
    subscription_required: false, // ✅ FREE FOR ALL
    source: 'live_carrier_api'
  };
});
```

**Result:**
- ✅ Free users: Get REAL Shippo rates ($10.02 UPS, $93.17 FedEx, etc.)
- ✅ Pro users: Get REAL Shippo rates (same access)
- ✅ Owner (vg@vcanresources.com): Get REAL Shippo rates

---

## 🚢 2. FCL Rates (getFCLRates)

### 🔒 PRO/PREMIUM ONLY
```typescript
export const getFCLRates = functions.https.onCall(async (data, context) => {
  // ✅ Authentication required
  if (!context || !context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '...');
  }

  const userEmail = context.auth?.token?.email || 'anonymous';
  const isSubscribed = await checkUserSubscription(userEmail);

  try {
    // 🔒 ONLY for subscribed users
    if (isSubscribed) {
      // Get SeaRates Bearer token
      const token = await getSeaRatesToken();
      
      // Call SeaRates GraphQL API
      const response = await axios.post(
        'https://www.searates.com/graphql_rates',
        fclQuery,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // Return REAL LIVE FCL RATES (25 carriers)
      return {
        success: true,
        quotes: liveRates, // Real Maersk, MSC, HMM, OOCL rates
        subscription_required: false,
        source: 'live_carrier_api'
      };
    }

    // ❌ FREE users get cached/estimated rates
    return {
      success: true,
      quotes: [
        { carrier: 'Maersk', total_rate: 2450, source: 'estimated_rates' },
        { carrier: 'MSC', total_rate: 2380, source: 'estimated_rates' }
      ],
      cached: true,
      subscription_required: true, // ❌ REQUIRES PRO
      message: 'Upgrade to Pro for live FCL rates'
    };
  }
});
```

**Result:**
- ❌ Free users: Get FAKE estimated rates ($2,450, $2,380)
- ✅ Pro users: Get REAL SeaRates rates ($1,616 - $3,902, 25 carriers)
- ✅ Owner (vg@vcanresources.com): Get REAL SeaRates rates

---

## 📦 3. LCL Rates (getLCLRates)

### 🔒 PRO/PREMIUM ONLY
```typescript
export const getLCLRates = functions.https.onCall(async (data, context) => {
  // Same pattern as getFCLRates
  
  if (isSubscribed) {
    // ✅ Call SeaRates GraphQL API for LIVE LCL rates
    return { quotes: liveRates, subscription_required: false };
  }

  // ❌ Free users get estimated rates
  return {
    quotes: [
      { carrier: 'CMA CGM', total_rate: 180, source: 'estimated_rates' },
      { carrier: 'Evergreen', total_rate: 175, source: 'estimated_rates' }
    ],
    subscription_required: true,
    message: 'Upgrade to Pro for live LCL rates'
  };
});
```

**Result:**
- ❌ Free users: Get FAKE estimated rates ($180, $175)
- ✅ Pro users: Get REAL SeaRates LCL rates
- ✅ Owner: Get REAL SeaRates LCL rates

---

## ✈️ 4. Air Freight Rates (getAirFreightRates)

### 🔒 PRO/PREMIUM ONLY
```typescript
export const getAirFreightRates = functions.https.onCall(async (data, context) => {
  // Same pattern as getFCLRates
  
  if (isSubscribed) {
    // ✅ Call SeaRates GraphQL API for LIVE Air Freight rates
    return { quotes: liveRates, subscription_required: false };
  }

  // ❌ Free users get estimated rates
  return {
    quotes: [
      { carrier: 'DHL Express', total_rate: 850, source: 'estimated_rates' },
      { carrier: 'FedEx Express', total_rate: 920, source: 'estimated_rates' }
    ],
    subscription_required: true,
    message: 'Upgrade to Pro for live Air Freight rates'
  };
});
```

**Result:**
- ❌ Free users: Get FAKE estimated rates ($850, $920)
- ✅ Pro users: Get REAL SeaRates Air Freight rates
- ✅ Owner: Get REAL SeaRates Air Freight rates

---

## 🔑 Special Access: Owner Bypass

```typescript
if (userEmail === 'vg@vcanresources.com') {
  console.log(`Owner access granted for ${userEmail}`);
  return true; // Full access to everything
}
```

**Owner (vg@vcanresources.com) gets:**
- ✅ Free Shippo parcel rates (same as everyone)
- ✅ LIVE FCL rates from SeaRates
- ✅ LIVE LCL rates from SeaRates
- ✅ LIVE Air Freight rates from SeaRates
- ✅ No subscription check

---

## 📊 Response Field Reference

### For Live API Rates (Pro/Premium Users)
```json
{
  "success": true,
  "quotes": [ /* Real rates from APIs */ ],
  "cached": false,
  "subscription_required": false,
  "source": "live_carrier_api",
  "message": "Live rates from 25 carriers via SeaRates API"
}
```

### For Cached/Estimated Rates (Free Users)
```json
{
  "success": true,
  "quotes": [ /* Fake estimated rates */ ],
  "cached": true,
  "subscription_required": true,
  "source": "estimated_rates",
  "message": "Upgrade to Pro for live FCL rates"
}
```

---

## 🎯 Authentication Flow

```
1. User makes request
   ↓
2. Check if authenticated (context.auth exists)
   ↓ YES
3. Get user email from context.auth.token.email
   ↓
4. Check subscription status:
   - If owner (vg@vcanresources.com) → TRUE
   - Else check Firestore users collection
   - If subscriptionTier = 'pro' or 'premium' → TRUE
   - Else → FALSE
   ↓
5. Based on isSubscribed:
   - Shippo: Always call live API (FREE)
   - FCL/LCL/Air: Call live API if TRUE, else return cached
   ↓
6. Return response with subscription_required flag
```

---

## ✅ Verification Checklist

### Free Users Should Get:
- ✅ REAL Shippo parcel rates (18 carriers)
- ❌ FAKE FCL rates (2 static rates)
- ❌ FAKE LCL rates (2 static rates)
- ❌ FAKE Air Freight rates (2 static rates)
- ✅ Message: "Upgrade to Pro for live rates"

### Pro/Premium Users Should Get:
- ✅ REAL Shippo parcel rates (18 carriers)
- ✅ REAL FCL rates (25 carriers via SeaRates)
- ✅ REAL LCL rates (via SeaRates)
- ✅ REAL Air Freight rates (via SeaRates)
- ✅ Message: "Live rates from SeaRates API"

### Owner (vg@vcanresources.com) Should Get:
- ✅ Everything Pro users get
- ✅ Automatic bypass of subscription check

---

## 🚀 Deployment Status

**Last Deployed:** January 8, 2025
**Status:** ✅ LIVE AND WORKING
**Functions Deployed:** 13 total
**Subscription Logic:** ✅ VERIFIED

---

## 📝 Code Locations

- **Subscription Check:** `functions/src/index.ts` lines 40-63
- **Shippo Function:** `functions/src/index.ts` lines 675-911
- **FCL Function:** `functions/src/index.ts` lines 67-227
- **LCL Function:** `functions/src/index.ts` lines 228-379
- **Air Freight Function:** `functions/src/index.ts` lines 380-529

---

## ⚠️ Important Notes

1. **Shippo is FREE for all users** - No subscription check on API calls
2. **SeaRates requires Pro/Premium** - Subscription check enforced
3. **Owner bypass works on all functions** - vg@vcanresources.com gets full access
4. **Estimated rates are static** - Not real-time, just placeholders
5. **subscription_required flag** - Frontend should show upgrade prompts based on this

---

**✅ All subscription logic is in place and working correctly!**
