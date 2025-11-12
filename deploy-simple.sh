#!/bin/bash
set -e

echo "🚀 VCAN Ship Firebase Deployment (Simple Method)"
echo "==============================================="

# 1. Navigate to functions directory
cd /workspaces/curser-vcan/functions

# 2. Setup authentication using service account key
source ../.github/codespace-auth-simple.sh

# 3. Configure Firebase project
firebase use vcanship-onestop-logistics --alias default

# 4. Set environment variables
firebase functions:config:set \
  searates.api_key="${SEARATES_API_KEY}" \
  shippo.api_key="${SHIPPO_API_KEY}" \
  cloudsql.password="${CLOUD_SQL_PASSWORD}" \
  stripe.webhook_secret="${STRIPE_WEBHOOK_SECRET}"

# 5. TypeScript compilation
echo "Compiling TypeScript..."
npx tsc --noEmit

# 6. Deploy
echo "Deploying Firebase Functions..."
firebase deploy --only functions --project vcanship-onestop-logistics

echo "✅ Deployment complete!"
echo "Check functions at: https://console.firebase.google.com/project/vcanship-onestop-logistics/functions"