import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toast } from "@/components/ui";

export function useAdminTickets(page: number = 1, status?: string, priority?: string, search?: string) {
  return useQuery({
    queryKey: ["admin-tickets", page, status, priority, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (search) params.set("search", search);
      return api.get(`/admin/support?${params}`);
    },
  });
}

export function useAdminTicket(ticketNumber: string) {
  return useQuery({
    queryKey: ["admin-ticket", ticketNumber],
    queryFn: () => api.get(`/admin/support/${ticketNumber}`),
    enabled: !!ticketNumber,
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketNumber, status }: { ticketNumber: string; status: string }) =>
      api.put(`/admin/support/${ticketNumber}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
      qc.invalidateQueries({ queryKey: ["admin-ticket"] });
      toast.success("Status updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update status"),
  });
}

export function useAssignTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketNumber, assignedTo }: { ticketNumber: string; assignedTo: string }) =>
      api.put(`/admin/support/${ticketNumber}/assign`, { assignedTo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
      qc.invalidateQueries({ queryKey: ["admin-ticket"] });
      toast.success("Ticket assigned");
    },
    onError: (err: any) => toast.error(err.message || "Failed to assign"),
  });
}

export function useAdminTicketReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketNumber, content }: { ticketNumber: string; content: string }) =>
      api.post(`/admin/support/${ticketNumber}/messages`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ticket"] });
      toast.success("Reply sent");
    },
    onError: (err: any) => toast.error(err.message || "Failed to send reply"),
  });
}
