# Auto-update index.ts to add getShippoQuotesV2 with enforceAppCheck

$filePath = "c:\Users\vijin\curser-vcan\functions\src\index.ts"
$backupPath = "c:\Users\vijin\curser-vcan\functions\src\index.ts.before-v2"

Write-Host "Backing up index.ts to $backupPath" -ForegroundColor Yellow
Copy-Item $filePath $backupPath -Force

Write-Host "Reading file..." -ForegroundColor Cyan
$content = Get-Content $filePath -Raw

# Add V2 imports after the first import line
Write-Host "Adding V2 imports..." -ForegroundColor Cyan
$content = $content -replace "(import \* as functions from 'firebase-functions';)", "`$1`nimport { onCall as onCallV2, HttpsError, CallableRequest } from 'firebase-functions/v2/https';"

# Find the position after getShippoQuotes function and add the V2 version
Write-Host "Adding getShippoQuotesV2 function..." -ForegroundColor Cyan

$newFunction = @'


// V2 Shippo Callable with App Check enforcement
export const getShippoQuotesV2 = onCallV2(
  { 
    enforceAppCheck: true,  // Enables App Check enforcement at platform level
    cors: true
  },
  async (request: CallableRequest) => {
    console.log('[Shippo V2] Callable invoked');
    console.log('[Shippo V2] App Check verified:', !!request.app);
    
    try {
      const requestData = request.data as ShippoCallableData;
      const userEmail = request.auth?.token?.email || requestData.userEmail || 'guest';
      
      const result = await buildShippoResponse(requestData, userEmail);
      
      console.log('[Shippo V2] Callable returning success with', result.quotes?.length || 0, 'quotes');
      return result;
    } catch (error: any) {
      console.error('[Shippo V2] Callable error:', error);
      console.error('[Shippo V2] Error stack:', error?.stack);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      const errorMessage = error?.message || 'Failed to fetch Shippo quotes';
      console.error('[Shippo V2] Throwing HttpsError with message:', errorMessage);
      throw new HttpsError('unavailable', errorMessage);
    }
  }
);
'@

# Insert after the closing of getShippoQuotes function
$content = $content -replace "(\}\);[\r\n]+)(export const getShippoQuotesHTTP)", "`$1$newFunction`n`n`$2"

Write-Host "Writing updated file..." -ForegroundColor Cyan
$content | Set-Content $filePath -NoNewline

Write-Host "Done! index.ts updated successfully." -ForegroundColor Green
Write-Host "Backup saved at: $backupPath" -ForegroundColor Green
