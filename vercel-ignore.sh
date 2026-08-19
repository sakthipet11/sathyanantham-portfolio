#!/bin/bash

if [ "$VERCEL_GIT_COMMIT_REF" == "main" ]; then
  # Proceed with the build for the main branch
  echo "✅ Target branch is main. Proceeding with build."
  exit 1;
else
  # Skip the build for all other branches
  echo "🛑 Target branch is $VERCEL_GIT_COMMIT_REF. Skipping build."
  exit 0;
fi
