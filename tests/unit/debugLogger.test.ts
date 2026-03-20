import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDebugLogger,
  getDebugLoggingStorageKey,
  setDebugLoggingScopes,
} from '../../src/utils/debugLogger';

describe('debugLogger', () => {
  const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('stays silent by default for debug/info/warn logs', () => {
    const logger = createDebugLogger('ace-step:generation');

    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('emits scoped logs when the scope is enabled', () => {
    setDebugLoggingScopes(['ace-step:generation']);
    const logger = createDebugLogger('ace-step:generation');

    logger.debug('debug message');
    logger.warn('warn message');

    expect(debugSpy).toHaveBeenCalledWith('[ace-step:generation]', 'debug message');
    expect(warnSpy).toHaveBeenCalledWith('[ace-step:generation]', 'warn message');
  });

  it('supports parent scope matching and wildcard matching', () => {
    localStorage.setItem(getDebugLoggingStorageKey(), 'ace-step,*');

    createDebugLogger('ace-step:api').info('api info');
    createDebugLogger('another-scope').debug('other debug');

    expect(infoSpy).toHaveBeenCalledWith('[ace-step:api]', 'api info');
    expect(debugSpy).toHaveBeenCalledWith('[another-scope]', 'other debug');
  });

  it('always emits errors even when debug logging is disabled', () => {
    const logger = createDebugLogger('ace-step:api');

    logger.error('failed');

    expect(errorSpy).toHaveBeenCalledWith('[ace-step:api]', 'failed');
  });
});
