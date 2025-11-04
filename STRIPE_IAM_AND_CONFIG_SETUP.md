# 🔐 Stripe Payment IAM & API Keys Setup - CRITICAL

## ⚠️ Required Actions

To enable global payments and live quotes, you must:

1. ✅ Set IAM policy for `createPaymentIntent` (allow all users)
2. ✅ Configure API keys in Firebase Console
3. ✅ Redeploy functions

---

## Step 1: Set IAM Policy for createPaymentIntent

### Option A: Firebase Console (Easiest - 2 minutes)

1. **Go to:** https://console.firebase.google.com/project/vcanship-onestop-logistics/functions
2. **Find:** `createPaymentIntent` function
3. **Click:** Three dots menu (⋮) → **"Edit Permissions"** or **"Permissions"**
4. **Click:** **"+ Add Member"**
5. **Enter:** `allUsers` (literally type "allUsers")
6. **Select Role:** `Cloud Functions Invoker`
7. **Click:** **"Save"**

### Option B: Google Cloud Console

1. **Go to:** https://console.cloud.google.com/functions/list?project=vcanship-onestop-logistics
2. **Click:** `createPaymentIntent`
3. **Go to:** **Permissions** tab
4. **Click:** **"+ Grant Access"**
5. **Principals:** `allUsers`
6. **Role:** `Cloud Functions Invoker`
7. **Click:** **Save**

### Option C: gcloud CLI (If you have it installed)

```bash
gcloud functions add-iam-policy-binding createPaymentIntent \
  --region=us-central1 \
  --member=allUsers \
  --role=roles/cloudfunctions.invoker \
  --project=vcanship-onestop-logistics
```

---

## Step 2: Set API Keys in Firebase Console

### 2.1 Navigate to Functions Configuration

**Go to:** https://console.firebase.google.com/project/vcanship-onestop-logistics/functions/config

### 2.2 Add Environment Variables

Click **"Edit"** or **"Add Variable"** and add these:

#### Required API Keys:

| Variable Name | Description | Where to Get It |
|--------------|-------------|-----------------|
| `SHIPPO_API_KEY` | Shippo API key for parcel quotes | [Shippo Dashboard](https://apps.goshippo.com/dashboard) |
| `SEARATES_API_KEY` | Sea Rates API key for freight quotes | [Sea Rates Dashboard](https://www.searates.com/api/) |
| `STRIPE_SECRET_KEY` | Stripe Secret Key for payments | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |

#### Optional:

| Variable Name | Default Value | Description |
|--------------|---------------|-------------|
| `SEA_RATES_API_URL` | `https://api.searates.com/v1` | Custom Sea Rates API URL (only if different) |

### 2.3 Save Configuration

Click **"Save"** after adding all keys.

---

## Step 3: Deploy Functions

After setting IAM and API keys, redeploy:

```bash
firebase deploy --only functions
```

**Expected Output:**
```
✔  functions[createPaymentIntent(us-central1)] Successful update
✔  functions[getShippoQuotes(us-central1)] Successful update
✔  functions[getSeaRates(us-central1)] Successful update
✔  functions[getHsCode(us-central1)] Successful update
✔  functions[sendQuoteInquiry(us-central1)] Successful update
```

---

## Step 4: Verify Everything Works

### 4.1 Test Payment Flow

1. Go to: https://vcanship-onestop-logistics.web.app
2. Navigate: Parcel Wizard → Select Quote → Payment Page
3. Payment form should load without errors
4. Enter test card: `4242 4242 4242 4242` (Stripe test card)

### 4.2 Test Live Quotes

1. **Parcel Quotes:**
   - Send a parcel (any route)
   - Should see real Shippo quotes
   - No "API unavailable" errors

2. **Sea Freight Quotes:**
   - Go to Sea Freight FCL/LCL
   - Enter container details
   - Should see real Sea Rates quotes

### 4.3 Verify Function Status

```bash
firebase functions:list
```

All functions should show as **deployed** and **callable**.

---

## 🔍 Troubleshooting

### Issue: Payment form doesn't load

**Symptoms:** Error when clicking "Select Quote" button

**Fix:**
1. Check IAM policy is set (Step 1)
2. Verify Stripe key is set in Firebase Console
3. Check function logs: `firebase functions:log --only createPaymentIntent`

### Issue: "No quotes available"

**Symptoms:** Always shows AI fallback quotes

**Fix:**
1. Verify API keys are set in Firebase Console
2. Check API keys are valid (test in respective dashboards)
3. Check function logs: `firebase functions:log --only getShippoQuotes`

### Issue: Functions fail to deploy

**Symptoms:** Deployment errors

**Fix:**
1. Check Firebase authentication: `firebase login --reauth`
2. Verify API keys are valid strings (no extra spaces)
3. Check project permissions: Must be project owner/editor

---

## ✅ Success Checklist

After completing all steps, verify:

- [ ] IAM policy set for `createPaymentIntent` (allUsers can invoke)
- [ ] `SHIPPO_API_KEY` set in Firebase Console
- [ ] `SEARATES_API_KEY` set in Firebase Console
- [ ] `STRIPE_SECRET_KEY` set in Firebase Console
- [ ] Functions redeployed successfully
- [ ] Payment form loads without errors
- [ ] Real quotes fetch from Shippo
- [ ] Real quotes fetch from Sea Rates
- [ ] Test payment processes successfully

---

## 🎉 After Completion

Your platform will have:

✅ **Global Payment Processing** - Stripe works for all users worldwide  
✅ **Live Parcel Quotes** - Real-time Shippo rates  
✅ **Live Freight Quotes** - Real-time Sea Rates pricing  
✅ **Secure Key Management** - All keys in Firebase Console  
✅ **Production Ready** - Fully operational for customers  

---

## 📞 Quick Reference

**Firebase Console Functions:** https://console.firebase.google.com/project/vcanship-onestop-logistics/functions

**Functions Config:** https://console.firebase.google.com/project/vcanship-onestop-logistics/functions/config

**Google Cloud Functions:** https://console.cloud.google.com/functions/list?project=vcanship-onestop-logistics

**Live Site:** https://vcanship-onestop-logistics.web.app

---

**Once all steps are complete, your platform is LIVE for global customers!** 🚀



