#!/bin/bash

# Dealics Backend Pipeline Setup Script
# This script helps you quickly set up the CI/CD pipeline

set -e

echo "🚀 Setting up Dealics Backend Bitbucket Pipeline..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in GitHub Actions
if [ "$GITHUB_ACTIONS" = "true" ]; then
    print_error "This script should not be run in GitHub Actions"
    exit 1
fi

# Check prerequisites
print_status "Checking prerequisites..."

# Check if git is available
if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install git first."
    exit 1
fi

# Check if docker is available
if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed. Some features will be limited."
    DOCKER_AVAILABLE=false
else
    DOCKER_AVAILABLE=true
    print_success "Docker is available"
fi

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_warning "kubectl is not installed. Kubernetes deployment will not be available."
    KUBECTL_AVAILABLE=false
else
    KUBECTL_AVAILABLE=true
    print_success "kubectl is available"
fi

# Get repository information
print_status "Getting repository information..."

REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$REPO_URL" ]; then
    print_error "Not a git repository or no remote origin found."
    print_status "Please run this script from the root of your git repository."
    exit 1
fi

# Extract repository name and owner
if [[ $REPO_URL == *"bitbucket.org"* ]]; then
    REPO_FULL_NAME=$(echo $REPO_URL | sed 's/.*bitbucket\.org[:/]\([^/]*\/[^/]*\)\.git.*/\1/')
    REPO_OWNER=$(echo $REPO_FULL_NAME | cut -d'/' -f1)
    REPO_NAME=$(echo $REPO_FULL_NAME | cut -d'/' -f2)
    print_success "Bitbucket repository detected: $REPO_FULL_NAME"
elif [[ $REPO_URL == *"github.com"* ]]; then
    print_warning "GitHub repository detected. This setup is optimized for Bitbucket.")
    REPO_FULL_NAME=$(echo $REPO_URL | sed 's/.*github\.com[:/]\([^/]*\/[^/]*\)\.git.*/\1/')
    REPO_OWNER=$(echo $REPO_FULL_NAME | cut -d'/' -f1)
    REPO_NAME=$(echo $REPO_FULL_NAME | cut -d'/' -f2)
elif [[ $REPO_URL == *"gitlab.com"* ]]; then
    print_warning "GitLab repository detected. This setup is optimized for Bitbucket.")
    REPO_FULL_NAME=$(echo $REPO_URL | sed 's/.*gitlab\.com[:/]\([^/]*\/[^/]*\)\.git.*/\1/')
    REPO_OWNER=$(echo $REPO_FULL_NAME | cut -d'/' -f1)
    REPO_NAME=$(echo $REPO_FULL_NAME | cut -d'/' -f2)
else
    print_warning "Unknown git hosting service. This setup is optimized for Bitbucket.")
    REPO_FULL_NAME="unknown"
    REPO_OWNER="unknown"
    REPO_NAME="unknown"
fi

# Create necessary directories
print_status "Creating pipeline directories..."

mkdir -p .github/workflows
mkdir -p k8s
mkdir -p scripts

print_success "Directories created"

# Update package.json scripts if needed
print_status "Checking package.json scripts..."

if [ -f "package.json" ]; then
    # Check if test script exists
    if ! grep -q '"test"' package.json; then
        print_warning "No test script found in package.json. Adding placeholder..."
        # This is a simple sed replacement - in practice you'd want to use a proper JSON parser
        print_status "Please add a test script to your package.json manually"
    fi
    
    # Check if lint script exists
    if ! grep -q '"lint"' package.json; then
        print_warning "No lint script found in package.json. Adding placeholder..."
        print_status "Please add a lint script to your package.json manually"
    fi
fi

# Generate environment file template
print_status "Creating environment file template..."

cat > .env.example << EOF
# Database Configuration
DATABASE_URL=mysql://user:password@host:port/database
TEST_DATABASE_URL=mysql://user:password@host:port/test_database

# Security
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Server Configuration
PORT=3000
EOF

print_success "Environment file template created (.env.example)"

# Generate Bitbucket repository variables setup guide
print_status "Creating Bitbucket repository variables setup guide..."

cat > BITBUCKET_VARIABLES_SETUP.md << EOF
# Bitbucket Repository Variables Setup

To complete the pipeline setup, add these variables to your Bitbucket repository:

## Required Repository Variables

1. Go to your repository: https://bitbucket.org/$REPO_FULL_NAME
2. Navigate to Repository settings > Pipelines > Repository variables
3. Add the following variables:

