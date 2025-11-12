#!/bin/bash
# VCAN Ship Codespace Authentication - Service Account Key Method

echo "🔐 Setting up authentication using Service Account Key..."

# Configuration
export SERVICE_ACCOUNT_KEY_PATH="/workspaces/curser-vcan/.github/firebase-deploy-key.json"
export PROJECT_ID="vcanship-onestop-logistics"

# Check if service account key file exists
if [ ! -f "$SERVICE_ACCOUNT_KEY_PATH" ]; then
    echo "❌ Service account key file not found at: $SERVICE_ACCOUNT_KEY_PATH"
    echo "Please upload your firebase-deploy-*.json key file to /workspaces/curser-vcan/.github/"
    echo "and rename it to firebase-deploy-key.json"
    exit 1
fi

# Activate gcloud with service account key
gcloud auth activate-service-account --key-file="$SERVICE_ACCOUNT_KEY_PATH"

# Set the project
gcloud config set project "$PROJECT_ID"

# Set application default credentials
export GOOGLE_APPLICATION_CREDENTIALS="$SERVICE_ACCOUNT_KEY_PATH"

echo "✅ Authentication successful!"
echo "✅ Service account: $(gcloud config get-value account)"
echo "✅ Project: $(gcloud config get-value project)"
echo "✅ Ready to deploy Firebase Functions"