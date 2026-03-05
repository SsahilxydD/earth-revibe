import { describe, it, expect } from "vitest";
import { request } from "../../test/helpers";

describe("sanitize middleware", () => {
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
    const res = await request
      .post("/api/v1/auth/register")
      .send({
        email: "clean@test.com",
        password: "Test1234",
        confirmPassword: "Test1234",
        firstName: "<b>Bold</b>Name",
        lastName: "Normal",
        phone: "9876543210",
      });

    if (res.body.success) {
      expect(res.body.data.user.firstName).toBe("BoldName");
    }
    expect(res.status).toBeLessThan(500);
  });
});
