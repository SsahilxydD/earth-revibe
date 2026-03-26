import { prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import type { AddressInput } from '@earth-revibe/shared';

export const addressService = {
  async listAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async createAddress(userId: string, data: AddressInput) {
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If first address, auto-set as default
    const count = await prisma.address.count({ where: { userId } });
    const isDefault = count === 0 ? true : data.isDefault;

    return prisma.address.create({
      data: {
        userId,
        label: data.label,
        fullName: data.fullName,
        phone: data.phone,
        line1: data.line1,
        line2: data.line2,
        city: data.city,
        state: data.state,
        pinCode: data.pinCode,
        isDefault,
      },
    });
  },

  async updateAddress(userId: string, addressId: string, data: Partial<AddressInput>) {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw ApiError.notFound('Address not found');

    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.address.update({
      where: { id: addressId },
      data,
    });
  },

  async deleteAddress(userId: string, addressId: string) {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw ApiError.notFound('Address not found');

    await prisma.address.delete({ where: { id: addressId } });

    // If deleted address was default, make the first remaining address default
    if (address.isDefault) {
      const first = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
      if (first) {
        await prisma.address.update({
          where: { id: first.id },
          data: { isDefault: true },
        });
      }
    }
  },
};
