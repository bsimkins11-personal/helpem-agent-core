#!/usr/bin/env bash
set -euo pipefail

echo "🚫 Production deploys are GitHub-only."
echo "Do NOT run 'vercel --prod' locally."
echo "Push to main and let Vercel GitHub integration deploy."
exit 1
