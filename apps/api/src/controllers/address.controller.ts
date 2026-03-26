import type { Request, Response } from 'express';
import { addressService } from '../services/address.service';

export const addressController = {
  async listAddresses(req: Request, res: Response) {
    const addresses = await addressService.listAddresses(req.user!.id);
    res.json({ success: true, data: addresses });
  },

  async createAddress(req: Request, res: Response) {
    const address = await addressService.createAddress(req.user!.id, req.body);
    res.status(201).json({ success: true, data: address });
  },

  async updateAddress(req: Request, res: Response) {
    const address = await addressService.updateAddress(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    res.json({ success: true, data: address });
  },

  async deleteAddress(req: Request, res: Response) {
    await addressService.deleteAddress(req.user!.id, req.params.id as string);
    res.json({ success: true, message: 'Address deleted' });
  },
};
