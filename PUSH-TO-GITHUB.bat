@echo off
echo ========================================
echo Pushing all work to GitHub...
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Adding all changes...
git add .
if errorlevel 1 (
    echo ERROR: Failed to add files
    pause
    exit /b 1
)
echo Done!
echo.

echo Step 2: Committing changes...
git commit -m "Complete 3 days work - Stripe payment fixes, prohibited items validation, address validation, Shippo API integration"
if errorlevel 1 (
    echo Warning: No changes to commit or commit failed
)
echo Done!
echo.

echo Step 3: Pushing to GitHub...
echo Repository: https://github.com/Vijindran79/curser-vcan.git
echo.
git push -u origin main

if errorlevel 1 (
    echo.
    echo ========================================
    echo PUSH FAILED - Authentication Required
    echo ========================================
    echo.
    echo You need to authenticate with GitHub.
    echo.
    echo Option 1: Use Personal Access Token
    echo   1. Go to: https://github.com/settings/tokens
    echo   2. Click "Generate new token (classic)"
    echo   3. Select "repo" permissions
    echo   4. Copy the token
    echo   5. Run this script again
    echo   6. When asked for password, paste the token
    echo.
    echo Option 2: Set up Git Credential Manager
    echo   Run: git config --global credential.helper manager
    echo.
    pause
    exit /b 1
) else (
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo.
    echo All your work has been pushed to GitHub!
    echo View it at: https://github.com/Vijindran79/curser-vcan
    echo.
)

pause

