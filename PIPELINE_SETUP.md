# CI/CD Pipeline Setup Guide

This repository includes a comprehensive CI/CD pipeline setup for automated building, testing, and deployment of the Dealics backend application.

## 🚀 Pipeline Overview

The pipeline includes:
- **Automated Testing**: Linting, unit tests, and security scans
- **Build Automation**: TypeScript compilation and Docker image building
- **Security Scanning**: npm audit and Snyk vulnerability checks
- **Database Migrations**: Automated schema updates
- **Multi-Environment Deployment**: Staging and production deployments
- **Container Orchestration**: Kubernetes deployment configurations

## 📁 Pipeline Files

### GitHub Actions
- `.github/workflows/ci-cd.yml` - Main CI/CD pipeline
- `.github/workflows/docker-deploy.yml` - Docker-based deployment

### Docker Configuration
- `Dockerfile` - Production container image
- `Dockerfile.dev` - Development container image
- `docker-compose.yml` - Production services
- `docker-compose.dev.yml` - Development services
- `.dockerignore` - Docker build optimization

### Kubernetes Configuration
- `k8s/deployment.yaml` - Application deployment
- `k8s/service.yaml` - Service configuration
- `k8s/ingress.yaml` - Ingress and routing
- `k8s/secrets.yaml` - Secrets template

## 🛠️ Setup Instructions

### 1. GitHub Repository Setup

#### Required Secrets
Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

```bash
# Database Configuration
DATABASE_URL=mysql://user:password@host:port/database
TEST_DATABASE_URL=mysql://user:password@host:port/test_database

# Security
JWT_SECRET=your-super-secret-jwt-key
SNYK_TOKEN=your-snyk-api-token

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### Environment Protection
Create environments in GitHub:
1. Go to Settings > Environments
2. Create `staging` and `production` environments
3. Add required reviewers for production deployments

### 2. Docker Setup

#### Build and Test Locally
```bash
# Build production image
docker build -t dealics-backend:latest .

# Build development image
docker build -f Dockerfile.dev -t dealics-backend:dev .

# Run with Docker Compose
docker-compose up -d

# Run development environment
docker-compose -f docker-compose.dev.yml up -d
```

#### Push to Container Registry
```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Tag and push
docker tag dealics-backend:latest ghcr.io/USERNAME/dealics-backend:latest
docker push ghcr.io/USERNAME/dealics-backend:latest
```

### 3. Kubernetes Deployment

#### Prerequisites
- Kubernetes cluster (minikube, GKE, EKS, AKS, etc.)
- kubectl configured
- Helm (optional, for additional tools)

#### Deploy Application
```bash
# Create namespace
kubectl create namespace dealics

# Apply secrets (update with your values first)
kubectl apply -f k8s/secrets.yaml -n dealics

# Deploy application
kubectl apply -f k8s/deployment.yaml -n dealics
kubectl apply -f k8s/service.yaml -n dealics
kubectl apply -f k8s/ingress.yaml -n dealics

# Check deployment status
kubectl get pods -n dealics
kubectl get services -n dealics
kubectl get ingress -n dealics
```

#### Update Secrets
```bash
# Encode your values
echo -n "your-value" | base64

# Update secrets.yaml with encoded values
# Then apply
kubectl apply -f k8s/secrets.yaml -n dealics
```

## 🔄 Pipeline Workflow

### Development Branch (`develop`)
1. **Push to develop** → Triggers pipeline
2. **Lint & Test** → Code quality checks
3. **Security Scan** → Vulnerability assessment
4. **Build** → TypeScript compilation
5. **Deploy to Staging** → Automatic deployment

### Main Branch (`main`)
1. **Push to main** → Triggers pipeline
2. **All previous steps** → Quality gates
3. **Database Migration** → Schema updates
4. **Deploy to Production** → Production deployment
5. **Health Check** → Post-deployment verification

### Pull Requests
- Triggers all quality checks
- Blocks merge if tests fail
- Provides feedback on code quality

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
- **Snyk**: Advanced security scanning
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
  run: |
    ./scripts/deploy.sh ${{ github.ref_name }}
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
# Check pipeline logs
# Verify secrets are set correctly
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
act -j build  # Run GitHub Actions locally

# Docker debugging
docker run --rm -it dealics-backend:latest sh

# Kubernetes debugging
kubectl exec -it <pod-name> -n dealics -- sh
```

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
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
