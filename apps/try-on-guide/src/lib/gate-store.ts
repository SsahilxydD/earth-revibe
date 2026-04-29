import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type GateStep = 'phone' | 'otp';

type GateState = {
  step: GateStep;
  phone: string;
  otp: string;
  verified: boolean;
  setPhone: (v: string) => void;
  setOtp: (v: string) => void;
  goToOtp: () => void;
  goBackToPhone: () => void;
  markVerified: () => void;
  resetGate: () => void;
};

export const useGate = create<GateState>()(
  persist(
    (set) => ({
      step: 'phone',
      phone: '',
      otp: '',
      verified: false,
      setPhone: (v) => set({ phone: v.replace(/\D/g, '').slice(0, 10) }),
      setOtp: (v) => set({ otp: v.replace(/\D/g, '').slice(0, 6) }),
      goToOtp: () => set({ step: 'otp', otp: '' }),
      goBackToPhone: () => set({ step: 'phone', otp: '' }),
      markVerified: () => set({ verified: true }),
      resetGate: () => set({ step: 'phone', phone: '', otp: '', verified: false }),
    }),
    {
      name: 'er-tryon-gate',
      storage: createJSONStorage(() => localStorage),
      // Only persist the verified flag + phone so reloads keep the user in.
      // step + otp are session-only and reset to defaults on reload.
      partialize: (s) => ({ verified: s.verified, phone: s.phone }),
    }
  )
);
