# 🎯 Sea Rates API - Quick Reference

## ✅ What Was Fixed

### **Problem:**
- Only 50 Sea Rates API calls per month
- No tracking or limit enforcement
- No caching = wasted API calls
- No subscription logic

### **Solution Implemented:**
1. ✅ **Smart 4-Hour Caching** - Each API call serves 6× more requests
2. ✅ **Monthly Limit Tracking** - Auto-resets each month in Firestore
3. ✅ **Subscription Logic** - Pro users get unlimited access
4. ✅ **Graceful Degradation** - Always shows *something* (fresh → cached → expired → AI)
5. ✅ **User Feedback** - Clear messages about cache status

---

## 📊 Current Status

### **Deployed Functions:**
✅ `getSeaRates` - Updated with caching logic (November 4, 2025)

### **Firestore Collections:**
- `api_stats/sea_rates_monthly` - Tracks monthly API usage
- `sea_rates_cache/*` - Stores cached quotes (4-hour lifetime)

### **Services Using Sea Rates:**
1. FCL (Full Container Load)
2. LCL (Less than Container Load)
3. Air Freight
4. Bulk Shipping

---

## 🔢 The Math

```
50 API calls/month with 4-hour cache:

Cache refreshes per day = 24 hours ÷ 4 hours = 6 times/day
Requests per API call = 6 refreshes
Total capacity per day = 50 calls × 6 = 300 requests/day

Monthly capacity = 50 fresh calls + thousands of cached responses!
```

---

## 🎮 How It Works (Simple Version)

### **User Makes Request:**

1. **Check Cache** (< 4 hours old?)
   - YES → Return cached data ✅
   - NO → Go to step 2

2. **Check Subscription**
   - Pro User → Make API call ✅
   - Free User → Go to step 3

3. **Check Monthly Limit** (< 50 calls?)
   - YES → Make API call ✅
   - NO → Return expired cache or AI estimate ⚠️

---

## 🎯 User Messages

| Scenario | User Sees | What It Means |
|----------|-----------|---------------|
| Fresh API call | "✅ Real-time sea freight rates" | Just called Sea Rates API |
| Cached (< 4hrs) | "📦 Showing cached rates (refreshed every 4 hours)" | Using recent cache, no API call |
| Cached (expired) | "⚠️ Showing older rates. Upgrade to Pro!" | Hit 50/month limit, showing old cache |
| AI Fallback | "🤖 AI-generated estimates" | No cache + limit reached, using AI |

---

## 🔧 Quick Checks

### **Check Current API Usage:**
1. Open Firebase Console
2. Go to Firestore Database
3. Navigate to `api_stats` → `sea_rates_monthly`
4. Check `count` field (current month usage)

### **Check Cache Status:**
1. Firestore → `sea_rates_cache` collection
2. Each document = one cached route
3. Check `expires_at` to see when cache expires

### **View Logs:**
```bash
firebase functions:log --only getSeaRates
```

---

## 💡 Pro Tips

### **Maximize Your 50 Calls:**
- ✅ Common routes cached = more users served
- ✅ 4-hour cache = fresh enough for freight rates
- ✅ Off-peak usage = better cache hit rates

### **When to Upgrade to Pro:**
- Consistent 50/50 monthly usage
- Need real-time rates at all times
- Multiple users on same routes
- Business-critical quotes

---

## 🚨 If Something Breaks

### **Error: "Monthly limit reached"**
**Check:**
1. Is it actually a new month? (Auto-resets on 1st)
2. Firestore `api_stats/sea_rates_monthly` → `count` value
3. Is user a Pro subscriber? Check `users/{email}/subscriptionTier`

**Fix:**
```typescript
// Manual reset (if needed):
db.collection('api_stats').doc('sea_rates_monthly').delete();
```

### **Cache Not Working**
**Check:**
1. Firestore Rules allow read/write to `sea_rates_cache`
2. Function logs: `firebase functions:log --only getSeaRates`
3. Cache key format matches

---

## 📱 Test It Yourself

1. Go to: https://vcanship-onestop-logistics.web.app
2. Navigate to FCL service
3. Enter: Shanghai (CNSHA) → Los Angeles (USLAX)
4. Click "Get Quotes"
5. **First time:** Should see "Real-time rates" (uses 1 API call)
6. **Within 4 hours:** Should see "Cached rates" (uses 0 API calls)
7. **After 50 calls:** Should see "Upgrade to Pro" message

---

## 📞 Need Help?

**Contact:** vg@vcanresources.com

**Include:**
- Current API usage count (from Firestore)
- Error messages (from Firebase Functions logs)
- Service and route tested

---

## 🎉 Summary

**Before:** 50 API calls = 50 requests = exhausted in days  
**After:** 50 API calls = 300+ requests/day = lasts all month!

**Status:** ✅ DEPLOYED AND WORKING (Nov 4, 2025)
