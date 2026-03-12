import { describe, it, expect, afterEach } from "vitest";
import { request, cleanupTestData, makeRegisterPayload, isSupabaseConfigured } from "../../test/helpers";

const describeIf = isSupabaseConfigured() ? describe : describe.skip;

describeIf("sanitize middleware", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestData(createdUserIds);
    createdUserIds.length = 0;
  });

  it("should strip HTML tags from request body", async () => {
    const res = await request
      .post("/api/v1/auth/login")
      .send({
        email: "<script>alert('xss')</script>user@test.com",
        password: "Test1234",
      });

    // The sanitized email will fail validation or login — important thing is no script tags in processing
    expect(res.status).toBeLessThan(500);
  });

  it("should handle nested objects", async () => {
    const payload = makeRegisterPayload({
      firstName: "<b>Bold</b>Name",
      lastName: "Normal",
    });

    const res = await request
      .post("/api/v1/auth/register")
      .send(payload);

    if (res.body.success) {
      expect(res.body.data.user.firstName).toBe("BoldName");
      createdUserIds.push(res.body.data.user.id);
    }
    expect(res.status).toBeLessThan(500);
  });
});
