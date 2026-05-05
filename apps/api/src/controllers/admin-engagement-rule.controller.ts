import type { Request, Response } from 'express';
import { engagementRuleSchema } from '@earth-revibe/shared';
import { engagementRuleService } from '../services/engagement-rule.service';

export const adminEngagementRuleController = {
  async list(_req: Request, res: Response) {
    const rules = await engagementRuleService.list();
    res.json({ success: true, data: { rules } });
  },

  async get(req: Request, res: Response) {
    const id = req.params.id as string;
    const rule = await engagementRuleService.get(id);
    res.json({ success: true, data: rule });
  },

  async create(req: Request, res: Response) {
    const input = engagementRuleSchema.parse(req.body);
    const rule = await engagementRuleService.create(input);
    res.status(201).json({ success: true, data: rule });
  },

  async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const input = engagementRuleSchema.parse(req.body);
    const rule = await engagementRuleService.update(id, input);
    res.json({ success: true, data: rule });
  },

  async delete(req: Request, res: Response) {
    const id = req.params.id as string;
    await engagementRuleService.delete(id);
    res.json({ success: true });
  },
};
