import { getConsole } from './tools/console.js';
import { getEmpireSnapshot } from './probes.js';
import { metricsStore } from './metrics.js';
import { ok } from './core/result.js';
import { classifyErrors } from './errors.js';

export function consoleEntriesForHealth(consoleData, { afterCursor, consoleCursorAvailable } = {}) {
  const cursorRequested = consoleCursorAvailable !== undefined;
  if (consoleCursorAvailable) {
    if (consoleData.source !== 'websocket') {
      return {
        entries: [],
        confidence: 'unavailable',
        reason: 'Post-deployment console filtering requires a live WebSocket cursor window.',
      };
    }
    const records = consoleData.records || [];
    return {
      entries: records.filter((record) => record.cursor > afterCursor),
      confidence: 'post_deployment',
    };
  }
  if (cursorRequested) {
    return {
      entries: [],
      confidence: 'unavailable',
      reason: 'Post-deployment console filtering requires WebSocket cursors.',
    };
  }
  return { entries: consoleData.logs || [], confidence: 'unbounded' };
}

export async function evaluateHealth({
  deploymentId,
  baselineDeploymentId,
  afterCursor,
  consoleCursorAvailable,
} = {}) {
  const evidence = [];
  let snapshot;
  try {
    snapshot = await getEmpireSnapshot();
    evidence.push({ check: 'probe', state: 'available', tick: snapshot.data.result.tick });
  } catch (error) {
    evidence.push({ check: 'probe', state: 'unavailable', code: error.code || 'error' });
  }
  const consoleData = await getConsole({
    limit: 100,
    ...(consoleCursorAvailable ? { afterCursor } : {}),
  });
  const consoleEvidence = consoleEntriesForHealth(consoleData, {
    afterCursor,
    consoleCursorAvailable,
  });
  const errorGroups = classifyErrors(consoleEvidence.entries, {
    deploymentId,
    tick: snapshot?.data?.result?.tick,
  });
  const fatalErrors = errorGroups.filter((entry) => entry.severity === 'fatal');
  evidence.push({
    check: 'fatal_errors',
    count: fatalErrors.reduce((count, error) => count + error.count, 0),
    fingerprints: fatalErrors.map((error) => error.fingerprint),
  });
  evidence.push({
    check: 'console_window',
    state: consoleEvidence.confidence,
    ...(consoleEvidence.reason ? { reason: consoleEvidence.reason } : {}),
  });
  const comparison =
    deploymentId && baselineDeploymentId
      ? await metricsStore.compare(deploymentId, baselineDeploymentId)
      : null;
  const sampleCount = comparison?.deployment.samples || 0;
  const bucketDelta = comparison?.deployment.cpuBucket?.delta;
  evidence.push({ check: 'cpu_bucket', delta: bucketDelta ?? null });
  if (fatalErrors.length)
    return ok({
      verdict: 'unhealthy',
      evidence,
      sampleSufficiency: sampleCount,
      recommendation: 'Rollback is recommended; branch activation remains policy-gated.',
    });
  if (!snapshot || sampleCount < 3)
    return ok({
      verdict: 'inconclusive',
      evidence,
      sampleSufficiency: sampleCount,
      recommendation: 'Collect at least three snapshots before drawing a conclusion.',
    });
  if (Number.isFinite(bucketDelta) && bucketDelta < -500)
    return ok({
      verdict: 'unhealthy',
      evidence,
      sampleSufficiency: sampleCount,
      recommendation: 'CPU bucket declined sharply after deployment.',
    });
  return ok({ verdict: 'healthy', evidence, sampleSufficiency: sampleCount });
}
