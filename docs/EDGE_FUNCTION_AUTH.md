# Edge Function Auth Contract

## Source of truth
- Repo config and CLI deploy commands are the source of truth for Edge Function JWT mode.
- Supabase dashboard toggles are for emergency inspection or rollback only.
- If a dashboard setting conflicts with this repo, redeploy from the repo to restore the intended state.

## Header contract
- `apikey`: project routing key for Supabase Edge Functions.
- `Authorization: Bearer <token>`: only for a real user access token or a trusted service-role token.
- Never send `Authorization: Bearer <anon key>`.

## Public functions (`verify_jwt = false`)
- `create-magic-link`
- `verify-magic-link`
- `submit-access-request`
- `notify-email`
- `dispatcher`
- `worker`
- `ai-extract-light`
- `ai-extract-light-dev`
- `admin-purge-test-data`
- `stripe-webhook`

## Manually authenticated protected functions (`verify_jwt = false` + in-code auth)
- `opportunities-search`
- `opportunity-brief`
- `opportunity-score`
- `opportunity-prep`
- `opportunity-decision`
- `opportunity-workflow`
- `stripe-create-checkout`

## Gateway-protected functions (`verify_jwt = true`)
- `notify-telegram`
- `notify-whatsapp`

## 401 semantics
- Gateway `401 Invalid JWT`: the request was rejected before function code ran. Check deployed `verify_jwt` mode and the bearer token type.
- Handler `401 UNAUTHORIZED`: the function ran and rejected the request in application logic.
- `402 SUBSCRIPTION_REQUIRED`: the user is authenticated but blocked by billing rules.

## Frontend calling rules
- Public web calls send `apikey` and request JSON, without an `Authorization` header unless the endpoint explicitly needs a user or service token.
- Protected web calls send both:
  - `apikey: <SUPABASE_ANON_KEY>`
  - `Authorization: Bearer <USER_JWT>`
- `supabase.functions.invoke(...)` may be used for protected calls when the active session should be attached automatically.
