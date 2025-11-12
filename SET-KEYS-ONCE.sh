#!/bin/bash

# Run this ONE TIME to store all API keys
cd /workspaces/curser-vcan/functions

echo "🔐 Storing API keys in Firebase Functions config..."

read -p "Enter SEARATES_API_KEY: " SEARATES_API_KEY
read -p "Enter SHIPPO_API_KEY: " SHIPPO_API_KEY
read -p "Enter CLOUD_SQL_PASSWORD: " CLOUD_SQL_PASSWORD
read -p "Enter STRIPE_WEBHOOK_SECRET: " STRIPE_WEBHOOK_SECRET

firebase functions:config:set \
  searates.key="$SEARATES_API_KEY" \
  shippo.key="$SHIPPO_API_KEY" \
  cloudsql.password="$CLOUD_SQL_PASSWORD" \
  stripe.webhook_secret="$STRIPE_WEBHOOK_SECRET" \
  cloudsql.instance="vcanship-onestop-logistics:us-central1:vcanship-db"

echo "✅ Keys stored permanently! You never need to enter them again."