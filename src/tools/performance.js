import { executeConsoleCommand } from './execute-command.js';
import { classifyErrors } from '../errors.js';

export async function analyzePerformance() {
  const command = `JSON.stringify({
    cpu: {
      bucket: Game.cpu.bucket,
      limit: Game.cpu.limit,
      tickLimit: Game.cpu.tickLimit,
      used: Game.cpu.getUsed()
    },
    gcl: {
      level: Game.gcl.level,
      progress: Game.gcl.progress,
      progressTotal: Game.gcl.progressTotal
    },
    rooms: Object.keys(Game.rooms).length,
    creeps: Object.keys(Game.creeps).length,
    time: Game.time
  })`;

  return executeConsoleCommand(command);
}

export async function checkForErrors() {
  const { getConsole } = await import('./console.js');
  const consoleLogs = await getConsole();

  if (!consoleLogs.available) {
    return {
      hasErrors: false,
      errorCount: 0,
      errors: [],
      allLogs: [],
      note: 'Console logs not available via HTTP API. Bot appears to be functioning normally based on authentication.',
    };
  }

  const errors = classifyErrors(consoleLogs.logs, { tick: consoleLogs.tick });

  return {
    hasErrors: errors.length > 0,
    errorCount: errors.reduce((count, error) => count + error.count, 0),
    errors,
    allLogs: consoleLogs.logs,
  };
}

export function generateRecommendations(performance, errors) {
  const recommendations = [];

  try {
    const perfData = JSON.parse(performance.result.result);

    if (perfData.cpu && perfData.cpu.bucket < 1000) {
      recommendations.push(
        '⚠️ CPU bucket is low. Consider optimizing your code or reducing operations.'
      );
    }

    if (perfData.cpu && perfData.cpu.bucket < 100) {
      recommendations.push('🚨 CRITICAL: CPU bucket critically low! Bot may stop functioning.');
    }

    if (errors.hasErrors) {
      recommendations.push(
        `❌ Found ${errors.errorCount} error(s) in console logs. Check error details.`
      );
    }

    if (perfData.creeps === 0) {
      recommendations.push('⚠️ No creeps found. Check spawn logic.');
    }
  } catch {
    recommendations.push('Unable to parse performance data');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Bot appears healthy!');
  }

  return recommendations;
}

export async function troubleshootBot() {
  try {
    const [{ analyzePerformance }, { getMemory }, { getUserInfo }] = await Promise.all([
      import('./performance.js'),
      import('./memory.js'),
      import('./user.js'),
    ]);

    const [performanceResult, errors, memory, userInfo] = await Promise.all([
      analyzePerformance(),
      checkForErrors(),
      getMemory(),
      getUserInfo(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      user: userInfo,
      performance: performanceResult.result,
      errors,
      memorySize: JSON.stringify(memory.data).length,
      recommendations: generateRecommendations(performanceResult, errors),
    };
  } catch (error) {
    return {
      error: error.message,
      troubleshootingFailed: true,
    };
  }
}
