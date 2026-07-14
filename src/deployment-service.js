import { SCREEPS_BRANCH, SCREEPS_SHARD, SCREEPS_TICK_DURATION_MS } from './config.js';
import { deploymentStore } from './deployments.js';
import { evaluateHealth } from './health.js';
import { metricsStore } from './metrics.js';
import {
  getCodeModules,
  hashModules,
  loadManifestFromFiles,
  validateManifest,
  verifyRemoteModules,
} from './modules.js';
import { getEmpireSnapshot } from './probes.js';
import { errorResult, fail, ok } from './core/result.js';
import { getConsoleCursor } from './tools/console.js';
import { getGameTime } from './tools/game-time.js';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function captureConsoleCursor() {
  const cursor = getConsoleCursor();
  return cursor === null
    ? { cursor: null, available: false, reason: 'Console cursor requires WebSocket observation.' }
    : { cursor, available: true };
}

async function observeDistinctTicks({ deploymentId, verificationTicks }) {
  const observedTicks = [];
  const maxAttempts = verificationTicks * 3;
  for (
    let attempt = 0;
    attempt < maxAttempts && observedTicks.length < verificationTicks;
    attempt += 1
  ) {
    const snapshot = await getEmpireSnapshot();
    const tick = snapshot.data?.result?.tick;
    if (Number.isFinite(tick) && !observedTicks.includes(tick)) {
      await metricsStore.record({ ...snapshot.data, deploymentId });
      observedTicks.push(tick);
    }
    if (observedTicks.length < verificationTicks) await delay(SCREEPS_TICK_DURATION_MS);
  }
  return {
    requestedTicks: verificationTicks,
    observedTicks,
    complete: observedTicks.length === verificationTicks,
  };
}

async function readBackRemoteModules(manifest, branch) {
  try {
    const remote = await getCodeModules(branch);
    return verifyRemoteModules(manifest, remote.data.modules);
  } catch (error) {
    return {
      state: 'unavailable',
      expectedSourceHash: hashModules(manifest.modules),
      actualSourceHash: null,
      expectedModuleCount: Object.keys(manifest.modules).length,
      actualModuleCount: null,
      reason: error.code || 'remote_read_failed',
    };
  }
}

function deploymentRequestSummary({ manifest, branch, sourcePath, entryModule, moduleCount }) {
  return {
    branch,
    sourceHash: hashModules(manifest.modules),
    entryModule: entryModule || manifest.entryModule,
    moduleCount: moduleCount || Object.keys(manifest.modules).length,
    ...(sourcePath ? { sourcePath } : {}),
  };
}

export async function deployManifestAndVerify({
  manifest,
  branch = SCREEPS_BRANCH,
  shard = SCREEPS_SHARD,
  verificationTicks = 5,
  sourcePath,
  entryModule,
  moduleCount,
  upload,
}) {
  const validation = validateManifest(manifest);
  if (!validation.valid)
    return fail(
      'validation_failed',
      'Module manifest failed validation; no deployment was started.',
      validation.errors
    );
  const baseline = await deploymentStore.latestKnownGood({ branch, shard });
  const consoleStart = captureConsoleCursor();
  let requestedTick = null;
  try {
    requestedTick = (await getGameTime(shard)).tick ?? null;
  } catch {
    // A configured server may not expose game time; the deployment remains traceable by wall clock.
  }
  const record = await deploymentStore.create({
    sourceHash: validation.sourceHash,
    branch,
    shard,
    baselineId: baseline?.id || null,
    rollbackTarget: baseline?.branch && baseline.branch !== branch ? baseline.branch : null,
    requestedTick,
    verificationWindowTicks: verificationTicks,
    sourcePath,
    entryModule: entryModule || manifest.entryModule,
    moduleCount: moduleCount || Object.keys(manifest.modules).length,
    consoleStart,
    status: 'uploading',
  });
  const uploadResult = await upload({
    manifest: { ...manifest, sourceHash: validation.sourceHash },
    branch,
    request: deploymentRequestSummary({ manifest, branch, sourcePath, entryModule, moduleCount }),
    deploymentId: record.id,
  });
  if (!uploadResult.ok) {
    await deploymentStore.update(record.id, { status: 'failed', failure: uploadResult });
    return uploadResult;
  }
  const remoteVerification = await readBackRemoteModules(manifest, branch);
  if (remoteVerification.state === 'mismatch') {
    const completed = await deploymentStore.update(record.id, {
      status: 'failed',
      remoteVerification,
      failure: { code: 'remote_verification_failed', remoteVerification },
    });
    return fail(
      'remote_verification_failed',
      'The remote branch does not match the uploaded module manifest.',
      { deployment: completed, remoteVerification }
    );
  }
  let health;
  let observation;
  try {
    observation = await observeDistinctTicks({ deploymentId: record.id, verificationTicks });
    await deploymentStore.update(record.id, { consoleEnd: captureConsoleCursor() });
    health = await evaluateHealth({
      deploymentId: record.id,
      baselineDeploymentId: baseline?.id,
      afterCursor: consoleStart.cursor,
      consoleCursorAvailable: consoleStart.available,
    });
  } catch (error) {
    health = errorResult(error);
    observation = { requestedTicks: verificationTicks, observedTicks: [], complete: false };
  }
  const status =
    remoteVerification.state === 'unavailable' || !observation.complete
      ? 'inconclusive'
      : health.ok && health.data.verdict === 'healthy'
        ? 'healthy'
        : health.ok
          ? 'inconclusive'
          : 'failed';
  const completed = await deploymentStore.update(record.id, {
    status,
    remoteVerification,
    observedTicks: observation.observedTicks,
    completionTick: observation.observedTicks.at(-1) ?? null,
    verification: health,
  });
  return ok(
    {
      deployment: completed,
      upload: uploadResult.data,
      remoteVerification,
      observation,
      verification: health.data,
    },
    status === 'healthy'
      ? 'Deployment verified healthy.'
      : 'Deployment uploaded; verification is not conclusive.'
  );
}

export async function deployFilesAndVerify({ sourcePath, entryModule, ...options }) {
  const loaded = await loadManifestFromFiles(sourcePath, { entryModule });
  return deployManifestAndVerify({
    ...options,
    manifest: loaded.manifest,
    sourcePath: loaded.sourcePath,
    entryModule: loaded.manifest.entryModule,
    moduleCount: loaded.moduleCount,
  });
}
