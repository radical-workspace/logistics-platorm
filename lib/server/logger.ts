import 'server-only';

type LogLevel = 'info' | 'warn' | 'error';

type LogContext = {
  requestId?: string | null;
  userId?: string | null;
  route?: string;
};

function write(level: LogLevel, message: string, context?: LogContext, extra?: Record<string, unknown>) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
    ...extra,
  };

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export function logInfo(message: string, context?: LogContext, extra?: Record<string, unknown>) {
  write('info', message, context, extra);
}

export function logWarn(message: string, context?: LogContext, extra?: Record<string, unknown>) {
  write('warn', message, context, extra);
}

export function logError(message: string, context?: LogContext, extra?: Record<string, unknown>) {
  write('error', message, context, extra);
}
