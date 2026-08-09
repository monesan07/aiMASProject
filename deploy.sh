#!/bin/bash

# ==============================================================================
# Unified Vercel Deployment Script for MAS Demo (Next.js + FastAPI)
# ==============================================================================

set -e
cd "$(dirname "$0")"

echo "🚀 Starting Unified Vercel Deployment..."

# 1. Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel@latest
else
    echo "✅ Vercel CLI: $(vercel --version)"
fi

# 2. Resolve the actual Next.js canary semver from npm so Vercel's version
#    check receives a parseable version string (e.g. 16.3.0-canary.50)
#    instead of the bare dist-tag "canary".
echo "🔍 Resolving Next.js canary version from npm..."
NEXT_CANARY=$(npm view next@canary version 2>/dev/null || true)

if [ -n "$NEXT_CANARY" ]; then
    echo "📦 Resolved → next@$NEXT_CANARY"
    python3 - <<PYEOF
import json

with open('frontend/package.json') as f:
    pkg = json.load(f)

pkg['dependencies']['next'] = '$NEXT_CANARY'
pkg['devDependencies']['eslint-config-next'] = '$NEXT_CANARY'

with open('frontend/package.json', 'w') as f:
    json.dump(pkg, f, indent=2)

print("✅ frontend/package.json patched with resolved version")
PYEOF
else
    echo "⚠️  npm view failed — keeping existing Next.js version in package.json"
fi

# 3. Verify required files
echo "🐍 Verifying backend requirements..."
[ -f "backend/requirements.txt" ] || { echo "❌ backend/requirements.txt not found!"; exit 1; }
[ -f "requirements.txt" ]         || { echo "❌ requirements.txt not found at root!"; exit 1; }
[ -f "api/index.py" ]             || { echo "❌ api/index.py not found!"; exit 1; }
[ -f "vercel.json" ]              || { echo "❌ vercel.json not found!"; exit 1; }

# 4. Authenticate
echo "🔐 Checking Vercel authentication..."
vercel whoami 2>/dev/null || vercel login

# 5. Deploy
echo "⚡ Deploying to Vercel (production)..."
vercel --prod --yes

echo ""
echo "🎉 Deployment complete!"
echo "⚠️  Set these environment variables in the Vercel Dashboard:"
echo "    MONGODB_URI, GROQ_API_KEY, GOOGLE_API_KEY, PINECONE_API_KEY, etc."
