# Telemetry contract

Telemetry is optional. A bot that does not expose it remains usable; the harness reports `available: false` rather than interpreting missing values as zero.

Expose the contract at `Memory.telemetry` once per tick. Version `1` is:

```js
Memory.telemetry = {
  version: 1,
  botVersion: '2026.07.13',
  tick: Game.time,
  cpu: { phases: { spawn: 0.4, economy: 1.2 }, total: 2.1 },
  counters: { creeps: Object.keys(Game.creeps).length, rooms: 2 },
  strategy: { mode: 'bootstrap' },
  queues: { spawn: 1, tasks: 4 },
  errors: [{ fingerprint: 'TypeError:foo@main:12', count: 1 }]
};
```

Fields may be omitted when unknown. Do not put raw stack traces, credentials, or unbounded event arrays in telemetry. Error fingerprints should be stable across ticks (for example, error type plus normalized source location).

The server preserves the value as bot-provided data and makes no claim that it is independently verified.
