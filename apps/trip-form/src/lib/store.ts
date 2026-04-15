import { create } from 'zustand';
import type { FormData, Step } from './types';
import { nextStep, prevStep } from './flow';

type Direction = 1 | -1;

type FlowState = {
  step: Step;
  direction: Direction;
  data: FormData;
  setField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  goNext: () => void;
  goBack: () => void;
  goTo: (step: Step, direction?: Direction) => void;
  reset: () => void;
};

const initialData: FormData = {
  phone: '',
  phoneVerified: false,
  otp: '',
  name: '',
  age: '',
  city: '',
  instagram: '',
  email: '',
  travelerType: null,
  whyJoin: '',
  pastTravel: null,
  tripPrefs: [],
  meetBefore: null,
  curated: null,
  applicationId: null,
};

export const useFlow = create<FlowState>((set) => ({
  step: 'welcome',
  direction: 1,
  data: initialData,
  setField: (key, value) => set((s) => ({ data: { ...s.data, [key]: value } })),
  goNext: () => set((s) => ({ step: nextStep(s.step), direction: 1 })),
  goBack: () => set((s) => ({ step: prevStep(s.step), direction: -1 })),
  goTo: (step, direction = 1) => set(() => ({ step, direction })),
  reset: () => set({ step: 'gate', direction: 1, data: initialData }),
}));
