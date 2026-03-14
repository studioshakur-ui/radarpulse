# 👨‍💻 Dev Account Setup - studio.shakur@gmail.com

## Quick Setup (After Magic Link Deployment)

Once the migration and edge functions are deployed, create your dev account by:

### Option 1: Use Magic Link (Recommended)
1. Go to landing page
2. Click "Request Access"
3. Fill form:
   - **Name:** Shakur Dev
   - **Email:** studio.shakur@gmail.com
   - **Organization:** Personal Dev
   - **Use Case:** Development & Testing
4. Check email for magic link
5. Click link → auto-logged in with 7-day trial
6. Go to `/abbonamento` (Subscribe page)
7. Create Stripe subscription for full access

### Option 2: SQL Insert (Admin Direct Access)

If you want immediate access without trial period, use this SQL in Supabase SQL editor:

```sql
-- First, create the auth user
SELECT auth.uid() as user_id;
-- Note: Copy the returned UUID for next steps

-- Insert subscription record directly
INSERT INTO public.subscriptions (
  user_id,
  status,
  current_period_start,
  current_period_end,
  stripe_subscription_id,
  stripe_customer_id,
  stripe_price_id,
  cancel_at_period_end
) VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with actual UUID from auth.uid()
  'active',              -- Full access (not trial)
  now(),
  now() + interval '365 days',  -- 1 year validity
  'dev_sub_shakur',
  null,
  null,
  false
);
```

### Option 3: Create Subscription with Magic Link + Extend Trial

If you want to use Option 1 but extend the trial beyond 7 days:

```sql
-- After creating account via magic link, update subscription
UPDATE public.subscriptions
SET
  current_period_end = now() + interval '90 days',
  status = 'trial'
WHERE user_id = 'studio_shakur_uuid'
AND status = 'trial';
```

## ⚙️ Manual Dev Account Creation (Fallback)

If above options don't work:

### Step 1: Create Auth User in Supabase Dashboard
1. Go to Supabase Dashboard → Authentication
2. Click "Create User" button
3. Fill in:
   - **Email:** studio.shakur@gmail.com
   - **Password:** Generate strong password (you'll need this to test email login)
   - **Email confirmed:** Enable toggle
4. Copy the generated **User ID (UUID)**

### Step 2: Create Subscription Record
In Supabase SQL editor, run:

```sql
INSERT INTO public.subscriptions (
  user_id,
  status,
  current_period_start,
  current_period_end,
  stripe_subscription_id,
  stripe_customer_id,
  stripe_price_id,
  cancel_at_period_end
) VALUES (
  'PASTE_UUID_HERE',
  'active',
  now(),
  now() + interval '1 year',
  null,
  null,
  null,
  false
);
```

### Step 3: Test Login
1. Go to app login (if available)
2. Email: studio.shakur@gmail.com
3. Password: whatever you set in step 1
4. Should have immediate access to inbox

## 📋 Account Details

**Email:** studio.shakur@gmail.com
**Account Type:** Dev / Testing
**Access Level:** Full (all features)
**Status After Setup:**
- Via Option 1 (Magic Link): 7-day trial (upgradeable)
- Via Option 2 (SQL Insert): Active paid subscription (1 year)
- Via Option 3 (Fallback): Active paid subscription (1 year)

## 🔑 Next Steps After Account Creation

1. **Test the complete flow:**
   - Landing page accessibility
   - Request form submission
   - Magic link in email
   - Inbox access with trial/active status

2. **Verify all features:**
   - Dashboard data loading
   - Tender filtering
   - PDF export functionality
   - Subscription status display

3. **Check trial countdown:**
   - Verify trial badge shows remaining days
   - Confirm trial expiry triggers upgrade prompt

---

## Summary

**Recommended approach:**
1. Deploy using PowerShell commands in `DEPLOYMENT_MAGIC_LINK.md`
2. Use Option 1 (Magic Link) to create dev account
3. Test complete flow end-to-end
4. If trial period not needed, use SQL Option 2 for immediate 1-year access

Ready to proceed? Deploy with:
```powershell
supabase db push
supabase functions deploy create-magic-link --no-verify-jwt
supabase functions deploy verify-magic-link --no-verify-jwt
supabase functions deploy notify-email --no-verify-jwt
```
