import type { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';

export const analyticsController = {
  async getDashboardStats(_req: Request, res: Response) {
    const stats = await analyticsService.getDashboardStats();
    res.json({ success: true, data: stats });
  },

  async getRevenueChart(_req: Request, res: Response) {
    const data = await analyticsService.getRevenueChart();
    res.json({ success: true, data });
  },

  async getRecentOrders(_req: Request, res: Response) {
    const orders = await analyticsService.getRecentOrders();
    res.json({ success: true, data: orders });
  },

  async getHomeDashboard(req: Request, res: Response) {
    const period = (req.query.period as string) || 'today';
    const data = await analyticsService.getHomeDashboard(period);
    res.json({ success: true, data });
  },

  async getAnalytics(req: Request, res: Response) {
    const data = await analyticsService.getAnalytics(res.locals.validatedQuery || req.query);
    res.json({ success: true, data });
  },
};
