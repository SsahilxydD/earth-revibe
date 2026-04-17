import type { Request, Response } from 'express';
import { travelApplicationService } from '../services/travel-application.service';
import type { TravelApplicationListQuery } from '@earth-revibe/shared';
import { ApiError } from '../utils/api-error';

// In-memory lock — prevents a second admin (or a double-click) from kicking
// off overlapping backfill runs while one is already in flight. Process-local
// by design: if there are multiple API instances this is best-effort, but the
// idempotency of `receivedNotifiedAt IS NULL` prevents duplicate sends even
// across instances.
let backfillInFlight = false;

export const adminTravelApplicationController = {
  async list(_req: Request, res: Response) {
    // validatedQuery is populated by the zod validate() middleware
    const query = res.locals.validatedQuery as TravelApplicationListQuery;
    const result = await travelApplicationService.list(query);
    res.json({ success: true, data: result });
  },

  async getOne(req: Request, res: Response) {
    const id = req.params.id as string;
    const row = await travelApplicationService.getById(id);
    res.json({ success: true, data: row });
  },

  async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const row = await travelApplicationService.update(id, req.body);
    res.json({ success: true, data: row });
  },

  async backfillReceipts(req: Request, res: Response) {
    if (backfillInFlight) {
      throw ApiError.conflict('A receipt backfill is already running. Try again in a moment.');
    }
    backfillInFlight = true;
    try {
      const includeDecided = req.body?.includeDecided === true;
      const result = await travelApplicationService.backfillReceiptNotifications({
        includeDecided,
      });
      res.json({ success: true, data: result });
    } finally {
      backfillInFlight = false;
    }
  },

  async exportCSV(_req: Request, res: Response) {
    const result = await travelApplicationService.exportCSV();
    const date = new Date().toISOString().split('T')[0];
    if (result.truncated) {
      res.setHeader('X-Export-Truncated', 'true');
      res.setHeader('X-Export-Total', String(result.totalCount));
      res.setHeader('X-Export-Count', String(result.exportedCount));
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="travel-applications-${date}.csv"`);
    res.send(result.csv);
  },
};
