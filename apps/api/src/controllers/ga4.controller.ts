import type { Request, Response } from 'express';
import { ga4Service } from '../services/ga4.service';

/**
 * Google Analytics 4 endpoints — mounted under /api/v1/admin/analytics/ga.
 * All inherit the admin auth + authorize middleware from the analytics router.
 */
export const ga4Controller = {
  // GET /ga/status — config diagnostic for the dashboard setup banner.
  async status(_req: Request, res: Response) {
    res.json({ success: true, data: await ga4Service.getStatus() });
  },

  // GET /ga/live — realtime active users (polled by the live-visitors widget).
  async live(_req: Request, res: Response) {
    res.json({ success: true, data: await ga4Service.getRealtime() });
  },

  // GET /ga/report?start=YYYY-MM-DD&end=YYYY-MM-DD — full historical report.
  async report(req: Request, res: Response) {
    const { startDate, endDate } = ga4Service.resolveRange(
      req.query.start as string | undefined,
      req.query.end as string | undefined
    );
    res.json({ success: true, data: await ga4Service.getReport(startDate, endDate) });
  },
};
