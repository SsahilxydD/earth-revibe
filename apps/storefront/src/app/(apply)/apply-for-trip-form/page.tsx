'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useFlow } from '@/lib/apply/store';
import { pageVariants, pageTransition } from '@/lib/apply/motion';
import { PhoneGate } from './_components/screens/PhoneGate';
import { OtpVerify } from './_components/screens/OtpVerify';
import { Welcome } from './_components/screens/Welcome';
import { NameScreen } from './_components/screens/Name';
import { AgeScreen } from './_components/screens/Age';
import { CityScreen } from './_components/screens/City';
import { InstagramScreen } from './_components/screens/Instagram';
import { TravelerType } from './_components/screens/TravelerType';
import { WhyJoin } from './_components/screens/WhyJoin';
import { PastTravel } from './_components/screens/PastTravel';
import { TripPrefs } from './_components/screens/TripPrefs';
import { MeetBefore } from './_components/screens/MeetBefore';
import { Curated } from './_components/screens/Curated';
import { Submitted } from './_components/screens/Submitted';

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

export default function ApplyForTripFormPage() {
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
