#!/bin/bash

# ==============================================================================
# Unified Vercel Deployment Script for MAS Demo (Next.js + FastAPI)
# ==============================================================================

set -e

# Ensure script always runs from its own directory
cd "$(dirname "$0")"

echo "🚀 Starting Unified Vercel Deployment..."

# 1. Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 Vercel CLI not found. Installing via npm..."
    npm install -g vercel
else
    echo "✅ Vercel CLI is already installed."
fi

# 2. Regenerate package-lock.json against the public npm registry
# The lock file may have been generated on a corporate network pointing to an internal
# registry (e.g. Artifactory) that Vercel cannot reach.
echo "🔄 Regenerating frontend/package-lock.json against registry.npmjs.org..."
(cd frontend && npm install --registry=https://registry.npmjs.org/)

# 3. Prepare Python Environment for Vercel
echo "🐍 Verifying backend requirements..."
if [ ! -f "backend/requirements.txt" ]; then
    echo "❌ Error: backend/requirements.txt not found!"
    exit 1
fi

# 4. Ensure vercel.json exists in root
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found in root directory! Please create it first."
    exit 1
fi

# 5. Authenticate Vercel (Will prompt if not logged in)
echo "🔐 Checking Vercel authentication..."
vercel whoami || vercel login

# 6. Deploy to Vercel (Production)
echo "⚡ Deploying Frontend (Next.js) and Backend (FastAPI) to Vercel..."
vercel --prod --yes

echo "🎉 Deployment initiated successfully!"
echo "⚠️  IMPORTANT: Don't forget to configure your Environment Variables in the Vercel Dashboard."