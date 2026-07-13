const MAX_BUFFER_SIZE = 200;

let logsBuffer = [];
let resultsBuffer = [];

export function pushLogs(logs) {
  if (!Array.isArray(logs)) return;
  logsBuffer.push(...logs);
  if (logsBuffer.length > MAX_BUFFER_SIZE) {
    logsBuffer = logsBuffer.slice(-MAX_BUFFER_SIZE);
  }
}

export function pushResults(results) {
  if (!Array.isArray(results)) return;
  resultsBuffer.push(...results);
  if (resultsBuffer.length > MAX_BUFFER_SIZE) {
    resultsBuffer = resultsBuffer.slice(-MAX_BUFFER_SIZE);
  }
}

export function getBuffer() {
  return {
    logs: [...logsBuffer],
    results: [...resultsBuffer],
    count: logsBuffer.length,
  };
}

export function clearBuffer() {
  const oldCount = logsBuffer.length;
  logsBuffer = [];
  resultsBuffer = [];
  return { cleared: oldCount };
}

export function getSize() {
  return logsBuffer.length;
}
