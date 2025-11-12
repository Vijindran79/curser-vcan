#!/bin/bash
set -e

echo "🚀 VCAN Ship Firebase Deployment (Firebase Login Method)"
echo "======================================================="
echo "Time: $(date)"
echo ""

# 1. Navigate to project
cd /workspaces/curser-vcan/functions

# 2. Login to Firebase (interactive - you'll need to paste a token)
echo "🔐 Please login to Firebase..."
firebase login --no-localhost

# 3. Set Firebase project
echo "✅ Setting Firebase project..."
firebase use vcanship-onestop-logistics --alias default

# 4. Compile TypeScript
echo "✅ Compiling TypeScript..."
npx tsc --noEmit

# 5. Deploy to Firebase
echo "✅ Deploying functions..."
firebase deploy --only functions --project vcanship-onestop-logistics

echo ""
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "Function URLs will be displayed above"
echo ""

# 6. Show deployed functions
echo "✅ Listing deployed functions..."
firebase functions:list --project vcanship-onestop-logistics