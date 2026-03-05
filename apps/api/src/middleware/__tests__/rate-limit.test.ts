import { describe, it, expect, afterEach } from "vitest";
import { request, cleanupTestData } from "../../test/helpers";

describe("auth rate limiting", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestData(createdUserIds);
    createdUserIds.length = 0;
  });

  it("should rate limit login after 5 failed attempts", async () => {
    const responses: number[] = [];

    for (let i = 0; i < 7; i++) {
      const res = await request
        .post("/api/v1/auth/login")
        .send({ email: "fake@test.com", password: "Wrong1234" });
      responses.push(res.status);
    }

    // First 5 should be 401 (invalid credentials)
    expect(responses.slice(0, 5).every((s) => s === 401)).toBe(true);
    // After 5, should be 429 (rate limited)
    expect(responses.slice(5).some((s) => s === 429)).toBe(true);
  });

  it("should rate limit register after 3 attempts", async () => {
    const responses: number[] = [];

    for (let i = 0; i < 5; i++) {
      const res = await request
        .post("/api/v1/auth/register")
        .send({
          email: `test${i}@ratelimit.com`,
          password: "Test1234",
          confirmPassword: "Test1234",
          firstName: "Test",
          lastName: "User",
          phone: "9876543210",
        });
      responses.push(res.status);
      if (res.body?.data?.user?.id) {
        createdUserIds.push(res.body.data.user.id);
      }
    }

    // First 3 should succeed (201)
    expect(responses.slice(0, 3).every((s) => s === 201)).toBe(true);
    // After 3, should be 429
    expect(responses.slice(3).some((s) => s === 429)).toBe(true);
  });
});
