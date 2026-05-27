-- New reviews now require admin approval before going public.
ALTER TABLE "reviews" ALTER COLUMN "isApproved" SET DEFAULT false;

-- Index for filtering pending vs approved in admin moderation queue.
CREATE INDEX IF NOT EXISTS "reviews_isApproved_idx" ON "reviews"("isApproved");
