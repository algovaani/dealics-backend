#!/bin/bash
set -e

echo "🚀 Starting SMOOTH backend deployment process..."

# Determine environment from first arg if provided
if [ -n "$1" ]; then
    DEPLOYMENT_ENVIRONMENT="$1"
fi

# Debug: Show current directory and environment
echo "Current working directory: $(pwd)"
echo "SERVER_PATH: $SERVER_PATH"
echo "DEPLOYMENT_ENVIRONMENT: $DEPLOYMENT_ENVIRONMENT"
echo "HOME: $HOME"

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

# Clean npm cache and node_modules if they exist
echo "Cleaning previous installation..."
rm -rf node_modules
npm cache clean --force

# Install production dependencies (backend needs runtime deps)
echo "Installing production dependencies..."
if [ -f "package-lock.json" ]; then
    echo "package-lock.json found, using npm ci..."
    npm ci --only=production --maxsockets=1 --maxconcurrent=1 --no-audit --no-fund || {
        echo "npm ci failed, falling back to npm install..."
        npm install --only=production --maxsockets=1 --maxconcurrent=1 --no-audit --no-fund
    }
else
    echo "package-lock.json not found, using npm install..."
    npm install --only=production --maxsockets=1 --maxconcurrent=1 --no-audit --no-fund
fi

# Setup environment file based on deployment type
echo "Setting up environment configuration..."
if [ "$DEPLOYMENT_ENVIRONMENT" = "production" ]; then
    cp env.production .env
    echo "✅ Using production environment configuration"
else
    cp env.staging .env
    echo "✅ Using staging environment configuration"
fi

# Check if build artifacts exist (they should be transferred from CI)
if [ -d "dist" ] && [ -f "dist/server.js" ]; then
    echo "Build artifacts found, skipping build step..."
else
    echo "Build artifacts not found, building application..."
    npm run build
fi

# Verify build output
if [ ! -f "dist/server.js" ]; then
    echo "ERROR: Build failed - dist/server.js not found"
    echo "Build output:"
    ls -la dist/ || true
    exit 1
fi

# Determine environment and PM2 app name
if [ "$DEPLOYMENT_ENVIRONMENT" = "production" ]; then
    echo "Deploying to PRODUCTION environment..."
    PM2_APP="prod-dealics-backend"
    ENV_TYPE="production"
else
    echo "Deploying to STAGING environment..."
    PM2_APP="staging-dealics-backend"
    ENV_TYPE="staging"
fi

echo "PM2 App: $PM2_APP"

# SMOOTH PM2 Deployment Strategy
echo "🔄 Starting SMOOTH PM2 deployment (force recreate)..."

# Always delete existing app to avoid stale/saved state conflicts
if pm2 describe "$PM2_APP" > /dev/null 2>&1; then
    echo "🧹 Deleting existing PM2 app '$PM2_APP'..."
    pm2 delete "$PM2_APP" || true
    sleep 2
fi

# Start fresh from ecosystem
echo "▶️ Starting PM2 app from ecosystem: $PM2_APP"
if pm2 start ecosystem.config.cjs --only "$PM2_APP" --update-env; then
    echo "✅ Start command executed successfully"
else
    echo "❌ Start command failed"
    pm2 logs "$PM2_APP" --lines 200 || true
    exit 1
fi

# Step 3: Wait for app to be ready and check status multiple times
echo "⏳ Waiting for app to be ready..."
sleep 3

# Check status with retries
MAX_RETRIES=3
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    echo "Checking app status (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)..."
    
    # Get PM2 status in a more reliable way
    PM2_STATUS=$(pm2 jlist | jq -r ".[] | select(.name==\"$PM2_APP\") | .pm2_env.status" 2>/dev/null || echo "unknown")
    
    if [ "$PM2_STATUS" = "online" ]; then
        echo "✅ App is running successfully!"
        break
    elif [ "$PM2_STATUS" = "stopped" ] || [ "$PM2_STATUS" = "errored" ]; then
        echo "❌ App is $PM2_STATUS, checking logs..."
        pm2 logs "$PM2_APP" --lines 200
        exit 1
    else
        echo "⏳ App status: $PM2_STATUS, waiting..."
        sleep 3
        RETRY_COUNT=$((RETRY_COUNT + 1))
    fi
done

# Final check
if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ App failed to start after $MAX_RETRIES attempts, checking logs..."
    pm2 logs "$PM2_APP" --lines 200
    echo "📊 Current PM2 status:"
    pm2 status
    exit 1
fi

# Step 5: Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save || echo "⚠️ Failed to save PM2 configuration"

# Step 6: Show final status
echo "📊 Final PM2 status:"
pm2 status

echo ""
echo "🎉 SMOOTH deployment completed successfully!"
echo "📋 App: $PM2_APP"
echo "🌐 Environment: $ENV_TYPE"
echo "📊 Status: $(pm2 describe "$PM2_APP" | grep "status" | awk '{print $4}')"
echo ""
echo "🔍 To check logs: pm2 logs $PM2_APP"
echo "🔄 To restart: pm2 restart $PM2_APP"
echo "⛔ To stop: pm2 stop $PM2_APP"
