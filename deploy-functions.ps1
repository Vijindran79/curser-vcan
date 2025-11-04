# PowerShell Script to Deploy Firebase Functions
# Uses Application Default Credentials (ADC) - No Service Account Key Needed!

Write-Host "🚀 Deploying Firebase Functions..." -ForegroundColor Green

# Check if Firebase CLI is installed
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Firebase CLI not found. Installing..." -ForegroundColor Red
    npm install -g firebase-tools
}

# Check if logged in
Write-Host "📋 Checking Firebase login status..." -ForegroundColor Yellow
firebase login:list

# Navigate to functions directory
Write-Host "📦 Building functions..." -ForegroundColor Yellow
cd functions
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Go back to root
cd ..

# Deploy functions
Write-Host "🚀 Deploying to Firebase..." -ForegroundColor Green
Write-Host "   (Using Application Default Credentials - no key needed!)" -ForegroundColor Cyan
firebase deploy --only functions

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host "🎉 Functions are now live!" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed. Check error messages above." -ForegroundColor Red
}



