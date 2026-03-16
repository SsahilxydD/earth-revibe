"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface HomepageSection {
  id: string;
  label: string;
  href: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

export function useHomepageSections() {
  return useQuery<HomepageSection[]>({
    queryKey: ["homepage-sections"],
    queryFn: () => api.get<HomepageSection[]>("/admin/homepage"),
  });
}

export function useUpdateHomepageSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HomepageSection> }) =>
      api.patch<HomepageSection>(`/admin/homepage/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
    },
  });
}
