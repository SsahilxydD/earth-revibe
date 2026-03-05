import { describe, it, expect, afterEach } from "vitest";
import { request, createTestUser, cleanupTestData, generateTestToken, generateExpiredToken } from "../../test/helpers";

describe("authenticate middleware", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestData(createdUserIds);
    createdUserIds.length = 0;
  });

  it("should pass with valid token", async () => {
    const { user } = await createTestUser();
    createdUserIds.push(user.id);
    const token = generateTestToken(user.id);

    const res = await request
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.id).toBe(user.id);
  });

  it("should reject missing Authorization header", async () => {
    const res = await request.get("/api/v1/auth/me").expect(401);
    expect(res.body.error.message).toBe("No token provided");
  });

  it("should reject malformed Authorization header", async () => {
    const res = await request
      .get("/api/v1/auth/me")
      .set("Authorization", "NotBearer token")
      .expect(401);
    expect(res.body.error.message).toBe("No token provided");
  });

  it("should reject expired token", async () => {
    const { user } = await createTestUser();
    createdUserIds.push(user.id);
    const token = generateExpiredToken(user.id);

    await new Promise((r) => setTimeout(r, 1100));

    const res = await request
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
    expect(res.body.error.message).toBe("Invalid or expired token");
  });

  it("should reject token for inactive user", async () => {
    const { user } = await createTestUser({ isActive: false });
    createdUserIds.push(user.id);
    const token = generateTestToken(user.id);

    const res = await request
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
    expect(res.body.error.message).toBe("User not found or inactive");
  });
});

describe("authorize middleware", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestData(createdUserIds);
    createdUserIds.length = 0;
  });

  it("should allow admin access to admin routes", async () => {
    const { user } = await createTestUser({ role: "ADMIN" });
    createdUserIds.push(user.id);
    const token = generateTestToken(user.id, "ADMIN");

    const res = await request
      .get("/api/v1/admin/analytics/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it("should reject customer from admin routes", async () => {
    const { user } = await createTestUser({ role: "CUSTOMER" });
    createdUserIds.push(user.id);
    const token = generateTestToken(user.id, "CUSTOMER");

    const res = await request
      .get("/api/v1/admin/analytics/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});
