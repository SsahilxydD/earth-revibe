// Viewer-level types for the destination story circles + full-screen player.
// The story DATA lives in the homepage CMS (HomepageBlock STORY_STACK rows),
// with DEFAULT_DESTINATION_STORIES from @earth-revibe/shared as the fallback —
// page.tsx maps either source into these shapes and passes them down as props.

export interface StoryItem {
  /** Public path or whitelisted remote URL, ideally 9:16-ish. */
  src: string;
  /** How long this item plays, in ms. */
  duration?: number;
  kicker?: string;
  headline?: string;
  cta?: { label: string; href: string };
}

export interface DestinationStory {
  id: string;
  name: string;
  avatar: string;
  /** object-position for the circle crop, e.g. '50% 20%'. */
  avatarPosition?: string;
  items: StoryItem[];
}

export const STORY_DURATION_MS = 15000;
