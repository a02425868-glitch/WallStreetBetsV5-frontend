# Stripe Integration Setup

## Quick Start

### Step 1: Get Your Stripe Keys

1. Go to https://stripe.com and create an account (or login)
2. Navigate to Developers → API Keys
3. Copy your **Secret Key** (starts with `sk_test_` for testing or `sk_live_` for production)

### Step 2: Set the Secret in Supabase

Run ONE of these commands:

#### Option A: Via CLI (Recommended)
```bash
cd frontend
supabase secrets set STRIPE_SECRET_KEY="your_stripe_secret_key_here"
```

#### Option B: Via Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/pwuwhmnhlaqfyxpswgtn
2. Settings → Edge Functions → Secrets
3. Add new secret:
   - Name: `STRIPE_SECRET_KEY`
   - Value: Your Stripe secret key

### Step 3: Get Your Product/Price ID

1. In Stripe Dashboard: Products → Create Product
2. Name: "Premium Access"
3. Price: $9.99
4. Copy the **Price ID** (starts with `price_`)

### Step 4: Update the Create-Checkout Function

Edit `supabase/functions/create-checkout/index.ts` and replace the price ID:

```typescript
line_items: [
  {
    price: "price_YOUR_COPIED_PRICE_ID",  // ← Replace this
    quantity: 1,
  },
],
```

Then redeploy:
```bash
supabase functions deploy create-checkout --use-api
```

### Step 5: Test

1. Go to https://stonksradar.pages.dev
2. Sign in
3. Go to Profile → Buy Premium
4. Click "Pay $9.99"
5. You'll be redirected to Stripe's test checkout

---

## Testing with Stripe Test Cards

Use these test card numbers:

| Card | Number | Expiry | CVC |
|------|--------|--------|-----|
| Success | 4242 4242 4242 4242 | 12/25 | 123 |
| Decline | 4000 0000 0000 0002 | 12/25 | 123 |

---

## Troubleshooting

### "Error: STRIPE_SECRET_KEY is not set"
- Confirm you ran `supabase secrets set` correctly
- Redeploy the function after setting the secret
- Check Supabase Dashboard → Edge Functions → Secrets to verify it was saved

### "Checkout failed"
- Verify your Price ID is correct (starts with `price_`)
- Make sure you're using a valid Stripe secret key
- Check browser console for detailed error messages

### "Payment not processing"
- Use a valid test card number from the table above
- Make sure you have a Stripe account with test mode enabled

---

## Going Live

When ready for production:

1. Switch to Live Keys in Stripe Dashboard
2. Set `STRIPE_SECRET_KEY` to your live secret key
3. Update your product price to real amounts
4. Update success/cancel URLs to your production domain
5. Enable production in Stripe Dashboard
