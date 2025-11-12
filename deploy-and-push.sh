#!/bin/bash
set -e

# Add gcloud to PATH
export PATH="/home/codespace/google-cloud-sdk/bin:$PATH"

echo "🚀 VCAN Ship Autonomous Deployment"
echo "=================================="
echo "Time: $(date)"
echo ""

# 1. Navigate to project
cd /workspaces/curser-vcan/functions

# 2. Authenticate with service account
echo "✅ Authenticating..."
export GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"
gcloud auth activate-service-account --key-file="./service-account.json" --quiet

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

# 6. Auto-commit and push to GitHub (in case Codespace shuts down)
cd /workspaces/curser-vcan
echo "✅ Checking for changes..."

# Add any new files
git add . --all

# Commit with timestamp
git commit -m "AUTO: Firebase deployment $(date +%Y-%m-%d_%H-%M-%S)" || echo "No changes to commit"

# Push to GitHub
echo "✅ Pushing to GitHub..."
git push origin main

echo ""
echo "✅ GitHub repo updated!"
echo "Your code is safe even if Codespace shuts down."
