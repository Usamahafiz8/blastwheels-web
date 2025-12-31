#!/bin/bash

# Script to move Game-build files to public directory for Next.js static serving

echo "🚀 Moving Game-build files to public directory..."

# Create public/Game-build directory if it doesn't exist
mkdir -p public/Game-build

# Copy Build folder
if [ -d "src/app/Game-build/Build" ]; then
  echo "📦 Copying Build folder..."
  cp -r src/app/Game-build/Build public/Game-build/
  echo "✅ Build folder copied"
else
  echo "⚠️  Build folder not found in src/app/Game-build/"
fi

# Copy TemplateData folder
if [ -d "src/app/Game-build/TemplateData" ]; then
  echo "🎨 Copying TemplateData folder..."
  cp -r src/app/Game-build/TemplateData public/Game-build/
  echo "✅ TemplateData folder copied"
else
  echo "⚠️  TemplateData folder not found in src/app/Game-build/"
fi

echo ""
echo "✅ Done! Game files are now in public/Game-build/"
echo "🌐 You can now access the game at: http://localhost:3000/game-build"
echo ""
echo "Note: The files in src/app/Game-build can be kept as backup or removed."

