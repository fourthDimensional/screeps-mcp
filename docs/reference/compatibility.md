# Screeps server compatibility

The official Screeps Web API is intentionally undocumented in general, so the harness treats non-core endpoints as capability-dependent. `feature_unavailable` is an expected, actionable result rather than a parse failure.

| Capability | Official Screeps | Private server | Harness behavior |
| --- | --- | --- | --- |
| Read/write complete modules (`GET`/`POST /api/user/code`) | Confirmed | Expected; verify per version | Supported |
| Activate branch (`POST /api/user/set-active-branch`) | Confirmed | Version-dependent | Policy-gated; returns capability error if absent |
| Branch list | Supported by the configured account | Version-dependent | Read branches explicitly; no active-branch read is modeled |
| Console command (`POST /api/user/console`) | Rate-limited endpoint | Version-dependent | Supported; acknowledgement is not data |
| WebSocket console | Token-scoped | Version-dependent | Optional; probes become unavailable without it |
| Market endpoints | Token-scoped endpoints exist | Often disabled | Not exposed as actions in this release |

The official documentation confirms multi-module code reads/writes and lists the token rate limits for code, branch activation, Memory, console, and market requests. See [external code commits](https://docs.screeps.com/commit.html) and [authentication tokens](https://docs.screeps.com/auth-tokens.html).

Before enabling a private-server feature, run its read tool against the target server and record the server version and response shape. Do not assume a successful feature on one private-server version proves support on another.
