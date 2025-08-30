#!/bin/bash

# Simple deployment script for Dealics Backend
# Usage: ./scripts/deploy.sh [environment] [server-path]

set -e

ENVIRONMENT=${"staging"}
SERVER_PATH=${SERVER_PATH}
SERVER_USER=${SERVER_USER}
SERVER_HOST=${SERVER_HOST}

echo "🚀 Deploying to $ENVIRONMENT environment..."

# Build the application
echo "📦 Building application..."
npm ci
npm run build

# Create deployment package
echo "📋 Creating deployment package..."
tar -czf deploy.tar.gz dist/ package*.json

# Deploy to server
echo "🚀 Deploying to server: $SERVER_HOST:$SERVER_PATH"
scp deploy.tar.gz $SERVER_USER@$SERVER_HOST:/tmp/

# Execute deployment commands on server
ssh $SERVER_USER@$SERVER_HOST << EOF
    echo "📁 Creating backup..."
    if [ -d "$SERVER_PATH" ]; then
        cp -r $SERVER_PATH ${SERVER_PATH}_backup_\$(date +%Y%m%d_%H%M%S)
    fi
    
    echo "📦 Extracting new version..."
    mkdir -p $SERVER_PATH
    tar -xzf /tmp/deploy.tar.gz -C $SERVER_PATH
    
    echo "📋 Installing dependencies..."
    cd $SERVER_PATH
    npm ci --only=production
    
    echo "🔄 Restarting service..."
    sudo systemctl restart dealics-backend || echo "Service restart failed, manual restart required"
    
    echo "🧹 Cleaning up..."
    rm /tmp/deploy.tar.gz
    
    echo "✅ Deployment completed!"
EOF

# Clean up local files
rm deploy.tar.gz

echo "🎉 Deployment to $ENVIRONMENT completed successfully!"
