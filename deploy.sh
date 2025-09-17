#!/bin/bash
set -e

echo "Starting Node.js backend deployment process..."

# Debug: Show current directory and environment
echo "Current working directory: $(pwd)"
echo "SERVER_PATH: $SERVER_PATH"
echo "HOME: $HOME"
echo "NODE_ENV: $NODE_ENV"

# If SERVER_PATH is not set, use current directory
if [ -z "$SERVER_PATH" ]; then
    echo "SERVER_PATH not set, using current directory"
    SERVER_PATH=$(pwd)
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

# Check if build artifacts exist first
if [ -d "dist" ] && [ -f "dist/server.js" ]; then
    echo "✅ Build artifacts already exist from Bitbucket pipeline"
    echo "Skipping dependency installation and build steps..."
    SKIP_BUILD=true
else
    echo "❌ No build artifacts found, will need to build"
    SKIP_BUILD=false
    
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
fi

# Build the application only if needed
if [ "$SKIP_BUILD" = "true" ]; then
    echo "✅ Using existing build artifacts from Bitbucket pipeline"
    echo "Build contents: $(ls -la dist/)"
else
    echo "🔨 Building application..."
    npm run build
fi

# Verify build output
if [ ! -f "dist/server.js" ]; then
    echo "ERROR: Build failed - dist/server.js not found"
    echo "Build output:"
    ls -la dist/
    exit 1
fi

echo "Build completed successfully!"

# Install production dependencies only (if not already installed)
if [ "$SKIP_BUILD" = "false" ]; then
    echo "Installing production dependencies..."
    npm ci --only=production --maxsockets=1 --maxconcurrent=1 --no-audit --no-fund
else
    echo "✅ Skipping production dependencies installation (already done)"
fi

# Start/Reload PM2
echo "Starting PM2 process..."
if [ "$NODE_ENV" = "production" ]; then
    echo "Deploying to production environment..."
    pm2 startOrReload ecosystem.config.cjs --update-env --env production || {
        echo "PM2 startOrReload failed, trying start..."
        pm2 start ecosystem.config.cjs --env production
    }
else
    echo "Deploying to development/staging environment..."
    pm2 startOrReload ecosystem.config.cjs --update-env --env development || {
        echo "PM2 startOrReload failed, trying start..."
        pm2 start ecosystem.config.cjs --env development
    }
fi

# Save PM2 configuration
echo "Saving PM2 configuration..."
pm2 save

echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Deployment Summary:"
if [ "$SKIP_BUILD" = "true" ]; then
    echo "✅ Used existing build artifacts from Bitbucket pipeline"
    echo "⚡ Skipped dependency installation and build steps"
    echo "🚀 Fast deployment completed"
else
    echo "🔨 Created new build (fallback mode)"
    echo "📦 Installed dependencies"
    echo "🏗️ Built application from source"
fi
echo ""
echo "📈 PM2 Status:"
pm2 status
