# Bitbucket Pipeline Setup Guide

This repository includes a comprehensive Bitbucket pipeline setup for automated building, testing, and deployment of the Dealics backend application.

## 🚀 Pipeline Overview

The Bitbucket pipeline includes:
- **Automated Testing**: Unit tests and build verification
- **Build Automation**: TypeScript compilation
- **Multi-Environment Deployment**: Staging and production server deployments
- **Simple Deployment**: Direct server deployment via SSH

## 📁 Pipeline Files

### Bitbucket Pipeline
- `bitbucket-pipelines.yml` - Main pipeline configuration

### Deployment Scripts
- `scripts/deploy.sh` - Server deployment script

### Server Configuration
- `deploy/dealics-backend.service` - Systemd service file
- `deploy/nginx.conf` - Nginx configuration
- `SERVER_SETUP.md` - Server setup guide

## 🛠️ Setup Instructions

### 1. Bitbucket Repository Setup

#### Repository Variables
Add these variables to your Bitbucket repository (Repository settings > Pipelines > Repository variables):

```bash
# Server Configuration
STAGING_SERVER_HOST=your-staging-server.com
PRODUCTION_SERVER_HOST=your-production-server.com

# Optional: Database Configuration (if needed for tests)
DATABASE_URL=mysql://user:password@host:port/database
```

#### Enable Pipelines
1. Go to Repository settings > Pipelines
2. Enable Pipelines if not already enabled
3. Ensure the `bitbucket-pipelines.yml` file is in your repository root

### 2. Server Setup

Follow the [SERVER_SETUP.md](SERVER_SETUP.md) guide to set up your deployment server.

### 3. SSH Key Setup

#### Prerequisites
- Server with Node.js 18+ installed
- SSH access with key-based authentication
- Nginx for reverse proxy (optional)

#### Setup SSH Keys
```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Copy public key to server
ssh-copy-id deploy@your-server.com

# Test connection
ssh deploy@your-server.com
```

## 🔄 Pipeline Workflow

### Default Branch (any branch)
1. **Push to any branch** → Triggers pipeline
2. **Lint & Test** → Code quality checks with MySQL and Redis services

### Development Branch (`develop`)
1. **Push to develop** → Triggers pipeline
2. **Build & Test** → TypeScript compilation and testing
3. **Security Scan** → Vulnerability assessment
4. **Build Docker Image** → Container image creation
5. **Deploy to Staging** → Staging environment deployment

### Main Branch (`main`)
1. **Push to main** → Triggers pipeline
2. **All previous steps** → Quality gates
3. **Database Migration** → Schema updates
4. **Build Docker Image** → Production image creation
5. **Push to Registry** → Container registry upload
6. **Deploy to Production** → Production deployment
7. **Health Check** → Post-deployment verification

### Pull Requests
- Triggers all quality checks
- Blocks merge if tests fail
- Provides feedback on code quality

### Tags (Releases)
- **v* tags** → Release pipeline
- **Build Release** → Production build
- **Push Docker Image** → Tagged image to registry
- **Deploy Release** → Production deployment

## 🧪 Testing and Quality

### Automated Tests
```bash
# Run tests locally
npm test

# Run with coverage
npm run test:coverage

# Run linting
npm run lint
```

### Security Scanning
- **npm audit**: Dependency vulnerability checks
- **Container scanning**: Docker image security

### Code Quality
- TypeScript strict mode enabled
- ESLint configuration (if configured)
- Automated formatting (if configured)

## 🚀 Deployment Strategies

### Blue-Green Deployment
- Zero-downtime deployments
- Easy rollback capability
- Traffic switching between versions

### Rolling Updates
- Gradual pod replacement
- Maintains service availability
- Configurable update strategy

### Canary Deployments
- Gradual traffic shifting
- Risk mitigation
- Performance monitoring

## 📊 Monitoring and Observability

### Health Checks
- `/health` endpoint for Kubernetes probes
- Database connection monitoring
- Application uptime tracking

### Logging
- Structured logging
- Log aggregation (ELK stack compatible)
- Error tracking and alerting

### Metrics
- Application performance metrics
- Resource utilization
- Business metrics integration

## 🔧 Customization

### Environment-Specific Configs
```bash
# Create environment-specific files
cp k8s/deployment.yaml k8s/deployment-staging.yaml
cp k8s/deployment.yaml k8s/deployment-production.yaml

# Modify resource limits, replicas, etc.
```

### Custom Deployment Scripts
```bash
# Add to pipeline
- name: Custom deployment
  script:
    - ./scripts/deploy.sh $BITBUCKET_BRANCH
```

### Integration with External Tools
- Slack notifications
- Jira ticket updates
- Email alerts
- Status page updates

## 🚨 Troubleshooting

### Common Issues

#### Pipeline Failures
```bash
# Check pipeline logs in Bitbucket
# Verify repository variables are set correctly
# Check environment variables
```

#### Docker Build Issues
```bash
# Clear Docker cache
docker system prune -a

# Check .dockerignore
# Verify Dockerfile syntax
```

#### Kubernetes Deployment Issues
```bash
# Check pod status
kubectl describe pod <pod-name> -n dealics

# Check logs
kubectl logs <pod-name> -n dealics

# Verify secrets
kubectl get secrets -n dealics
```

### Debug Commands
```bash
# Pipeline debugging
# Use Bitbucket's built-in pipeline debugging tools

# Docker debugging
docker run --rm -it dealics-backend:latest sh

# Kubernetes debugging
kubectl exec -it <pod-name> -n dealics -- sh
```

## 📚 Additional Resources

- [Bitbucket Pipelines Documentation](https://support.atlassian.com/bitbucket-cloud/docs/get-started-with-bitbucket-pipelines/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [CI/CD Best Practices](https://www.atlassian.com/continuous-delivery/principles/continuous-integration-vs-delivery-deployment)

## 🤝 Contributing

When contributing to the pipeline:
1. Test changes locally first
2. Update documentation
3. Follow existing patterns
4. Add appropriate tests
5. Update this guide if needed

## 📄 License

This pipeline configuration is part of the Dealics project and follows the same license terms.
