'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { DESTINATION_STORIES, type DestinationStory } from './destination-stories';
import { StoryViewer } from './story-viewer';

/**
 * "Dress for your destination" — Instagram-style story circles under the
 * hero. Tapping a circle opens the full-screen StoryViewer on that stack;
 * the shared layoutId morphs the circle into the viewer's avatar.
 * Stacks come from the homepage CMS via props; the built-in set is only
 * the fallback for an empty CMS.
 */
export function DestinationStoriesSection({
  stories = DESTINATION_STORIES,
}: {
  stories?: DestinationStory[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (stories.length === 0) return null;

  return (
    <section aria-label="Destination stories">
      <div className="flex items-center justify-center gap-2 pt-10">
        <span className="flex h-[7px] w-[7px] items-center justify-center rounded-full border border-[#A9663B]">
          <span className="h-[2.5px] w-[2.5px] rounded-full bg-[#A9663B]" />
        </span>
        <p className="text-[11px] font-medium tracking-[0.25em] text-[#A9663B]">
          DRESS FOR YOUR DESTINATION
        </p>
      </div>

      <div className="hide-scrollbar flex gap-4 overflow-x-auto px-6 pb-2 pt-6">
        {stories.map((story, i) => (
          <button
            key={story.id}
            onClick={() => setOpenIndex(i)}
            className="flex w-[72px] shrink-0 flex-col items-center gap-2"
            aria-label={`View ${story.name} stories`}
          >
            <span className="rounded-full border-[1.5px] border-[#A9663B] p-[3px]">
              <motion.span
                layoutId={`story-avatar-${story.id}`}
                className="relative block h-[60px] w-[60px] overflow-hidden rounded-full"
              >
                <Image
                  src={story.avatar}
                  alt=""
                  fill
                  sizes="60px"
                  className="object-cover"
                  style={{ objectPosition: story.avatarPosition }}
                />
              </motion.span>
            </span>
            <span className="text-[10px] font-medium tracking-[0.14em] text-[#6B6459]">
              {story.name.toUpperCase()}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {openIndex !== null && (
          <StoryViewer
            stories={stories}
            initialIndex={openIndex}
            onClose={() => setOpenIndex(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
