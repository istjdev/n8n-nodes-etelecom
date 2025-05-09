#!/bin/bash

# ETelecom Zalo OA Integration for n8n - NPM Publish Script
# This script helps publish the node package to npm

# Set error handling
set -e

# Get the package name and version from package.json
PACKAGE_NAME=$(grep '"name":' package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d ' ')
PACKAGE_VERSION=$(grep '"version":' package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d ' ')

echo "===================================================="
echo "🚀 Publishing $PACKAGE_NAME@$PACKAGE_VERSION to npm"
echo "===================================================="

# Check if user is logged in to npm
echo "📝 Checking npm login status..."
NPM_USER=$(npm whoami 2> /dev/null || echo "")

if [ -z "$NPM_USER" ]; then
  echo "❌ You are not logged in to npm. Please run 'npm login' first."
  exit 1
else
  echo "✅ Logged in to npm as: $NPM_USER"
fi

# Clean up and prepare for publishing
echo "🧹 Cleaning up previous build artifacts..."
rm -rf dist

# Run tests if they exist
if grep -q "\"test\":" package.json; then
  echo "🧪 Running tests..."
  pnpm test || { echo "❌ Tests failed! Fix errors before publishing."; exit 1; }
  echo "✅ Tests passed successfully!"
fi

# Format code
echo "✨ Formatting code..."
pnpm format || { echo "⚠️ Format issues found. Continuing anyway..."; }

# Build the package
echo "📦 Building package..."
pnpm build
if [ $? -ne 0 ]; then
  echo "❌ Build failed! Fix errors before publishing."
  exit 1
fi
echo "✅ Build completed successfully!"

# Run linting separately
echo "🔍 Running linting..."
pnpm lint
if [ $? -ne 0 ]; then
  echo "⚠️ Linting issues found."
  read -p "❓ Do you want to continue with publishing despite linting issues? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "🛑 Publishing canceled!"
    exit 0
  fi
fi

# Check if eslintrc.prepublish.js exists and run stricter linting
if [ -f ".eslintrc.prepublish.js" ]; then
  echo "🔍 Running pre-publish linting checks..."
  pnpm lint -c .eslintrc.prepublish.js nodes credentials package.json

  if [ $? -ne 0 ]; then
    echo "⚠️ Pre-publish linting issues found."
    read -p "❓ The pre-publish linting found issues. Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "🛑 Publishing canceled!"
      exit 0
    fi
  fi
fi

# Confirm with user
echo ""
echo "📣 You are about to publish $PACKAGE_NAME version $PACKAGE_VERSION to npm"
echo ""
read -p "❓ Are you sure you want to proceed? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "🛑 Publishing canceled!"
  exit 0
fi

# Publish to npm using npm directly (bypassing prepublishOnly script)
echo "📤 Publishing to npm..."
npm publish --ignore-scripts

# Check if publish was successful
if [ $? -eq 0 ]; then
  echo "✅ Successfully published $PACKAGE_NAME@$PACKAGE_VERSION to npm!"

  # Create git tag for this version
  echo "🏷️ Creating git tag v$PACKAGE_VERSION..."
  git tag -a "v$PACKAGE_VERSION" -m "Release version $PACKAGE_VERSION"

  # Push tag to remote
  echo "⬆️ Pushing tag to remote..."
  git push origin "v$PACKAGE_VERSION"

  echo "===================================================="
  echo "🎉 Publishing complete!"
  echo "🔗 Package available at: https://www.npmjs.com/package/$PACKAGE_NAME"
  echo "===================================================="
else
  echo "❌ Failed to publish to npm. Please check the error messages above."
  exit 1
fi