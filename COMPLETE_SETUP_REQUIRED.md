# 🎯 Complete Stripe Setup - Final Steps Required

## ⚠️ **CRITICAL: 2 Manual Steps Required**

Your Stripe function is deployed, but **2 things** are blocking it from working:

1. ❌ Stripe secret key not configured
2. ❌ IAM permissions not set (public access blocked)

---

## ✅ **Step 1: Set Stripe Secret Key**

### Method A: Firebase Console (Recommended)
1. Go to: https://console.firebase.google.com/project/vcanship-onestop-logistics/functions/config
2. Click **"Edit"** or **"+ Add Variable"**
3. Add:
   - **Variable:** `STRIPE_SECRET_KEY`
   - **Value:** `[Your Stripe Secret Key from Stripe Dashboard]`
4. Click **"Save"**

### Method B: Firebase CLI
```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
# When prompted, paste: [Your Stripe Secret Key from Stripe Dashboard]
```

---

## ✅ **Step 2: Set Public IAM Permissions**

Without this, users will get **403 Forbidden** when trying to pay.

### Firebase Console Method:
1. Go to: https://console.firebase.google.com/project/vcanship-onestop-logistics/functions
2. Find `createPaymentIntent(us-central1)` in the list
3. Click the function name
4. Click **"Permissions"** tab
5. Click **"+ Add Member"** or **"Grant Access"**
6. Add:
   - **Principals:** `allUsers`
   - **Role:** `Cloud Functions Invoker` (for v2, it may be `Cloud Run Invoker`)
7. Click **"Save"**

### Alternative: Google Cloud Console
1. Go to: https://console.cloud.google.com/run?project=vcanship-onestop-logistics
2. Find `createpaymentintent` service
3. Click **Permissions** tab
4. Click **"+ Grant Access"**
5. Add `allUsers` with `Cloud Run Invoker` role
6. Click **Save**

---

## ✅ **Step 3: Redeploy Function**

After setting the secret key, redeploy:

```bash
cd functions
firebase deploy --only functions:createPaymentIntent
```

---

## ✅ **Step 4: Verify**

### Check Logs:
```bash
firebase functions:log --only createPaymentIntent -n 5
```

You should see:
- ✅ `Stripe initialized successfully`
- ❌ NOT: `Stripe API key not configured`

### Test Payment Flow:
1. Go to: https://vcanship-onestop-logistics.web.app
2. Click "Send a Parcel"
3. Fill in the wizard
4. Select "Aramex Standard" or any quote
5. Click "Select & Continue"
6. Enter test card:
   - Card: `4242 4242 4242 4242`
   - Date: `04/29`
   - CVC: `123`
7. **Should see:** ✅ Green checkmark "Payment Succeeded"

---

## 🎯 **Current Status**

| Component | Status |
|-----------|--------|
| Function deployed | ✅ Done |
| Express + CORS configured | ✅ Done |
| Frontend HTTP calls | ✅ Done |
| Stripe secret key | ❌ **NOT SET** |
| IAM public access | ❌ **NOT SET** |

---

## 📞 **Need Help?**

If you get stuck:
1. Take a screenshot of the error message
2. Share the Firebase Console URL you're on
3. Paste the logs from `firebase functions:log`

---

**Once both steps are complete, Stripe payments will work for all users!** 🚀

