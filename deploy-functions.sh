#!/bin/bash
# Bash Script to Deploy Firebase Functions
# Uses Application Default Credentials (ADC) - No Service Account Key Needed!

echo "🚀 Deploying Firebase Functions..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check if logged in
echo "📋 Checking Firebase login status..."
firebase login:list

# Navigate to functions directory
echo "📦 Building functions..."
cd functions
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Go back to root
cd ..

# Deploy functions
echo "🚀 Deploying to Firebase..."
echo "   (Using Application Default Credentials - no key needed!)"
firebase deploy --only functions

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🎉 Functions are now live!"
else
    echo "❌ Deployment failed. Check error messages above."
fi



