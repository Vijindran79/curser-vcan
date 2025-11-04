# 🚀 VCanship Deployment Instructions

## Quick Deploy to Firebase

Your app is ready to deploy to **vcanresources.com**

### Step 1: Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

That's it! Your app will be live at https://vcanresources.com

---

## Complete Deployment Guide

### Prerequisites
- ✅ Firebase CLI installed
- ✅ Logged in as vg@vcanresources.com
- ✅ Project: vcanship-onestop-logistics
- ✅ Build successful: `npm run build`

### Deploy Everything

```bash
# 1. Build your app
npm run build

# 2. Deploy hosting
firebase deploy --only hosting

# 3. Deploy functions (optional)
firebase deploy --only functions

# 4. Deploy rules (optional)
firebase deploy --only firestore:rules
```

### Deploy Specific Parts

```bash
# Hosting only
firebase deploy --only hosting

# Functions only
firebase deploy --only functions

# Firestore rules only
firebase deploy --only firestore:rules
```

---

## Domain Configuration

Your app is configured for:
- **Primary Domain:** vcanresources.com
- **Firebase URL:** vcanship-onestop-logistics.web.app
- **Firebase Host:** vcanship-onestop-logistics.firebaseapp.com

---

## GitHub Setup (Optional)

If you want to push to GitHub:

```bash
# 1. Create repository on GitHub
# 2. Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/vcanship.git

# 3. Push code
git push origin main
```

---

## Verify Deployment

After deployment:

1. Visit https://vcanresources.com
2. Test parcel booking:
   - Click "Send Parcel"
   - Fill steps 1-4
   - Verify quotes show
   - Test quote selection
   - Verify payment page
3. Check all services load
4. Test authentication

---

## Rollback (If Needed)

```bash
# View deployment history
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:clone SOURCE-SITE-ID:SOURCE-CHANNEL-ID
```

---

## Monitor Your App

1. **Firebase Console:**
   - https://console.firebase.google.com/project/vcanship-onestop-logistics

2. **Analytics:**
   - View user activity
   - Track conversions
   - Monitor errors

3. **Logs:**
   ```bash
   firebase functions:log
   ```

---

## Support

- **Firebase Docs:** https://firebase.google.com/docs
- **CLI Reference:** `firebase help`
- **Troubleshooting:** See TROUBLESHOOTING.md

---

## 🎉 You're Ready!

Everything is configured and ready to deploy. Just run:

```bash
firebase deploy --only hosting
```

Your app will be live in ~30 seconds!



