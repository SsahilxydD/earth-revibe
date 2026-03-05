import { describe, it, expect, afterEach } from "vitest";
import { authService } from "../auth.service";
import { prisma } from "@earth-revibe/db";
import { createTestUser, cleanupTestData, makeRegisterPayload } from "../../test/helpers";

describe("authService", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestData(createdUserIds);
    createdUserIds.length = 0;
  });

  describe("register", () => {
    it("should create a new user and return tokens", async () => {
      const payload = makeRegisterPayload();
      const result = await authService.register(payload);

      createdUserIds.push(result.user.id);

      expect(result.user.email).toBe(payload.email);
      expect(result.user.firstName).toBe(payload.firstName);
      expect(result.user.role).toBe("CUSTOMER");
      expect(result.user.referralCode).toMatch(/^REVIBE-/);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it("should reject duplicate email", async () => {
      const payload = makeRegisterPayload();
      const first = await authService.register(payload);
      createdUserIds.push(first.user.id);

      await expect(authService.register(payload)).rejects.toThrow("Email already registered");
    });

    it("should process referral code if provided", async () => {
      const { user: referrer } = await createTestUser();
      createdUserIds.push(referrer.id);

      const payload = makeRegisterPayload({ referralCode: referrer.referralCode });
      const result = await authService.register(payload);
      createdUserIds.push(result.user.id);

      const referral = await prisma.referral.findFirst({
        where: { referrerId: referrer.id, refereeId: result.user.id },
      });
      expect(referral).not.toBeNull();
      expect(referral!.status).toBe("SIGNED_UP");
    });
  });

  describe("login", () => {
    it("should return user and tokens for valid credentials", async () => {
      const { user, password } = await createTestUser();
      createdUserIds.push(user.id);

      const result = await authService.login({ email: user.email, password });

      expect(result.user.id).toBe(user.id);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it("should reject wrong password", async () => {
      const { user } = await createTestUser();
      createdUserIds.push(user.id);

      await expect(authService.login({ email: user.email, password: "WrongPass1" }))
        .rejects.toThrow("Invalid email or password");
    });

    it("should reject non-existent email", async () => {
      await expect(authService.login({ email: "noone@test.com", password: "Test1234" }))
        .rejects.toThrow("Invalid email or password");
    });

    it("should reject inactive user", async () => {
      const { user, password } = await createTestUser({ isActive: false });
      createdUserIds.push(user.id);

      await expect(authService.login({ email: user.email, password }))
        .rejects.toThrow("Account is deactivated");
    });

    it("should update lastLoginAt on successful login", async () => {
      const { user, password } = await createTestUser();
      createdUserIds.push(user.id);

      await authService.login({ email: user.email, password });

      const updated = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updated!.lastLoginAt).not.toBeNull();
    });
  });

  describe("refreshToken", () => {
    it("should rotate tokens", async () => {
      const payload = makeRegisterPayload();
      const registered = await authService.register(payload);
      createdUserIds.push(registered.user.id);

      const newTokens = await authService.refreshToken(registered.refreshToken);

      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.refreshToken).not.toBe(registered.refreshToken);

      const oldStored = await prisma.refreshToken.findUnique({
        where: { token: registered.refreshToken },
      });
      expect(oldStored).toBeNull();
    });

    it("should reject invalid refresh token", async () => {
      await expect(authService.refreshToken("invalid-token"))
        .rejects.toThrow("Invalid refresh token");
    });
  });

  describe("changePassword", () => {
    it("should change password and invalidate tokens", async () => {
      const { user, password } = await createTestUser();
      createdUserIds.push(user.id);

      await authService.changePassword(user.id, {
        currentPassword: password,
        newPassword: "NewPass123",
        confirmNewPassword: "NewPass123",
      });

      await expect(authService.login({ email: user.email, password }))
        .rejects.toThrow("Invalid email or password");

      const result = await authService.login({ email: user.email, password: "NewPass123" });
      expect(result.user.id).toBe(user.id);
    });

    it("should reject wrong current password", async () => {
      const { user } = await createTestUser();
      createdUserIds.push(user.id);

      await expect(authService.changePassword(user.id, {
        currentPassword: "WrongPass1",
        newPassword: "NewPass123",
        confirmNewPassword: "NewPass123",
      })).rejects.toThrow("Current password is incorrect");
    });
  });
});
