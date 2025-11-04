@echo off
echo ========================================
echo Pushing all work to GitHub
echo Repository: https://github.com/Vijindran79/curser-vcan.git
echo ========================================
echo.

cd /d "%~dp0"

set /p commitmsg=Enter commit message (or press Enter for default): 
if "%commitmsg%"=="" set commitmsg=Restore/backup all files - Complete 3 days work

echo.
echo Step 1: Adding all files...
git add .
if errorlevel 1 (
    echo ERROR: Failed to add files
    pause
    exit /b 1
)
echo Done!
echo.

echo Step 2: Committing changes...
git commit -m "%commitmsg%"
if errorlevel 1 (
    echo Warning: No changes to commit or commit failed
)
echo Done!
echo.

echo Step 3: Setting branch to main...
git branch -M main
echo Done!
echo.

echo Step 4: Updating remote repository...
git remote remove origin
git remote add origin https://github.com/Vijindran79/curser-vcan.git
echo Done!
echo.

echo Step 5: Pushing to GitHub...
echo.
echo When prompted:
echo   Username: Vijindran79
echo   Password: (paste your Personal Access Token)
echo.
echo Get token at: https://github.com/settings/tokens
echo.
git push -u origin main

if errorlevel 1 (
    echo.
    echo ========================================
    echo PUSH FAILED
    echo ========================================
    echo.
    echo If authentication failed:
    echo 1. Go to: https://github.com/settings/tokens
    echo 2. Generate new token (classic) with "repo" permission
    echo 3. Copy the token
    echo 4. Run this script again
    echo 5. Use token as password when prompted
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
