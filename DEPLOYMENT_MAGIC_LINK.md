# 🚀 Magic Link Authentication - Deployment Guide

## Status
All code is ready to deploy. Run these commands from your Windows PowerShell in the project root directory.

## ⚡ Quick Deployment (Windows PowerShell)

```powershell
# 1. Deploy database migration
supabase db push

# 2. Deploy create-magic-link function
supabase functions deploy create-magic-link --no-verify-jwt

# 3. Deploy verify-magic-link function
supabase functions deploy verify-magic-link --no-verify-jwt

# 4. Redeploy notify-email (with magic link support)
supabase functions deploy notify-email --no-verify-jwt
```

## 📋 What's Being Deployed

### Database Migration
**File:** `supabase/migrations/20260307150000_create_magic_link_tokens.sql`
- Creates `magic_link_tokens` table for temporary access tokens
- Adds RLS policies for public access
- Creates indexes for fast lookups

### Edge Functions
**1. create-magic-link**
- Endpoint: `POST /functions/v1/create-magic-link`
- Receives: `{name, email, organization?, use_case?}`
- Generates 24-hour access token
- Sends magic link email via Resend
- Returns: `{ok: true, message: "Check your email..."}`

**2. verify-magic-link**
- Endpoint: `POST /functions/v1/verify-magic-link`
- Receives: `{token}`
- Validates token existence, expiry, and usage
- Creates new Supabase user (if needed)
- Creates 7-day trial subscription
- Returns: `{ok: true, accessToken, email, userId}`

**3. notify-email (updated)**
- Now handles `event: "magic_link"`
- Sends branded HTML email with magic link button
- 24-hour expiry warning included

### Frontend Changes
- **RequestAccessPage**: Calls `create-magic-link` instead of `submit-access-request`
- **App.tsx**: Auto-detects `?token=xxx` URL parameter and verifies it
- **InboxAccessGate**: Accepts both "active" and "trial" subscription statuses

## ✅ After Deployment

Once deployed, the complete flow will be:
1. User fills form on landing page
2. Form POSTs to `/functions/v1/create-magic-link`
3. Magic link email sent to their inbox
4. User clicks link → redirected to `/?token=xxx`
5. App auto-verifies token
6. User authenticated with 7-day trial
7. Inbox becomes accessible

## 🔐 Secrets Already Configured
- `RESEND_API_KEY` ✓
- `NOTIFY_TO` ✓
- `NOTIFY_FROM` ✓

No additional configuration needed.

## 🛠️ Testing the Flow

After deployment:
1. Go to landing page
2. Click "Request Access"
3. Fill form with your email
4. Check email for magic link (should arrive in ~1 second)
5. Click link
6. Should auto-redirect to inbox with 7-day trial active
7. Trial badge should be visible in inbox

## 🐛 Troubleshooting

**Magic link not arriving?**
- Check Resend email logs in Supabase dashboard
- Verify `NOTIFY_TO` and `NOTIFY_FROM` secrets are set

**Token validation failing?**
- Check browser console for errors
- Verify token wasn't already used
- Verify token hasn't expired (24h window)

**Inbox showing "No access" after clicking link?**
- Check that subscription was created with `status = 'trial'`
- Verify InboxAccessGate is checking for both "active" and "trial" statuses

---

**Ready to deploy?** Run the PowerShell commands above now.