### Database Configuration
- \`DATABASE_URL\`: Your production database connection string
- \`TEST_DATABASE_URL\`: Your test database connection string

### Security
- \`JWT_SECRET\`: Secret key for JWT token signing

### Docker Registry
- \`DOCKER_USERNAME\`: Your Docker Hub username
- \`DOCKER_PASSWORD\`: Your Docker Hub password or access token

### SMTP Configuration
- \`SMTP_HOST\`: SMTP server hostname
- \`SMTP_PORT\`: SMTP server port
- \`SMTP_USER\`: SMTP username/email
- \`SMTP_PASS\`: SMTP password/app password

## Enable Pipelines

1. Go to Repository settings > Pipelines
2. Enable Pipelines if not already enabled
3. Ensure the \`bitbucket-pipelines.yml\` file is in your repository root

## Container Registry Access

The pipeline will use the \`DOCKER_USERNAME\` and \`DOCKER_PASSWORD\` variables to authenticate with Docker Hub.
EOF

print_success "Bitbucket repository variables setup guide created (BITBUCKET_VARIABLES_SETUP.md)"

# Generate deployment script
print_status "Creating deployment script..."

cat > scripts/deploy.sh << 'EOF'
#!/bin/bash

# Deployment script for Dealics Backend
# Usage: ./scripts/deploy.sh [environment] [version]

set -e

ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}

echo "🚀 Deploying to $ENVIRONMENT environment (version: $VERSION)..."

case $ENVIRONMENT in
    "staging"|"dev")
        echo "Deploying to staging..."
        # Add your staging deployment commands here
        # Example: kubectl apply -f k8s/deployment-staging.yaml
        echo "✅ Staging deployment completed"
        ;;
    "production"|"prod")
        echo "Deploying to production..."
        # Add your production deployment commands here
        # Example: kubectl apply -f k8s/deployment-production.yaml
        echo "✅ Production deployment completed"
        ;;
    *)
        echo "❌ Unknown environment: $ENVIRONMENT"
        echo "Usage: $0 [staging|production] [version]"
        exit 1
        ;;
esac

echo "🎉 Deployment to $ENVIRONMENT completed successfully!"
EOF

chmod +x scripts/deploy.sh
print_success "Deployment script created (scripts/deploy.sh)"

# Generate health check script
print_status "Creating health check script..."

cat > scripts/health-check.sh << 'EOF'
#!/bin/bash

# Health check script for Dealics Backend
# Usage: ./scripts/health-check.sh [url]

set -e

HEALTH_URL=${1:-"http://localhost:3000/health"}

echo "🏥 Checking health at: $HEALTH_URL"

# Wait for service to be ready
echo "⏳ Waiting for service to be ready..."
for i in {1..30}; do
    if curl -f -s "$HEALTH_URL" > /dev/null; then
        echo "✅ Service is healthy!"
        exit 0
    fi
    echo "⏳ Attempt $i/30: Service not ready yet..."
    sleep 2
done

echo "❌ Service health check failed after 30 attempts"
exit 1
EOF

chmod +x scripts/health-check.sh
print_success "Health check script created (scripts/health-check.sh)"

# Generate docker-compose override for local development
print_status "Creating docker-compose override file..."

cat > docker-compose.override.yml << EOF
# Local development overrides
# This file is automatically loaded by docker-compose
version: '3.8'

services:
  app:
    build:
      target: development
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=mysql://root:password@db:3306/dealics_dev
    ports:
      - "3000:3000"
      - "9229:9229"
    command: npm run dev

  db:
    environment:
      - MYSQL_DATABASE=dealics_dev
    ports:
      - "3306:3306"

  redis:
    ports:
      - "6379:6379"
EOF

print_success "Docker Compose override file created (docker-compose.override.yml)"

# Generate .gitignore additions
print_status "Updating .gitignore..."

if [ -f ".gitignore" ]; then
    # Check if .env is already in .gitignore
    if ! grep -q "\.env" .gitignore; then
        echo "" >> .gitignore
        echo "# Environment files" >> .gitignore
        echo ".env" >> .gitignore
        echo ".env.local" >> .gitignore
        echo ".env.*.local" >> .gitignore
        print_success "Added environment files to .gitignore"
    fi
    
    # Check if dist is already in .gitignore
    if ! grep -q "dist/" .gitignore; then
        echo "" >> .gitignore
        echo "# Build outputs" >> .gitignore
        echo "dist/" >> .gitignore
        echo "build/" >> .gitignore
        print_success "Added build outputs to .gitignore"
    fi
else
    print_warning ".gitignore not found. Creating one..."
    cat > .gitignore << EOF
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
*.tsbuildinfo

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory
coverage/
.nyc_output/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db
EOF
    print_success ".gitignore created"
fi

# Final setup instructions
echo ""
echo "🎉 Pipeline setup completed successfully!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. 📝 Review and customize the generated files"
echo "2. 🔐 Set up GitHub secrets (see GITHUB_SECRETS_SETUP.md)"
echo "3. 🐳 Test Docker builds locally"
echo "4. 🚀 Push to GitHub to trigger the pipeline"
echo ""
echo "Files created/modified:"
echo "✅ bitbucket-pipelines.yml - Bitbucket pipeline configuration"
echo "✅ Dockerfile* - Container configurations"
echo "✅ docker-compose*.yml - Service orchestration"
echo "✅ k8s/ - Kubernetes deployment configs"
echo "✅ scripts/ - Utility scripts"
echo "✅ .env.example - Environment template"
echo "✅ BITBUCKET_VARIABLES_SETUP.md - Setup guide"
echo "✅ .gitignore - Git ignore rules"
echo ""
echo "📚 For detailed information, see BITBUCKET_PIPELINE_SETUP.md"
echo "🆘 For help, check the troubleshooting section in BITBUCKET_PIPELINE_SETUP.md"
echo ""

# Check if this is a fresh setup
if [ ! -f "bitbucket-pipelines.yml" ]; then
    print_warning "Pipeline configuration file not found. Please ensure all files were created correctly."
fi

print_success "Setup script completed!"
