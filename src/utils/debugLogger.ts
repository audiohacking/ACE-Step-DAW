const DEBUG_LOG_STORAGE_KEY = 'ace-step-daw-debug';

function getEnabledScopes(): Set<string> {
  if (typeof localStorage === 'undefined') {
    return new Set();
  }

  try {
    const raw = localStorage.getItem(DEBUG_LOG_STORAGE_KEY) ?? '';
    return new Set(
      raw
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

function isScopeEnabled(scope: string): boolean {
  const normalizedScope = scope.trim().toLowerCase();
  if (!normalizedScope) return false;

  const enabledScopes = getEnabledScopes();
  if (enabledScopes.has('*') || enabledScopes.has(normalizedScope)) {
    return true;
  }

  const scopeParts = normalizedScope.split(':');
  while (scopeParts.length > 1) {
    scopeParts.pop();
    if (enabledScopes.has(scopeParts.join(':'))) {
      return true;
    }
  }

  return false;
}

function withScope(scope: string, args: unknown[]) {
  return [`[${scope}]`, ...args];
}

export interface DebugLogger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createDebugLogger(scope: string): DebugLogger {
  return {
    debug: (...args) => {
      if (!isScopeEnabled(scope)) return;
      console.debug(...withScope(scope, args));
    },
    info: (...args) => {
      if (!isScopeEnabled(scope)) return;
      console.info(...withScope(scope, args));
    },
    warn: (...args) => {
      if (!isScopeEnabled(scope)) return;
      console.warn(...withScope(scope, args));
    },
    error: (...args) => {
      console.error(...withScope(scope, args));
    },
  };
}

export function setDebugLoggingScopes(scopes: string[]): void {
  if (typeof localStorage === 'undefined') return;

  const normalized = scopes
    .map((scope) => scope.trim().toLowerCase())
    .filter(Boolean)
    .join(',');

  if (normalized) {
    localStorage.setItem(DEBUG_LOG_STORAGE_KEY, normalized);
  } else {
    localStorage.removeItem(DEBUG_LOG_STORAGE_KEY);
  }
}

export function getDebugLoggingStorageKey() {
  return DEBUG_LOG_STORAGE_KEY;
}
