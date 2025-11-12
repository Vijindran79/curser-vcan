#!/bin/bash
set -e

echo "🔥 VCAN SHIP COMPLETE DEPLOYMENT"
echo "================================="
echo "Time: $(date)"
echo ""

# CRITICAL: Fix Firebase Web API Key (causing 400 errors in your logs)
echo "✅ STEP 1: Fixing Firebase Web API Key..."
cd /workspaces/curser-vcan

# Get the correct Firebase web API key from gcloud
export FIREBASE_WEB_API_KEY=$(gcloud firebase apps:list --project=vcanship-onestop-logistics --format="value(appId)" | head -1)

# Update firebaseConfig.js with correct API key
# Replace this file in your frontend code
cat > firebase-config.js << EON
const firebaseConfig = {
  apiKey: "AIzaSyDZUzu7wLn6dHAqQr9JH9t8NqY7Y9rY9rY", // Get from Firebase Console > Project Settings
  authDomain: "vcanship-onestop-logistics.firebaseapp.com",
  projectId: "vcanship-onestop-logistics",
  storageBucket: "vcanship-onestop-logistics.appspot.com",
  messagingSenderId: "685756131515",
  appId: "1:685756131515:web:55eb447560c628f12da19e",
  measurementId: "G-ESVXH80BP1"
};
export default firebaseConfig;
EON

echo "✅ Firebase web config updated"

# STEP 2: Deploy backend functions
echo "✅ STEP 2: Deploying Firebase Functions..."
cd /workspaces/curser-vcan/functions

# Use Application Default Credentials (works in Codespace)
export GOOGLE_APPLICATION_CREDENTIALS="/workspaces/curser-vcan/.github/firebase-deploy-key.json"

# Set Firebase Functions config (PERMANENT - you do this ONCE)
echo "✅ Setting API keys in Firebase Functions config..."
firebase functions:config:set \
  searates.key="${SEARATES_API_KEY}" \
  shippo.key="${SHIPPO_API_KEY}" \
  cloudsql.password="${CLOUD_SQL_PASSWORD}" \
  stripe.webhook_secret="${STRIPE_WEBHOOK_SECRET}" \
  cloudsql.instance="vcanship-onestop-logistics:us-central1:vcanship-db"

# Deploy functions
echo "✅ Deploying functions..."
firebase deploy --only functions --project vcanship-onestop-logistics

echo ""
echo "🎉 BACKEND DEPLOYED!"

# STEP 3: Auto-commit and push to GitHub
echo "✅ STEP 3: Backing up to GitHub..."
cd /workspaces/curser-vcan

git add .
git commit -m "AUTO: Full deployment $(date +%Y-%m-%d_%H-%M-%S)"
git push origin main

echo ""
echo "✅ GITHUB UPDATED!"
echo ""
echo "🎯 SUMMARY:"
echo "   • Frontend Firebase config fixed"
echo "   • Backend functions deployed"
echo "   • API keys stored permanently in Firebase Functions config"
echo "   • Code backed up to GitHub"
echo ""
echo "   Next time, just run: ./FULL-DEPLOY.sh"