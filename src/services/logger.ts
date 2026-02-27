/**
 * Utilitaire de logging conditionnel avec système de debug activable.
 *
 * Niveaux de logs :
 * - log / warn : uniquement en développement
 * - debug : activable en production via VITE_ENABLE_DEBUG_LOGS=true
 * - error : toujours actif (monitoring)
 */
interface Logger {
  log: (...args: unknown[]) => void;
  debug: (namespace: string, ...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  group: (label: string, fn: () => void) => void;
  isDebugEnabled: () => boolean;
}

const isDev: boolean = import.meta.env.DEV;
const isDebugLogsEnabled: boolean = import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true";

const canUseDebugLogs = (): boolean => isDev || isDebugLogsEnabled;

export const logger: Logger = {
  log: (...args: unknown[]): void => {
    if (isDev) {
      console.log(...args);
    }
  },

  debug: (namespace: string, ...args: unknown[]): void => {
    if (canUseDebugLogs()) {
      console.log(`[DEBUG ${namespace}]`, ...args);
    }
  },

  warn: (...args: unknown[]): void => {
    if (isDev) {
      console.warn(...args);
    }
  },

  error: (...args: unknown[]): void => {
    console.error(...args);
  },

  group: (label: string, fn: () => void): void => {
    if (canUseDebugLogs()) {
      console.group(label);
      try {
        fn();
      } finally {
        console.groupEnd();
      }
    }
  },

  isDebugEnabled: (): boolean => canUseDebugLogs(),
};
