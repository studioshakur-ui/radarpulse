# Edge Functions

See also: [`docs/EDGE_FUNCTION_AUTH.md`](C:/Users/hamid/OneDrive/Documents/dev/radarpulse/docs/EDGE_FUNCTION_AUTH.md)

## `opportunities-search`

### Endpoint
`POST /functions/v1/opportunities-search`

### Auth
- Requires `Authorization: Bearer <JWT>`
- Missing/invalid token returns `401`

### Behavior
- Enforces Italy scope server-side: `country_code = 'IT'`
- Applies server-side subscription gating:
  - Active subscription required
  - Active check:
    - preferred: `status='active'` and `current_period_end >= now()`
    - fallback compatibility: `is_active=true`
  - Admin/dev bypass:
    - user role `ADMIN` OR env `ALLOW_DEV_BYPASS=true`

### Request JSON schema
```json
{
  "type": "object",
  "properties": {
    "q": { "type": "string" },
    "status": { "type": "string" },
    "min_quality": { "type": "number" },
    "date_from": { "type": "string", "format": "date-time" },
    "date_to": { "type": "string", "format": "date-time" },
    "region": { "type": "string" },
    "origin_type": { "type": "string" },
    "limit": { "type": "integer", "minimum": 1, "maximum": 100 },
    "cursor": {
      "type": "object",
      "properties": {
        "published_at": { "type": "string", "format": "date-time" },
        "id": { "type": "string", "format": "uuid" }
      },
      "required": ["published_at", "id"]
    }
  }
}
```

### Response schema (success)
```json
{
  "ok": true,
  "items": [
    {
      "id": "uuid",
      "title": "string",
      "buyer_name": "string|null",
      "region": "string|null",
      "budget_amount": "number|null",
      "budget_currency": "string|null",
      "deadline_at": "string|null",
      "published_at": "string|null",
      "source_key": "string|null",
      "status": "string",
      "is_public": true,
      "country_code": "IT",
      "quality_score": "number|null",
      "completeness_score": "number|null",
      "origin_type": "string|null"
    }
  ],
  "nextCursor": {
    "published_at": "2026-03-01T10:00:00.000Z",
    "id": "uuid"
  },
  "meta": {
    "limit": 50,
    "returned": 50
  }
}
```

### Response schema (error)
```json
{
  "ok": false,
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "details": {}
}
```

### Error codes
- `401 UNAUTHORIZED`: missing/invalid bearer token
- `402 SUBSCRIPTION_REQUIRED`: no active subscription
- `403` reserved for explicit authorization denials if needed
- `500` internal or query errors

### Cursor semantics
- Ordered by `published_at DESC, id DESC`
- Cursor means: fetch rows where `(published_at, id) < (cursor.published_at, cursor.id)`
- `nextCursor` is returned from the last item when `items.length == limit`, else `null`

### Example curl
```bash
curl -s -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/opportunities-search" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "ferrovia",
    "min_quality": 0.5,
    "origin_type": "IT_NATIVE",
    "limit": 50
  }'
```
