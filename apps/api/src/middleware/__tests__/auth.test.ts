/**
 * auth.test.ts
 *
 * Tests for the JWT auth middleware.
 * TODO: Add unit tests for authenticate, optionalAuthenticate, authorize
 */

import { describe, it, expect } from 'vitest';

describe('auth middleware', () => {
  it('should export authenticate, optionalAuthenticate, and authorize', async () => {
    const mod = await import('../auth.js');
    expect(mod.authenticate).toBeTypeOf('function');
    expect(mod.optionalAuthenticate).toBeTypeOf('function');
    expect(mod.authorize).toBeTypeOf('function');
  });
});
