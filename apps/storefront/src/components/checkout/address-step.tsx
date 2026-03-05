"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Check } from "lucide-react";
import { Button, Spinner } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { AddressForm } from "./address-form";
import type { AddressInput } from "@earth-revibe/shared";

interface AddressStepProps {
  selectedAddressId: string | null;
  onSelect: (addressId: string) => void;
  onNext: () => void;
}

export function AddressStep({ selectedAddressId, onSelect, onNext }: AddressStepProps) {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => api.get("/addresses"),
  });

  const createAddress = useMutation({
    mutationFn: (data: AddressInput) => api.post("/addresses", data),
    onSuccess: (newAddr: any) => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      onSelect(newAddr.id);
      setIsFormOpen(false);
      toast.success("Address added");
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" className="text-forest-green" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-deep-earth">Shipping Address</h2>

      {!addresses?.length ? (
        <div className="text-center py-8">
          <MapPin size={40} className="mx-auto text-light-gray mb-3" />
          <p className="text-medium-gray mb-4">No saved addresses. Add one to continue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr: any) => (
            <div
              key={addr.id}
              onClick={() => onSelect(addr.id)}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedAddressId === addr.id
                  ? "border-forest-green bg-forest-green/5"
                  : "border-light-gray hover:border-sage"
              }`}
            >
              {selectedAddressId === addr.id && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-forest-green rounded-full flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              )}
              <p className="text-xs font-semibold text-forest-green uppercase mb-1">{addr.label}</p>
              <p className="text-sm font-medium text-charcoal">{addr.fullName}</p>
              <p className="text-sm text-dark-gray mt-1">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
              <p className="text-sm text-dark-gray">{addr.city}, {addr.state} — {addr.pinCode}</p>
              <p className="text-sm text-medium-gray mt-1">{addr.phone}</p>
            </div>
          ))}
        </div>
      )}

      <Button variant="secondary" onClick={() => setIsFormOpen(true)}>
        <Plus size={18} />
        Add New Address
      </Button>

      {selectedAddressId && (
        <div className="flex justify-end">
          <Button onClick={onNext} size="lg">Continue to Review</Button>
        </div>
      )}

      <AddressForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={async (data) => { await createAddress.mutateAsync(data); }}
        isSubmitting={createAddress.isPending}
      />
    </div>
  );
}
