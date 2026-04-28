# WallStreetBets Frontend - Production Deployment Guide

Your frontend is **fully deployed** to Cloudflare Pages at https://stonksradar.pages.dev

## Current Status

✅ **Frontend**: Deployed to Cloudflare Pages  
✅ **Backend**: Supabase database schema deployed  
✅ **Edge Functions**: All 17 functions deployed  
✅ **Authentication**: Supabase Auth working  
✅ **Payments**: Ready for Stripe integration  

## What's Working

- User authentication (sign in/sign up with email)
- Dashboard pages (load gracefully without data backend configured)
- Profile viewing
- Payment UI components
- Alert management UI
- Real-time data endpoints (infrastructure ready)

## What Needs Stripe Setup

To enable the **Pay $9.99** button and process payments:

### Quick Setup (2 minutes)

**Windows:**
```powershell
cd frontend
.\setup-stripe.ps1
```

**Mac/Linux:**
```bash
cd frontend
chmod +x setup-stripe.sh
./setup-stripe.sh
```

**Manual Setup:**
See `STRIPE_SETUP.md` in the frontend folder.

## Architecture

```
Frontend (Cloudflare Pages)
    ↓ (auth tokens via CORS)
Edge Functions (Supabase)
    ↓ (service role)
Supabase Postgres
    ↓ (auth API)
Supabase Auth
```

### Key Files

- `frontend/src/features/payment/hooks/usePayment.tsx` - Payment logic
- `frontend/supabase/functions/create-checkout/index.ts` - Stripe session creation
- `frontend/STRIPE_SETUP.md` - Setup instructions
- `frontend/setup-stripe.ps1` - Windows automation script
- `frontend/setup-stripe.sh` - Mac/Linux automation script

## Testing Payment Flow

1. Go to https://stonksradar.pages.dev
2. Sign in with any email (test account)
3. Navigate to **Profile** → **Buy Premium**
4. Click **Pay $9.99**
5. Use Stripe test card: `4242 4242 4242 4242` (exp: 12/25, CVC: 123)

## Environment Variables Configured

### Frontend (via Vite `define`):
- `VITE_SUPABASE_URL` = `https://pwuwhmnhlaqfyxpswgtn.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_UzV4h0kGINkEEyZu2LS8Ow_Qvnx4Z46`

### Edge Functions (Supabase secrets):
- `STRIPE_SECRET_KEY` = *Not yet set (run setup-stripe.ps1)*
- Service Role Key = Already configured in function deployment

## Deployed Edge Functions

All 18 functions are live:

**Payment Processing:**
- `check-payment` - Check subscription status
- `create-checkout` - Create Stripe session

**Alerts:**
- `create-alert`, `get-alerts`, `get-alert-history`, `delete-alert`, `clear-alert-history`, `log-alert`

**Data Retrieval:**
- `get-leaderboard`, `get-trends-data`, `get-live-feed`, `get-ticker-detail`, `get-ticker-summaries`, `get-available-tickers`, `get-hourly-stats`

**Maintenance:**
- `cleanup-live-feed`, `cleanup-retention`

## CORS Configuration

All Edge Functions accept requests from `https://stonksradar.pages.dev` and allow required Supabase client headers:
- `authorization`
- `x-client-info`
- `apikey`
- `content-type`
- `x-supabase-client-platform`
- `x-supabase-client-version`

## Next Steps

1. **Set up Stripe** (run `setup-stripe.ps1` or `setup-stripe.sh`)
2. **Test payment flow** (use test card above)
3. **Configure real data backend** (Reddit ingestion, market data, etc.)
4. **Enable live features** (leaderboard, trends, notifications require backend data)

## Troubleshooting

### Payment button doesn't work
- Make sure you ran the Stripe setup script
- Check Supabase Edge Functions → Secrets to verify `STRIPE_SECRET_KEY` is set
- Use browser DevTools → Network tab to see the actual error

### "Not authenticated" error
- Sign in first at https://stonksradar.pages.dev
- Make sure your session is not expired

### Edge Function times out
- Verify the function is deployed: `supabase functions list`
- Check logs: `supabase functions logs <function-name>`

## Deployment

The frontend auto-deploys via GitHub Actions whenever you push to the `main` branch:

```bash
git push origin clean-main:main
```

Backend functions redeploy with:
```bash
supabase functions deploy --use-api
```

## Support

For setup help, see:
- `STRIPE_SETUP.md` - Detailed Stripe instructions
- `BACKEND_SETUP.md` - Backend requirements
- Supabase docs: https://supabase.com/docs
