const MAX_BUFFER_SIZE = 200;

let logsBuffer = [];
let resultsBuffer = [];
let sequence = 0;

function record(value, type) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return {
    cursor: ++sequence,
    sequence,
    tick: typeof value === 'object' && value ? value.tick : undefined,
    arrivalTimestamp: new Date().toISOString(),
    severity: /(?:fatal|error|exception)/i.test(text) ? 'error' : 'info',
    type,
    value,
  };
}

export function pushLogs(logs) {
  if (!Array.isArray(logs)) return;
  logsBuffer.push(...logs.map((log) => record(log, 'log')));
  if (logsBuffer.length > MAX_BUFFER_SIZE) {
    logsBuffer = logsBuffer.slice(-MAX_BUFFER_SIZE);
  }
}

export function pushResults(results) {
  if (!Array.isArray(results)) return;
  resultsBuffer.push(...results.map((result) => record(result, 'result')));
  if (resultsBuffer.length > MAX_BUFFER_SIZE) {
    resultsBuffer = resultsBuffer.slice(-MAX_BUFFER_SIZE);
  }
}

export function getBuffer({ afterCursor = 0, beforeCursor = Infinity, limit = MAX_BUFFER_SIZE, levels } = {}) {
  const records = [...logsBuffer, ...resultsBuffer]
    .filter(
      (entry) =>
        entry.cursor > afterCursor &&
        entry.cursor <= beforeCursor &&
        (!levels || levels.includes(entry.severity))
    )
    .sort((left, right) => left.cursor - right.cursor)
    .slice(0, Math.min(limit, MAX_BUFFER_SIZE));
  return {
    logs: records.filter((entry) => entry.type === 'log').map((entry) => entry.value),
    results: records.filter((entry) => entry.type === 'result').map((entry) => entry.value),
    records,
    count: records.length,
    nextCursor: records.at(-1)?.cursor || afterCursor,
  };
}

export function clearBuffer() {
  const oldCount = logsBuffer.length;
  logsBuffer = [];
  resultsBuffer = [];
  sequence = 0;
  return { cleared: oldCount };
}

export function getSize() {
  return logsBuffer.length;
}

export function getLatestCursor() {
  return sequence;
}
