"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addressSchema, type AddressInput, INDIAN_STATES } from "@earth-revibe/shared";
import { Button, Input, Modal } from "@/components/ui";

interface AddressFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddressInput) => Promise<void>;
  isSubmitting: boolean;
}

export function AddressForm({ isOpen, onClose, onSubmit, isSubmitting }: AddressFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema) as any,
    defaultValues: { label: "Home", isDefault: false },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Address" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name" error={errors.fullName?.message} {...register("fullName")} />
          <Input label="Phone Number" placeholder="9876543210" error={errors.phone?.message} {...register("phone")} />
        </div>
        <Input label="Address Line 1" placeholder="House/Flat no., Street" error={errors.line1?.message} {...register("line1")} />
        <Input label="Address Line 2 (Optional)" placeholder="Landmark, Area" {...register("line2")} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="City" error={errors.city?.message} {...register("city")} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-charcoal">State</label>
            <select
              className="w-full px-4 py-3 h-11 rounded-lg border-[1.5px] border-light-gray bg-white text-charcoal text-sm outline-none focus:border-forest-green focus:ring-2 focus:ring-forest-green/20"
              {...register("state")}
            >
              <option value="">Select</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.state?.message && <p className="text-sm text-error">{errors.state.message}</p>}
          </div>
          <Input label="PIN Code" placeholder="400001" error={errors.pinCode?.message} {...register("pinCode")} />
        </div>
        <Input label="Label" placeholder="Home, Office, etc." error={errors.label?.message} {...register("label")} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Save Address</Button>
        </div>
      </form>
    </Modal>
  );
}
