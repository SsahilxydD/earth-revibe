'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useFlow } from '@/lib/store';
import { pageVariants, pageTransition } from '@/lib/motion';
import { PhoneGate } from '@/components/screens/PhoneGate';
import { OtpVerify } from '@/components/screens/OtpVerify';
import { Welcome } from '@/components/screens/Welcome';
import { NameScreen } from '@/components/screens/Name';
import { AgeScreen } from '@/components/screens/Age';
import { CityScreen } from '@/components/screens/City';
import { InstagramScreen } from '@/components/screens/Instagram';
import { TravelerType } from '@/components/screens/TravelerType';
import { WhyJoin } from '@/components/screens/WhyJoin';
import { PastTravel } from '@/components/screens/PastTravel';
import { TripPrefs } from '@/components/screens/TripPrefs';
import { MeetBefore } from '@/components/screens/MeetBefore';
import { Curated } from '@/components/screens/Curated';
import { Submitted } from '@/components/screens/Submitted';

const registry = {
  gate: PhoneGate,
  otp: OtpVerify,
  welcome: Welcome,
  name: NameScreen,
  age: AgeScreen,
  city: CityScreen,
  instagram: InstagramScreen,
  travelerType: TravelerType,
  whyJoin: WhyJoin,
  pastTravel: PastTravel,
  tripPrefs: TripPrefs,
  meetBefore: MeetBefore,
  curated: Curated,
  submitted: Submitted,
} as const;

export default function ApplyPage() {
  const step = useFlow((s) => s.step);
  const direction = useFlow((s) => s.direction);
  const Screen = registry[step];

  return (
    <main className="min-h-dvh w-full bg-ink flex items-center justify-center py-0 md:py-10">
      {/* Mobile-first frame — on desktop we preview inside a centered device-sized card */}
      <div className="relative w-full md:w-[390px] h-dvh md:h-[844px] md:rounded-[40px] overflow-hidden bg-paper md:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.6)] md:ring-1 md:ring-[#2a2520]">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={pageTransition}
            className="absolute inset-0 flex flex-col"
          >
            <Screen />
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
