#!/bin/bash

# ==============================================================================
# Unified Vercel Deployment Script for MAS Demo (Next.js + FastAPI)
# Deploys from frontend/ as root so Vercel uses the modern pipeline.
# Backend is bundled into frontend/api/ before upload and cleaned up after.
# ==============================================================================

set -e
cd "$(dirname "$0")"

echo "🚀 Starting deployment..."

# 1. Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel@latest
else
    echo "✅ Vercel CLI: $(vercel --version)"
fi

# 2. Resolve actual Next.js semver (dist-tag "canary" can't be compared by Vercel)
NEXT_VERSION=$(npm view next@canary version 2>/dev/null || echo "16.3.0-canary.32")
echo "📦 next@$NEXT_VERSION"
python3 -c "
import json
with open('frontend/package.json') as f:
    pkg = json.load(f)
pkg['dependencies']['next'] = '$NEXT_VERSION'
pkg['devDependencies']['eslint-config-next'] = '$NEXT_VERSION'
with open('frontend/package.json', 'w') as f:
    json.dump(pkg, f, indent=2)
print('✅ frontend/package.json patched')
"

# 3. Bundle backend into frontend/api/ for the deployment
echo "📦 Bundling backend into frontend/api/backend/ ..."
rm -rf frontend/api/backend
cp -r backend frontend/api/backend

# Copy requirements so Vercel installs Python deps
cp backend/requirements.txt frontend/requirements.txt

# Create the Python entry point that imports the FastAPI app
cat > frontend/api/index.py << 'PYEOF'
import sys, os

backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, os.path.abspath(backend_dir))
os.chdir(os.path.abspath(backend_dir))

from main import app
PYEOF

echo "✅ Backend bundled"

# 4. Authenticate
vercel whoami 2>/dev/null || vercel login

# 5. Deploy from frontend/ — Vercel detects Next.js at root, uses modern pipeline
echo "⚡ Deploying from frontend/ ..."
cd frontend
vercel --prod --yes
cd ..

# 6. Clean up bundled files
rm -rf frontend/api/backend
rm -f frontend/requirements.txt
rm -f frontend/api/index.py

echo ""
echo "🎉 Deployment complete!"
echo "⚠️  Set environment variables in Vercel Dashboard → Settings → Environment Variables:"
echo "    MONGODB_URI, GROQ_API_KEY, GOOGLE_API_KEY, PINECONE_API_KEY"
echo ""
echo "⚠️  Set NEXT_PUBLIC_API_URL='' (empty) in Vercel env vars so the frontend"
echo "    calls /api/* on the same domain as the deployed app."
