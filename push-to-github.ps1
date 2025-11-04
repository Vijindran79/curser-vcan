# PowerShell script to push all work to GitHub
# Run this script from the vcanship--main directory

Write-Host "=== Pushing all work to GitHub ===" -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path ".git")) {
    Write-Host "Error: Not in a git repository!" -ForegroundColor Red
    exit 1
}

# Check remote URL
Write-Host "Checking remote URL..." -ForegroundColor Yellow
$remoteUrl = git remote get-url origin
Write-Host "Remote: $remoteUrl" -ForegroundColor Cyan
Write-Host ""

# Add all changes
Write-Host "Adding all changes..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to add files" -ForegroundColor Red
    exit 1
}
Write-Host "✓ All files added" -ForegroundColor Green
Write-Host ""

# Check what will be committed
Write-Host "Files to be committed:" -ForegroundColor Yellow
git status --short
Write-Host ""

# Commit
Write-Host "Committing changes..." -ForegroundColor Yellow
$commitMessage = "Restore all 3 days of work - Stripe fixes, prohibited items validation, address validation, Shippo API integration, payment page fixes"
git commit -m $commitMessage
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Commit may have failed or no changes to commit" -ForegroundColor Yellow
}
Write-Host ""

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "Repository: https://github.com/Vijindran79/curser-vcan.git" -ForegroundColor Cyan
Write-Host ""

git push -u origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== SUCCESS! ===" -ForegroundColor Green
    Write-Host "All your work has been pushed to GitHub!" -ForegroundColor Green
    Write-Host "View it at: https://github.com/Vijindran79/curser-vcan" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "=== PUSH FAILED ===" -ForegroundColor Red
    Write-Host "You may need to authenticate with GitHub." -ForegroundColor Yellow
    Write-Host "Try using a Personal Access Token instead of password." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To create a token:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://github.com/settings/tokens" -ForegroundColor Cyan
    Write-Host "2. Generate new token (classic)" -ForegroundColor Cyan
    Write-Host "3. Select 'repo' permissions" -ForegroundColor Cyan
    Write-Host "4. Use token as password when pushing" -ForegroundColor Cyan
}

