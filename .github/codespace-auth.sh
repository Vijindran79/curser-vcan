#!/bin/bash
# VCAN Ship Codespace Authentication Script

echo "🔐 Setting up Workload Identity Federation authentication..."

# Configuration
PROJECT_NUMBER="1069390597654"
POOL_ID="github-codespace-pool"
PROVIDER_ID="github-provider"
SERVICE_ACCOUNT="firebase-deploy@vcanship-onestop-logistics.iam.gserviceaccount.com"

# Generate OIDC token from GitHub (Codespaces automatically provides this)
# This simulates the GitHub Actions token in Codespace environment
export GITHUB_TOKEN=$(cat $GITHUB_TOKEN_PATH 2>/dev/null || echo "")

# Create temporary credentials file
cat > /tmp/federated-creds.json << EOF
{
  "type": "external_account",
  "audience": "//iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}",
  "subject_token_type": "urn:ietf:params:oauth:token-type:jwt",
  "token_url": "https://sts.googleapis.com/v1/token",
  "service_account_impersonation_url": "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SERVICE_ACCOUNT}:generateAccessToken",
  "credential_source": {
    "file": "/tmp/github-token.txt",
    "format": {
      "type": "text"
    }
  }
}
EOF

# Write the actual OIDC token
echo "$GITHUB_TOKEN" > /tmp/github-token.txt

# Activate gcloud with federated credentials
gcloud auth activate-service-account --key-file=/tmp/federated-creds.json

# Set application default credentials
export GOOGLE_APPLICATION_CREDENTIALS="/tmp/federated-creds.json"

echo "✅ Codespace authenticated via Workload Identity Federation"
echo "✅ Ready to deploy Firebase Functions"