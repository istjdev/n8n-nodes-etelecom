#!/bin/bash

# eTelecom Zalo OA Integration for n8n - GitHub Release Script
# This script helps create a new release on GitHub

# Set error handling
set -e

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI is not installed. Please install it first."
  echo "   macOS: brew install gh"
  echo "   Other systems: https://cli.github.com/"
  exit 1
fi

# Check if user is logged in to GitHub CLI
echo "📝 Checking GitHub CLI login status..."
gh auth status &> /dev/null || { echo "❌ You are not logged in to GitHub CLI. Please run 'gh auth login' first."; exit 1; }
echo "✅ GitHub CLI login confirmed."

# Get the package info from package.json
PACKAGE_NAME=$(grep '"name":' package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d ' ')
PACKAGE_VERSION=$(grep '"version":' package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d ' ')
RELEASE_TAG="v$PACKAGE_VERSION"

echo "===================================================="
echo "🚀 Creating GitHub Release for $PACKAGE_NAME@$PACKAGE_VERSION"
echo "===================================================="

# Check if git repository exists
if [ ! -d ".git" ]; then
  echo "❌ Not a git repository. Please initialize git first."
  exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "⚠️ You have uncommitted changes. Consider committing or stashing them before creating a release."
  read -p "❓ Do you want to continue anyway? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "🛑 Release creation canceled!"
    exit 0
  fi
fi

# Check if tag already exists
if git rev-parse "$RELEASE_TAG" &> /dev/null; then
  echo "⚠️ Tag $RELEASE_TAG already exists."
  read -p "❓ Do you want to overwrite it? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "🛑 Release creation canceled!"
    exit 0
  fi
  echo "🗑️ Removing existing tag..."
  git tag -d "$RELEASE_TAG"
  git push origin ":refs/tags/$RELEASE_TAG" || true
fi

# Generate changelog from commits since last tag
echo "📝 Generating changelog from recent commits..."
PREVIOUS_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -z "$PREVIOUS_TAG" ]; then
  # No previous tag exists, get all commits
  CHANGELOG=$(git log --pretty=format:"* %s (%an)" --no-merges)
  echo "📜 Using all commit history for changelog"
else
  # Get commits since last tag
  CHANGELOG=$(git log "$PREVIOUS_TAG"..HEAD --pretty=format:"* %s (%an)" --no-merges)
  echo "📜 Using commits since $PREVIOUS_TAG for changelog"
fi

# If no changelog was generated, create a default message
if [ -z "$CHANGELOG" ]; then
  CHANGELOG="* Release version $PACKAGE_VERSION"
fi

# Create release notes
RELEASE_NOTES="# Release $RELEASE_TAG ($PACKAGE_NAME)

## What's Changed
$CHANGELOG

## Installation
\`\`\`bash
npm install $PACKAGE_NAME
# or
pnpm install $PACKAGE_NAME
\`\`\`

## Full Changelog
$(if [ -n "$PREVIOUS_TAG" ]; then echo "https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/compare/$PREVIOUS_TAG...$RELEASE_TAG"; else echo "First release"; fi)
"

# Show release notes and confirm
echo ""
echo "📋 Release Notes Preview:"
echo "----------------------------------------------------"
echo "$RELEASE_NOTES"
echo "----------------------------------------------------"
echo ""

read -p "❓ Create GitHub release with these notes? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "🛑 Release creation canceled!"
  exit 0
fi

# Create a new tag
echo "🏷️ Creating git tag $RELEASE_TAG..."
git tag -a "$RELEASE_TAG" -m "Release $RELEASE_TAG"

# Push the tag
echo "⬆️ Pushing tag to remote..."
git push origin "$RELEASE_TAG" || { echo "❌ Failed to push tag to remote."; exit 1; }

# Create GitHub release
echo "🎉 Creating GitHub release..."
echo "$RELEASE_NOTES" | gh release create "$RELEASE_TAG" --title "Release $RELEASE_TAG" --notes-file -

# Check if release was successful
if [ $? -eq 0 ]; then
  echo "===================================================="
  echo "✅ GitHub release $RELEASE_TAG created successfully!"
  REPO_URL=$(gh repo view --json url -q .url)
  echo "🔗 Release URL: $REPO_URL/releases/tag/$RELEASE_TAG"
  echo "===================================================="
else
  echo "❌ Failed to create GitHub release. Please check the error messages above."
  exit 1
fi