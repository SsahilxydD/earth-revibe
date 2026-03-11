import { prisma } from "@earth-revibe/db";

export const settingsService = {
  async getSettings() {
    let settings = await prisma.storeSettings.findFirst();
    if (!settings) {
      settings = await prisma.storeSettings.create({ data: {} });
    }
    return settings;
  },

  async updateSettings(data: {
    storeName?: string;
    contactEmail?: string;
    contactPhone?: string;
    freeShippingThreshold?: number;
    gstRate?: number;
    returnWindowDays?: number;
  }) {
    let settings = await prisma.storeSettings.findFirst();
    if (!settings) {
      settings = await prisma.storeSettings.create({ data: {} });
    }

    return prisma.storeSettings.update({
      where: { id: settings.id },
      data: {
        ...(data.storeName !== undefined ? { storeName: data.storeName } : {}),
        ...(data.contactEmail !== undefined ? { contactEmail: data.contactEmail } : {}),
        ...(data.contactPhone !== undefined ? { contactPhone: data.contactPhone } : {}),
        ...(data.freeShippingThreshold !== undefined
          ? { freeShippingThreshold: String(data.freeShippingThreshold) }
          : {}),
        ...(data.gstRate !== undefined ? { gstRate: String(data.gstRate) } : {}),
        ...(data.returnWindowDays !== undefined ? { returnWindowDays: data.returnWindowDays } : {}),
      },
    });
  },
};
