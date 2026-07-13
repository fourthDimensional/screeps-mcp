# Tool result and error codes

Every MCP tool returns the following envelope:

```json
{ "ok": true, "code": "ok", "message": "...", "data": {} }
```

Failures use `ok: false` and may include `details` and `retryAfterMs`. Raw server payloads, where useful, are nested under `data.rawServerData`; they are never mixed into the normalized fields.

| Code | Meaning |
| --- | --- |
| `invalid_request` | Input did not meet the tool contract. |
| `validation_failed` | Module validation found one or more errors; no write ran. |
| `approval_required` | Production policy blocked a mutation. |
| `authentication_failed` | Screeps rejected configured credentials. |
| `rate_limited` | Retry after `retryAfterMs` when provided. |
| `timeout` / `probe_timeout` | A bounded transport or tick wait expired. |
| `feature_unavailable` | The configured server lacks an endpoint or capability. |
| `transport_unavailable` | The server could not be reached. |
| `response_too_large` | A response exceeded the safety cap. |
| `malformed_probe_result` | A correlated probe output failed its structured contract. |
| `inconclusive` | Evidence is insufficient to make a health decision. |
