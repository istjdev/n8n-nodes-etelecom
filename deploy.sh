#!/bin/bash

# ETelecom Zalo OA Integration for n8n - Local Development Deploy Script
# This script helps developers build and deploy the node package to a local n8n instance

# Get the package name from package.json
PACKAGE_NAME=$(grep '"name":' package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d ' ')

echo "==================================================="
echo "🚀 Deploying $PACKAGE_NAME for local development"
echo "==================================================="

#########################
# Step 1: Build node
#########################
echo "📦 Building node package..."
pnpm run build

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "❌ Build failed! Please fix errors and try again."
  exit 1
fi
echo "✅ Build completed successfully!"

#########################
# Step 2: Restart n8n
#########################
echo "🔄 Restarting n8n container..."
docker-compose down
docker-compose up -d

# Check if n8n container started correctly
if [ $? -ne 0 ]; then
  echo "❌ Failed to restart n8n container! Check docker logs for details."
  exit 1
fi

echo "✅ Installation complete!"
echo "🌐 You can access n8n at http://localhost:5678"
echo "==================================================="