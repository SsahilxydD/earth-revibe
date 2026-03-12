import { describe, it, expect, vi, beforeEach } from "vitest";
import { settingsService } from "../settings.service";

vi.mock("@earth-revibe/db", () => ({
  prisma: {
    storeSettings: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@earth-revibe/db";

const mockSettings = {
  id: "settings-1",
  storeName: "Earth Revibe",
  contactEmail: "hello@earthrevibe.com",
  contactPhone: "+91 9000000000",
  freeShippingThreshold: "499",
  gstRate: "18",
  returnWindowDays: 14,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("settingsService.getSettings", () => {
  it("returns existing settings when a record is found", async () => {
    vi.mocked(prisma.storeSettings.findFirst).mockResolvedValue(mockSettings as any);

    const result = await settingsService.getSettings();

    expect(result).toEqual(mockSettings);
    expect(prisma.storeSettings.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.storeSettings.create).not.toHaveBeenCalled();
  });

  it("creates and returns default settings when none exist", async () => {
    vi.mocked(prisma.storeSettings.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.storeSettings.create).mockResolvedValue({
      ...mockSettings,
      storeName: "My Store",
    } as any);

    const result = await settingsService.getSettings();

    expect(prisma.storeSettings.create).toHaveBeenCalledWith({ data: {} });
    expect(result.storeName).toBe("My Store");
  });

  it("does not create settings when record already exists", async () => {
    vi.mocked(prisma.storeSettings.findFirst).mockResolvedValue(mockSettings as any);

    await settingsService.getSettings();

    expect(prisma.storeSettings.create).not.toHaveBeenCalled();
  });
});

describe("settingsService.updateSettings", () => {
  it("updates and returns settings when record exists", async () => {
    vi.mocked(prisma.storeSettings.findFirst).mockResolvedValue(mockSettings as any);
    vi.mocked(prisma.storeSettings.update).mockResolvedValue({
      ...mockSettings,
      storeName: "New Store Name",
    } as any);

    const result = await settingsService.updateSettings({ storeName: "New Store Name" });

    expect(prisma.storeSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockSettings.id },
        data: expect.objectContaining({ storeName: "New Store Name" }),
      })
    );
    expect(result.storeName).toBe("New Store Name");
  });

  it("creates default settings first when none exist, then updates", async () => {
    vi.mocked(prisma.storeSettings.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.storeSettings.create).mockResolvedValue(mockSettings as any);
    vi.mocked(prisma.storeSettings.update).mockResolvedValue({
      ...mockSettings,
      contactEmail: "new@example.com",
    } as any);

    await settingsService.updateSettings({ contactEmail: "new@example.com" });

    expect(prisma.storeSettings.create).toHaveBeenCalledWith({ data: {} });
    expect(prisma.storeSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: mockSettings.id } })
    );
  });

  it("converts freeShippingThreshold number to string in DB write", async () => {
    vi.mocked(prisma.storeSettings.findFirst).mockResolvedValue(mockSettings as any);
    vi.mocked(prisma.storeSettings.update).mockResolvedValue(mockSettings as any);

    await settingsService.updateSettings({ freeShippingThreshold: 999 });

    const updateCall = vi.mocked(prisma.storeSettings.update).mock.calls[0][0] as any;
    expect(updateCall.data.freeShippingThreshold).toBe("999");
    expect(typeof updateCall.data.freeShippingThreshold).toBe("string");
  });

  it("converts gstRate number to string in DB write", async () => {
    vi.mocked(prisma.storeSettings.findFirst).mockResolvedValue(mockSettings as any);
    vi.mocked(prisma.storeSettings.update).mockResolvedValue(mockSettings as any);

    await settingsService.updateSettings({ gstRate: 5 });

    const updateCall = vi.mocked(prisma.storeSettings.update).mock.calls[0][0] as any;
    expect(updateCall.data.gstRate).toBe("5");
    expect(typeof updateCall.data.gstRate).toBe("string");
  });

  it("does not include freeShippingThreshold in update when not provided", async () => {
    vi.mocked(prisma.storeSettings.findFirst).mockResolvedValue(mockSettings as any);
    vi.mocked(prisma.storeSettings.update).mockResolvedValue(mockSettings as any);

    await settingsService.updateSettings({ storeName: "Test" });

    const updateCall = vi.mocked(prisma.storeSettings.update).mock.calls[0][0] as any;
    expect(updateCall.data).not.toHaveProperty("freeShippingThreshold");
  });

  it("does not include gstRate in update when not provided", async () => {
    vi.mocked(prisma.storeSettings.findFirst).mockResolvedValue(mockSettings as any);
    vi.mocked(prisma.storeSettings.update).mockResolvedValue(mockSettings as any);

    await settingsService.updateSettings({ storeName: "Test" });

    const updateCall = vi.mocked(prisma.storeSettings.update).mock.calls[0][0] as any;
    expect(updateCall.data).not.toHaveProperty("gstRate");
  });

  it("updates returnWindowDays as a raw number (not string-converted)", async () => {
    vi.mocked(prisma.storeSettings.findFirst).mockResolvedValue(mockSettings as any);
    vi.mocked(prisma.storeSettings.update).mockResolvedValue(mockSettings as any);

    await settingsService.updateSettings({ returnWindowDays: 30 });

    const updateCall = vi.mocked(prisma.storeSettings.update).mock.calls[0][0] as any;
    expect(updateCall.data.returnWindowDays).toBe(30);
    expect(typeof updateCall.data.returnWindowDays).toBe("number");
  });

  it("updates contactPhone and contactEmail as plain strings", async () => {
    vi.mocked(prisma.storeSettings.findFirst).mockResolvedValue(mockSettings as any);
    vi.mocked(prisma.storeSettings.update).mockResolvedValue(mockSettings as any);

    await settingsService.updateSettings({
      contactPhone: "+91 8888888888",
      contactEmail: "support@earthrevibe.com",
    });

    const updateCall = vi.mocked(prisma.storeSettings.update).mock.calls[0][0] as any;
    expect(updateCall.data.contactPhone).toBe("+91 8888888888");
    expect(updateCall.data.contactEmail).toBe("support@earthrevibe.com");
  });

  it("handles empty update object gracefully (no undefined fields written)", async () => {
    vi.mocked(prisma.storeSettings.findFirst).mockResolvedValue(mockSettings as any);
    vi.mocked(prisma.storeSettings.update).mockResolvedValue(mockSettings as any);

    await settingsService.updateSettings({});

    const updateCall = vi.mocked(prisma.storeSettings.update).mock.calls[0][0] as any;
    // All conditional spreads should produce an empty data object
    expect(updateCall.data).toEqual({});
  });
});
