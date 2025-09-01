#!/bin/bash
set -e

echo "Starting Node.js backend deployment process..."

# Debug: Show current directory and environment
echo "Current working directory: $(pwd)"
echo "DEPLOY_PATH: $SERVER_PATH"
echo "HOME: $HOME"

# If DEPLOY_PATH is not set, use current directory
if [ -z "$SERVER_PATH" ]; then
    echo "$SERVER_PATH not set, using current directory"
    $SERVER_PATH=$(pwd)
fi

echo "Using deployment path: $SERVER_PATH"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "ERROR: package.json not found in current directory"
    echo "Available files:"
    ls -la
    exit 1
fi

echo "Found package.json, proceeding with deployment..."

# Setup NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Enable corepack and prepare npm
echo "Setting up Node.js environment..."
corepack enable
corepack prepare npm@10.2.4 --activate

# Clean npm cache and node_modules if they exist
echo "Cleaning previous installation..."
rm -rf node_modules
rm -rf dist
npm cache clean --force

# Install dependencies
echo "Installing dependencies..."
if [ -f "package-lock.json" ]; then
    echo "package-lock.json found, using npm ci..."
    npm ci --maxsockets=1 --maxconcurrent=1 --no-audit --no-fund || {
        echo "npm ci failed, falling back to npm install..."
        npm install --maxsockets=1 --maxconcurrent=1 --no-audit --no-fund
    }
else
    echo "package-lock.json not found, using npm install..."
    npm install --maxsockets=1 --maxconcurrent=1 --no-audit --no-fund
fi

# Build the TypeScript application
echo "Building TypeScript application..."
npm run build

# Verify build output
if [ ! -f "dist/server.js" ]; then
    echo "ERROR: Build failed - dist/server.js not found"
    echo "Build output:"
    ls -la dist/
    exit 1
fi

echo "Build completed successfully!"

# Install production dependencies only
echo "Installing production dependencies..."
npm ci --only=production --maxsockets=1 --maxconcurrent=1 --no-audit --no-fund

# Save PM2 configuration
echo "Saving PM2 configuration..."
pm2 save

echo "Deployment completed successfully!"
echo "PM2 status:"
pm2 status
