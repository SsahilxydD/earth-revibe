import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toast } from "@/components/ui";

export function useBlogPosts(page: number = 1, status?: string, search?: string) {
  return useQuery({
    queryKey: ["admin-blog-posts", page, status, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      return api.get(`/admin/blog?${params}`);
    },
  });
}

export function useBlogPost(id: string) {
  return useQuery({
    queryKey: ["admin-blog-post", id],
    queryFn: () => api.get(`/admin/blog/${id}`),
    enabled: !!id,
  });
}

export function useBlogCategories() {
  return useQuery({
    queryKey: ["admin-blog-categories"],
    queryFn: () => api.get("/admin/blog/categories/list"),
  });
}

export function useBlogTags() {
  return useQuery({
    queryKey: ["admin-blog-tags"],
    queryFn: () => api.get("/admin/blog/tags/list"),
  });
}

export function useCreateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/admin/blog", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Blog post created");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create post"),
  });
}

export function useUpdateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/admin/blog/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["admin-blog-post"] });
      toast.success("Blog post updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update post"),
  });
}

export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/blog/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Blog post deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete post"),
  });
}

export function useCreateBlogCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/admin/blog/categories", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-categories"] });
      toast.success("Category created");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create category"),
  });
}

export function useCreateBlogTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/admin/blog/tags", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-tags"] });
      toast.success("Tag created");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create tag"),
  });
}
