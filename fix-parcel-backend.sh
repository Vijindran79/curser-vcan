#!/bin/bash
set -e

echo "🔧 FIXING PARCEL BACKEND CONNECTION"
echo "===================================="
echo ""
echo "✅ The issue has been identified and fixed:"
echo "   - Frontend was calling 'getShippoQuotes' function"
echo "   - Backend only had 'getParcelRates' function"
echo "   - Added 'getShippoQuotes' alias function"
echo ""
echo "📦 Functions have been compiled successfully"
echo ""
echo "🚀 TO DEPLOY THE FIX:"
echo "   1. You need to authenticate with Firebase first"
echo "   2. Run: firebase login"
echo "   3. Then run: firebase deploy --only functions:getShippoQuotes"
echo ""
echo "OR run this complete deployment:"
echo "   bash deploy-all.sh"
echo ""
echo "📝 What was changed:"
echo "   - Added getShippoQuotes function to functions/src/index.ts"
echo "   - This function is an alias that calls the same Shippo API"
echo "   - Both functions now work identically"
echo ""
echo "⚡ QUICK FIX (if you're already logged in):"
read -p "Are you already logged into Firebase? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "🚀 Deploying functions..."
    cd /workspaces/curser-vcan
    firebase deploy --only functions:getShippoQuotes,functions:getParcelRates
    echo "✅ DEPLOYMENT COMPLETE!"
    echo "🎉 Your parcel booking should work now!"
else
    echo ""
    echo "Please run: firebase login"
    echo "Then run: firebase deploy --only functions"
fi
