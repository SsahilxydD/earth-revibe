#!/bin/bash
# Vercel Ignored Build Step
# https://vercel.com/docs/projects/overview#ignored-build-step
#
# Exit 0 = skip build (nothing relevant changed)
# Exit 1 = proceed with build
#
# Set this in Vercel project settings → Git → Ignored Build Step:
#   bash scripts/vercel-ignore-build.sh

echo "Checking if build is needed..."

# Always build on production branch
if [ "$VERCEL_GIT_COMMIT_REF" = "main" ] || [ "$VERCEL_GIT_COMMIT_REF" = "master" ]; then
  echo "→ Production branch, building."
  exit 1
fi

# Check if any source files changed vs the previous commit
# These are the paths that actually affect the build output
RELEVANT_PATHS=(
  "apps/"
  "packages/"
  "pnpm-lock.yaml"
  "turbo.json"
  "tsconfig.json"
)

for path in "${RELEVANT_PATHS[@]}"; do
  if git diff --quiet HEAD^ HEAD -- "$path" 2>/dev/null; then
    continue
  else
    echo "→ Changes detected in $path, building."
    exit 1
  fi
done

echo "→ No relevant changes (only docs/scripts/config). Skipping build."
exit 0
