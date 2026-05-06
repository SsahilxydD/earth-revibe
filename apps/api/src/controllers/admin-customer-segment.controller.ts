import type { Request, Response } from 'express';
import { customerSegmentSchema } from '@earth-revibe/shared';
import { customerSegmentService } from '../services/customer-segment.service';

export const adminCustomerSegmentController = {
  async list(_req: Request, res: Response) {
    const segments = await customerSegmentService.list();
    res.json({ success: true, data: { segments } });
  },

  async create(req: Request, res: Response) {
    const input = customerSegmentSchema.parse(req.body);
    const seg = await customerSegmentService.create(input);
    res.status(201).json({ success: true, data: seg });
  },

  async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const input = customerSegmentSchema.parse(req.body);
    const seg = await customerSegmentService.update(id, input);
    res.json({ success: true, data: seg });
  },

  async delete(req: Request, res: Response) {
    const id = req.params.id as string;
    await customerSegmentService.delete(id);
    res.json({ success: true });
  },

  async refresh(req: Request, res: Response) {
    const id = req.params.id as string;
    const seg = await customerSegmentService.refresh(id);
    res.json({ success: true, data: seg });
  },
};
