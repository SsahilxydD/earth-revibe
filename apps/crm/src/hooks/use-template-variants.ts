import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TemplateVariantInput, TemplateVariantsResponse } from '@earth-revibe/shared';
import { api } from '@/lib/api-client';
import { toast } from '@earth-revibe/ui/toast';

const KEY = ['crm-template-variants'];

export function useTemplateVariants() {
  return useQuery<TemplateVariantsResponse, Error>({
    queryKey: KEY,
    queryFn: () => api.get<TemplateVariantsResponse>('/admin/template-variants'),
  });
}

export function useCreateTemplateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TemplateVariantInput) => api.post('/admin/template-variants', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Variant created');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create variant'),
  });
}

export function useUpdateTemplateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TemplateVariantInput }) =>
      api.put(`/admin/template-variants/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Variant updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update variant'),
  });
}

export function useDeleteTemplateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/template-variants/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Variant deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete variant'),
  });
}
