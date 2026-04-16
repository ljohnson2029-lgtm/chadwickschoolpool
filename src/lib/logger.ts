/**
 * Safe logging utility that only logs in development
 * Automatically strips all logs in production builds
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (message: string, error?: unknown) => {
    // Always log errors, but in production consider sending to error tracking service
    if (isDevelopment) {
      console.error(message, error);
    } else {
      // In production, you could send to Sentry, LogRocket, etc.
      // For now, we still log critical errors but without sensitive data
      if (error instanceof Error) {
        console.error(message, error.message);
      }
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

/**
 * Helper to safely stringify objects for logging (prevents circular reference errors)
 */
export const safeStringify = (obj: unknown): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};
