import { getConsole } from './tools/console.js';
import { getEmpireSnapshot } from './probes.js';
import { metricsStore } from './metrics.js';
import { ok } from './core/result.js';
import { classifyErrors } from './errors.js';

export async function evaluateHealth({ deploymentId, baselineDeploymentId } = {}) {
  const evidence = [];
  let snapshot;
  try {
    snapshot = await getEmpireSnapshot();
    evidence.push({ check: 'probe', state: 'available', tick: snapshot.data.result.tick });
  } catch (error) {
    evidence.push({ check: 'probe', state: 'unavailable', code: error.code || 'error' });
  }
  const consoleData = await getConsole({ limit: 100 });
  const logs = consoleData.data?.logs || consoleData.logs || [];
  const errorGroups = classifyErrors(logs, {
    deploymentId,
    tick: snapshot?.data?.result?.tick,
  });
  const fatalErrors = errorGroups.filter((entry) => entry.severity === 'fatal');
  evidence.push({
    check: 'fatal_errors',
    count: fatalErrors.reduce((count, error) => count + error.count, 0),
    fingerprints: fatalErrors.map((error) => error.fingerprint),
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
