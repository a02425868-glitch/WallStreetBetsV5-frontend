#!/bin/bash
# Setup Stripe integration quickly

set -e

echo "🔧 Stripe Integration Setup"
echo "---"

# Get Stripe secret key from user
echo ""
read -p "Enter your Stripe Secret Key (sk_test_... or sk_live_...): " STRIPE_KEY

if [ -z "$STRIPE_KEY" ]; then
  echo "❌ Error: Stripe Secret Key is required"
  exit 1
fi

if [[ ! $STRIPE_KEY =~ ^sk_(test|live)_ ]]; then
  echo "❌ Error: Invalid Stripe Secret Key format. Should start with 'sk_test_' or 'sk_live_'"
  exit 1
fi

# Get Price ID from user
echo ""
read -p "Enter your Stripe Price ID (price_...) [press Enter to skip and do manually]: " PRICE_ID

# Set secret in Supabase
echo ""
echo "📤 Setting STRIPE_SECRET_KEY in Supabase..."
supabase secrets set STRIPE_SECRET_KEY="$STRIPE_KEY"

if [ $? -eq 0 ]; then
  echo "✅ Secret set successfully!"
else
  echo "❌ Failed to set secret. Make sure you're in the frontend directory and supabase CLI is authenticated."
  exit 1
fi

# Update price ID if provided
if [ ! -z "$PRICE_ID" ]; then
  echo ""
  echo "📝 Updating Price ID in create-checkout function..."
  
  # Update the price ID in the function (macOS/Linux compatible)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/price_1Sz2tgFyU1b6e0605Y5FMXnE/$PRICE_ID/g" supabase/functions/create-checkout/index.ts
  else
    sed -i "s/price_1Sz2tgFyU1b6e0605Y5FMXnE/$PRICE_ID/g" supabase/functions/create-checkout/index.ts
  fi
  
  echo "✅ Price ID updated!"
  echo ""
  echo "🚀 Redeploying create-checkout function..."
  supabase functions deploy create-checkout --use-api
  
  if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
  else
    echo "⚠️  Function deployment had issues. Try manually: supabase functions deploy create-checkout --use-api"
  fi
fi

echo ""
echo "✨ Stripe integration setup complete!"
echo ""
echo "Next steps:"
echo "1. Go to https://stonksradar.pages.dev"
echo "2. Sign in"
echo "3. Go to Profile → Buy Premium"
echo "4. Click 'Pay $9.99' to test"
echo ""
echo "Use test card: 4242 4242 4242 4242 (expiry: 12/25, CVC: 123)"
