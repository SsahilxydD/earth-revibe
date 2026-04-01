/**
 * auth.service.test.ts
 *
 * Tests for the WhatsApp OTP auth service.
 * TODO: Add unit tests for sendOtp, verifyOtp, login, getMe, updateProfile
 */

import { describe, it, expect } from 'vitest';

describe('authService', () => {
  it('should be importable', async () => {
    const { authService } = await import('../auth.service.js');
    expect(authService).toBeDefined();
    expect(authService.sendOtp).toBeTypeOf('function');
    expect(authService.verifyOtp).toBeTypeOf('function');
    expect(authService.login).toBeTypeOf('function');
    expect(authService.getMe).toBeTypeOf('function');
    expect(authService.updateProfile).toBeTypeOf('function');
  });
});
