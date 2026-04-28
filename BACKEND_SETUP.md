# Backend Setup Guide

## Current Status

Your frontend is now **deployed to Cloudflare Pages** at `https://stonksradar.pages.dev/` and is **connected to your Supabase project** (`pwuwhmnhlaqfyxpswgtn.supabase.co`).

However, **the backend schema and Edge Functions are not yet deployed** to this Supabase project. The frontend gracefully degrades when the backend is missing, but you need to deploy the backend to enable:

- User profiles and subscription management
- Payment checking and promo code redemption  
- Edge Functions for payment processing
- Real-time data endpoints

## Option 1: Deploy Backend via Supabase CLI (Recommended)

### Requirements
1. **Supabase access token** (from https://supabase.com/dashboard/account/tokens)
2. **Service Role Key** (from https://supabase.com/dashboard/[project-id]/settings/api)

### Steps

```bash
# 1. Navigate to frontend directory
cd c:\Users\camjo\Desktop\WallStreetBetsV5\frontend

# 2. Link to your Supabase project
supabase link --project-ref pwuwhmnhlaqfyxpswgtn

# 3. Deploy migrations to Supabase
supabase db push

# 4. Deploy Edge Functions
supabase functions deploy
```

This will:
- Create all database tables (profiles, notifications, tickers_whitelist, etc.)
- Set up Row Level Security policies
- Deploy Edge Functions (check-payment, create-checkout, etc.)

## Option 2: Manual Deployment via Supabase Dashboard

If CLI doesn't work, manually execute the SQL migrations:

1. Go to https://supabase.com/dashboard
2. Select your project `pwuwhmnhlaqfyxpswgtn`
3. Go to **SQL Editor** → **New Query**
4. Copy and paste migration files from `supabase/migrations/`:
   - `20260216000000_new_schema.sql` (main schema)
   - Any other migration files in order
5. Click **Run**

## Option 3: Use Different Supabase Project

If you have another Supabase project with the backend already deployed:

1. Get the **URL** and **PUBLISHABLE_KEY** from that project
2. Update `vite.config.ts`:
   ```typescript
   'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
     process.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co'
   ),
   'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(
     process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'YOUR_KEY'
   ),
   ```
3. Commit and push to deploy

## What Works Now (Without Backend)

- ✅ Authentication (Supabase Auth)
- ✅ Frontend UI and routing
- ✅ Dashboard pages (gracefully degrade without live data)
- ✅ Profile viewing (shows auth info)
- ✅ Subscription display (defaults to "free tier")

## What's Blocked (Until Backend Deploys)

- ❌ Payment checking
- ❌ Promo code redemption  
- ❌ Stripe checkout
- ❌ Live feed / leaderboard data
- ❌ Trend data endpoints

## After Backend Deployment

Once the backend is migrated and Edge Functions are deployed:

1. Update environment variables in **Cloudflare Pages** settings:
   - Add `STRIPE_SECRET_KEY` (for payment processing)
   - Add `PROMO_CODE` (optional, for hardcoded promo)

2. Test payment flow:
   - Log in at https://stonksradar.pages.dev
   - Go to Profile → Buy Premium
   - Payment features should now work

## Troubleshooting

### "profiles table not found"
→ Run `supabase db push` or manually execute migrations

### "CORS error on check-payment function"
→ Edge Functions not deployed. Run `supabase functions deploy`

### "Unauthorized" on REST API calls
→ Check Row Level Security (RLS) policies are created correctly

## Need Help?

If migrations fail or you need the backend deployed, provide:
1. Your Supabase **project URL**
2. Your Supabase **service role key** (secret)
3. Whether you want CLI deployment or manual SQL execution
