#!/bin/bash

# ==============================================================================
# Unified Vercel Deployment Script for MAS Demo (Next.js + FastAPI)
# ==============================================================================

set -e

echo "🚀 Starting Unified Vercel Deployment..."

# 1. Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 Vercel CLI not found. Installing via npm..."
    npm install -g vercel
else
    echo "✅ Vercel CLI is already installed."
fi

# 2. Prepare Python Environment for Vercel
# Vercel needs requirements.txt at the same level as the Python entry point
echo "🐍 Verifying backend requirements..."
if [ ! -f "backend/requirements.txt" ]; then
    echo "❌ Error: backend/requirements.txt not found!"
    exit 1
fi

# 3. Ensure vercel.json exists in root
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found in root directory! Please create it first."
    exit 1
fi

# 4. Authenticate Vercel (Will prompt if not logged in)
echo "🔐 Checking Vercel authentication..."
vercel whoami || vercel login

# 5. Deploy to Vercel (Production)
echo "⚡ Deploying Frontend (Next.js) and Backend (FastAPI) to Vercel..."
vercel --prod --yes

echo "🎉 Deployment initiated successfully!"
echo "⚠️  IMPORTANT: Don't forget to configure your Environment Variables in the Vercel Dashboard."