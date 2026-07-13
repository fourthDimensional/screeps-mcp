import { createHash } from 'node:crypto';

function textOf(entry) {
  return typeof entry === 'string'
    ? entry
    : (entry?.value ?? entry?.message ?? JSON.stringify(entry));
}

export function normalizeError(entry) {
  return textOf(entry)
    .replace(/\b\d+\b/g, '#')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, '<id>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1000);
}

export function classifyErrors(entries, { tick, deploymentId } = {}) {
  const groups = new Map();
  for (const entry of entries) {
    const text = textOf(entry);
    if (!/(?:error|exception|uncaught|fatal)/i.test(text)) continue;
    const normalized = normalizeError(text);
    const fingerprint = createHash('sha256').update(normalized).digest('hex').slice(0, 16);
    const group = groups.get(fingerprint) || {
      fingerprint,
      normalized,
      count: 0,
      firstSeenTick: tick,
      lastSeenTick: tick,
      deploymentId,
      severity: /(?:fatal|uncaught)/i.test(text) ? 'fatal' : 'error',
    };
    group.count += 1;
    groups.set(fingerprint, group);
  }
  return [...groups.values()];
}
