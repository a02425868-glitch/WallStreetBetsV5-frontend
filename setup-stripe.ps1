# Setup Stripe integration on Windows

Write-Host "🔧 Stripe Integration Setup" -ForegroundColor Green
Write-Host "---"

# Get Stripe secret key from user
Write-Host ""
$STRIPE_KEY = Read-Host "Enter your Stripe Secret Key (sk_test_... or sk_live_...)"

if ([string]::IsNullOrEmpty($STRIPE_KEY)) {
  Write-Host "❌ Error: Stripe Secret Key is required" -ForegroundColor Red
  exit 1
}

if ($STRIPE_KEY -notmatch "^sk_(test|live)_") {
  Write-Host "❌ Error: Invalid Stripe Secret Key format. Should start with 'sk_test_' or 'sk_live_'" -ForegroundColor Red
  exit 1
}

# Get Price ID from user
Write-Host ""
$PRICE_ID = Read-Host "Enter your Stripe Price ID (price_...) [press Enter to skip and do manually]"

# Set secret in Supabase
Write-Host ""
Write-Host "📤 Setting STRIPE_SECRET_KEY in Supabase..."
supabase secrets set STRIPE_SECRET_KEY="$STRIPE_KEY"

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Secret set successfully!" -ForegroundColor Green
} else {
  Write-Host "❌ Failed to set secret. Make sure you're in the frontend directory and supabase CLI is authenticated." -ForegroundColor Red
  exit 1
}

# Update price ID if provided
if (![string]::IsNullOrEmpty($PRICE_ID)) {
  Write-Host ""
  Write-Host "📝 Updating Price ID in create-checkout function..."
  
  $filePath = "supabase/functions/create-checkout/index.ts"
  $content = Get-Content $filePath -Raw
  $content = $content -replace "price_1Sz2tgFyU1b6e0605Y5FMXnE", $PRICE_ID
  Set-Content $filePath $content
  
  Write-Host "✅ Price ID updated!" -ForegroundColor Green
  Write-Host ""
  Write-Host "🚀 Redeploying create-checkout function..."
  supabase functions deploy create-checkout --use-api
  
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Function deployed successfully!" -ForegroundColor Green
  } else {
    Write-Host "⚠️  Function deployment had issues. Try manually: supabase functions deploy create-checkout --use-api" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "✨ Stripe integration setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Go to https://stonksradar.pages.dev"
Write-Host "2. Sign in"
Write-Host "3. Go to Profile → Buy Premium"
Write-Host "4. Click 'Pay £9.99' to test"
Write-Host ""
Write-Host "Use test card: 4242 4242 4242 4242 (expiry: 12/25, CVC: 123)"
