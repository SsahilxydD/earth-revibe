"use client";

import { useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button, Card } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { AddressForm } from "@/components/checkout/address-form";
import type { AddressInput } from "@earth-revibe/shared";

export default function AddressesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => api.get("/addresses"),
  });

  const addAddress = useMutation({
    mutationFn: (data: AddressInput) => api.post("/addresses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      setShowForm(false);
      toast.success("Address added");
    },
    onError: (err: any) => toast.error(err.message || "Failed to add address"),
  });

  const deleteAddress = useMutation({
    mutationFn: (id: string) => api.delete(`/addresses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Address removed");
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove address"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-charcoal">Saved Addresses</h1>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus size={16} />
          Add Address
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : !addresses?.length ? (
        <Card>
          <div className="text-center py-12">
            <MapPin size={48} className="mx-auto text-light-gray mb-4" />
            <p className="text-medium-gray mb-4">No saved addresses yet</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus size={16} />
              Add Your First Address
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr: any) => (
            <Card key={addr.id} className="relative">
              {addr.isDefault && (
                <span className="absolute top-3 right-3 text-[10px] font-medium tracking-[0.06em] uppercase bg-black text-white px-2 py-0.5">
                  Default
                </span>
              )}
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-medium-gray mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  {addr.label && (
                    <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-slate-500 mb-1">
                      {addr.label}
                    </p>
                  )}
                  <p className="text-sm font-medium text-charcoal">{addr.fullName}</p>
                  <p className="text-sm text-medium-gray mt-0.5">{addr.line1}</p>
                  {addr.line2 && <p className="text-sm text-medium-gray">{addr.line2}</p>}
                  <p className="text-sm text-medium-gray">
                    {addr.city}, {addr.state} – {addr.pinCode}
                  </p>
                  <p className="text-sm text-medium-gray mt-0.5">+91 {addr.phone}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => deleteAddress.mutate(addr.id)}
                  disabled={deleteAddress.isPending}
                  className="flex items-center gap-1.5 text-[11px] tracking-[0.06em] uppercase text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddressForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={async (data) => addAddress.mutate(data)}
        isSubmitting={addAddress.isPending}
      />
    </div>
  );
}
