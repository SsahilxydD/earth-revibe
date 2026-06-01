import type { Request, Response } from 'express';
import { expenseService } from '../services/expense.service';

export const expenseController = {
  async list(req: Request, res: Response) {
    const result = await expenseService.listExpenses(res.locals.validatedQuery || req.query);
    res.json({ success: true, data: result });
  },

  async create(req: Request, res: Response) {
    const expense = await expenseService.createExpense(req.user!.id, req.body);
    res.status(201).json({ success: true, data: expense });
  },

  async update(req: Request, res: Response) {
    const expense = await expenseService.updateExpense(req.params.id as string, req.body);
    res.json({ success: true, data: expense });
  },

  async remove(req: Request, res: Response) {
    const result = await expenseService.deleteExpense(req.params.id as string);
    res.json({ success: true, data: result });
  },
};
