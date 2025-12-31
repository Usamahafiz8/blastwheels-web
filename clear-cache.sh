#!/bin/bash
# Clear Next.js build cache and rebuild

echo "🧹 Clearing Next.js build cache..."
cd "$(dirname "$0")"
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

echo "✅ Cache cleared!"
echo ""
echo "⚠️  IMPORTANT: Stop your dev server (Ctrl+C) if it's running!"
echo ""
echo "Then restart with: npm run dev"
echo "Or for production build: npm run build"

