#!/bin/bash

# Script to fix Git large file issue
# This removes Game-build/ from Git tracking while keeping files locally

echo "=== Fixing Git Large File Issue ==="
echo ""

# Step 1: Remove from Git tracking (keeps files locally)
echo "Step 1: Removing Game-build/ from Git tracking..."
git rm -r --cached Game-build/ 2>/dev/null || echo "  (Game-build/ not in index)"
git rm -r --cached gaembuild/ 2>/dev/null || echo "  (gaembuild/ not in index)"

echo ""
echo "Step 2: Checking if file is in commit history..."
if git log --all --full-history -- "Game-build/Build/Build.data" | head -1 > /dev/null 2>&1; then
    echo "  ⚠️  WARNING: Game-build/Build/Build.data exists in commit history!"
    echo ""
    echo "  The file needs to be removed from Git history."
    echo "  Options:"
    echo ""
    echo "  Option A - If it's only in the last commit (recommended):"
    echo "    git commit --amend --no-edit"
    echo "    git push --force-with-lease"
    echo ""
    echo "  Option B - If it's in multiple commits, use git filter-repo:"
    echo "    # Install: brew install git-filter-repo (or pip install git-filter-repo)"
    echo "    git filter-repo --path Game-build/ --invert-paths"
    echo ""
    echo "  Option C - Use BFG Repo-Cleaner:"
    echo "    # Download from https://rtyley.github.io/bfg-repo-cleaner/"
    echo "    java -jar bfg.jar --delete-folders Game-build"
    echo "    git reflog expire --expire=now --all && git gc --prune=now --aggressive"
else
    echo "  ✓ File not in commit history (only in working directory)"
    echo ""
    echo "  Next steps:"
    echo "    1. Review: git status"
    echo "    2. Commit: git commit -m 'Remove Game-build from Git tracking'"
    echo "    3. Push: git push"
fi

echo ""
echo "=== Done ==="
echo "Note: Game-build/ files remain on your local filesystem."
echo "The app uses files from public/Build/ which are tracked with Git LFS."

