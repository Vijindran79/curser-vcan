# 🚀 VCAN Ship Firebase Deployment Guide

## ✅ COMPLETED SETUP

**All Google Cloud configurations are complete:**
- ✅ Workload Identity Pool: `github-codespace-pool`
- ✅ OIDC Provider: `github-provider` 
- ✅ Service Account: `firebase-deploy@vcanship-onestop-logistics.iam.gserviceaccount.com`

## 📋 WHAT YOU NEED TO DO NOW

### **STEP 1: Upload Your Service Account Key**

You downloaded a JSON key file from Google Cloud Console. Now upload it to your Codespace:

1. In VS Code (your Codespace), go to the file explorer
2. Navigate to `.github/` folder
3. Drag and drop your downloaded JSON key file here
4. **Rename it to:** `firebase-deploy-key.json`

**Expected file location:** `/workspaces/curser-vcan/.github/firebase-deploy-key.json`

---

### **STEP 2: Set Your API Keys as Environment Variables**

In your Codespace terminal, run these commands (replace with your actual keys):

```bash
export SEARATES_API_KEY="your_actual_searates_key_here"
export SHIPPO_API_KEY="your_actual_shippo_key_here"
export CLOUD_SQL_PASSWORD="your_actual_db_password_here"
export STRIPE_WEBHOOK_SECRET="your_actual_stripe_secret_here"
```

**To make these permanent for this session,** add them to a `.env` file:

```bash
cat > /workspaces/curser-vcan/.env << EOF
SEARATES_API_KEY="your_actual_searates_key_here"
SHIPPO_API_KEY="your_actual_shippo_key_here"
CLOUD_SQL_PASSWORD="your_actual_db_password_here"
STRIPE_WEBHOOK_SECRET="your_actual_stripe_secret_here"
EOF
```

Then load them:
```bash
source /workspaces/curser-vcan/.env
```

---

### **STEP 3: Run the Deployment**

Execute this single command:

```bash
/workspaces/curser-vcan/deploy-simple.sh
```

**What this script does:**
1. ✅ Authenticates with your service account key
2. ✅ Sets up Firebase project
3. ✅ Configures environment variables
4. ✅ Compiles TypeScript
5. ✅ Deploys all Firebase Functions
6. ✅ Shows deployment status

---

### **STEP 4: Verify Deployment**

After deployment completes, check your functions:

```bash
firebase functions:list --project vcanship-onestop-logistics
```

**You should see ~20 functions with "ACTIVE" status.**

---

## 🔧 TROUBLESHOOTING

### **If you get "Service account key file not found":**
- Make sure you uploaded the JSON key file to `/workspaces/curser-vcan/.github/`
- Make sure you renamed it to `firebase-deploy-key.json`
- Check the file exists: `ls -la /workspaces/curser-vcan/.github/firebase-deploy-key.json`

### **If deployment fails with authentication errors:**
- Verify your service account has "Firebase Admin" and "Cloud Functions Admin" roles
- Check the key file is valid JSON and not corrupted

### **If you need to test authentication first:**
```bash
source /workspaces/curser-vcan/.github/codespace-auth-simple.sh
gcloud auth list
```

---

## 📊 EXPECTED OUTPUT

When deployment succeeds, you'll see:

```
🚀 VCAN Ship Firebase Deployment
===============================
🔐 Setting up authentication using Service Account Key...
✅ Authentication successful!
✅ Service account: firebase-deploy@vcanship-onestop-logistics.iam.gserviceaccount.com
✅ Project: vcanship-onestop-logistics
✅ Ready to deploy Firebase Functions

=== Deploying to 'vcanship-onestop-logistics'...

i  deploying functions
✔  functions: Finished running predeploy script.
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
✔  functions: required API cloudfunctions.googleapis.com is enabled
i  functions: preparing functions directory for uploading...
i  functions: packaged functions (X MB) for uploading
✔  functions: functions folder uploaded successfully
i  functions: creating Node.js X function...
i  functions: creating Node.js Y function...
...
✔  functions[function-name]: Successful create operation
✔  functions: all functions deployed successfully!

✅ Deployment complete!
Check functions at: https://console.firebase.google.com/project/vcanship-onestop-logistics/functions
```

---

## 🎯 READY TO DEPLOY?

**Once you have:**
1. ✅ Uploaded the service account key file
2. ✅ Set your API keys as environment variables

**Run this command:**
```bash
/workspaces/curser-vcan/deploy-simple.sh
```

**Reply with "DEPLOYING" when you start, or share any errors you see!**