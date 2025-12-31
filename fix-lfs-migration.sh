#!/bin/bash

# Script to migrate Game-build files to Git LFS
# This fixes the large file issue while keeping the files

echo "=== Migrating Game-build files to Git LFS ==="
echo ""

# Step 1: Ensure Git LFS is installed
if ! command -v git-lfs &> /dev/null; then
    echo "❌ Git LFS is not installed!"
    echo ""
    echo "Install it with:"
    echo "  brew install git-lfs  # macOS"
    echo "  # or visit https://git-lfs.github.com/"
    exit 1
fi

echo "✓ Git LFS is installed"
echo ""

# Step 2: Initialize Git LFS (if not already done)
echo "Step 1: Initializing Git LFS..."
git lfs install
echo ""

# Step 3: Remove large files from git cache
echo "Step 2: Removing large files from git cache..."
# Remove from public/Game-build/
git rm --cached public/Game-build/Build/Build.data 2>/dev/null || true
git rm --cached public/Game-build/Build/*.wasm 2>/dev/null || true
git rm --cached public/Game-build/Build/*.framework.js 2>/dev/null || true
# Remove from src/app/Game-build/
git rm --cached src/app/Game-build/Build/Build.data 2>/dev/null || true
git rm --cached src/app/Game-build/Build/*.wasm 2>/dev/null || true
git rm --cached src/app/Game-build/Build/*.framework.js 2>/dev/null || true
echo ""

# Step 4: Re-add files so LFS tracks them
echo "Step 3: Re-adding files with Git LFS tracking..."
# Re-add from public/Game-build/
git add public/Game-build/Build/Build.data 2>/dev/null || true
git add public/Game-build/Build/*.wasm 2>/dev/null || true
git add public/Game-build/Build/*.framework.js 2>/dev/null || true
# Re-add from src/app/Game-build/
git add src/app/Game-build/Build/Build.data 2>/dev/null || true
git add src/app/Game-build/Build/*.wasm 2>/dev/null || true
git add src/app/Game-build/Build/*.framework.js 2>/dev/null || true
echo ""

# Step 5: Check if file is now tracked by LFS
echo "Step 4: Verifying LFS tracking..."
if git lfs ls-files | grep -q "Build.data"; then
    echo "✓ File is now tracked by Git LFS"
else
    echo "⚠️  Warning: File may not be tracked by LFS. Checking..."
    git lfs ls-files
fi
echo ""

# Step 6: Amend the last commit
echo "Step 5: Amending the last commit to include LFS tracking..."
git commit --amend --no-edit
echo ""

echo "=== Done ==="
echo ""
echo "Next steps:"
echo "  1. Review the changes: git status"
echo "  2. Push to GitHub: git push --force-with-lease origin main"
echo ""
echo "Note: The --force-with-lease is safe and will update the remote"
echo "      with the LFS-tracked version of the file."

