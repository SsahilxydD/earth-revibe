import type { Request, Response } from 'express';
import { templateVariantSchema } from '@earth-revibe/shared';
import { whatsAppTemplateVariantService } from '../services/whatsapp-template-variant.service';

export const adminTemplateVariantController = {
  async list(_req: Request, res: Response) {
    const variants = await whatsAppTemplateVariantService.list();
    res.json({ success: true, data: { variants } });
  },

  async create(req: Request, res: Response) {
    const input = templateVariantSchema.parse(req.body);
    const v = await whatsAppTemplateVariantService.create(input);
    res.status(201).json({ success: true, data: v });
  },

  async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const input = templateVariantSchema.parse(req.body);
    const v = await whatsAppTemplateVariantService.update(id, input);
    res.json({ success: true, data: v });
  },

  async delete(req: Request, res: Response) {
    const id = req.params.id as string;
    await whatsAppTemplateVariantService.delete(id);
    res.json({ success: true });
  },
};
