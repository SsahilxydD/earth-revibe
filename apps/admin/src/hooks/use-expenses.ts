import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from '@earth-revibe/ui/toast';

export interface ExpenseListParams {
  startDate?: string;
  endDate?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export function useExpenses(params: ExpenseListParams = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') searchParams.set(key, String(value));
  });
  return useQuery({
    queryKey: ['admin-expenses', params],
    queryFn: () => api.get(`/admin/expenses?${searchParams.toString()}`),
  });
}

// Mutations invalidate both the expense list and analytics (net profit depends
// on the operating-expense total).
function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['admin-expenses'] });
  qc.invalidateQueries({ queryKey: ['analytics'] });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/admin/expenses', data),
    onSuccess: () => {
      invalidate(qc);
      toast.success('Expense added');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to add expense'),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/admin/expenses/${id}`, data),
    onSuccess: () => {
      invalidate(qc);
      toast.success('Expense updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update expense'),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/expenses/${id}`),
    onSuccess: () => {
      invalidate(qc);
      toast.success('Expense deleted');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete expense'),
  });
}
