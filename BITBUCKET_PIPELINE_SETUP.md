# Bitbucket Pipeline Setup Guide

## Overview
This pipeline automatically deploys your Node.js application to different domains based on the branch:
- **master branch** → Production domain
- **dev branch** → Development domain

## Pipeline Configuration

The pipeline uses rsync to deploy files and SSH to execute the deployment script on your servers.

## Required Environment Variables

### Production Environment Variables (for master branch)
Set these in Bitbucket Repository Settings → Pipelines → Repository Variables:

| Variable Name | Description | Example |
|---------------|-------------|---------|
| `PROD_SSH_PRIVATE_KEY` | SSH private key for production server | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `PROD_DEPLOY_HOST` | Production server hostname/IP | `192.168.1.100` |
| `PROD_DEPLOY_USER` | SSH username for production server | `deploy` |
| `PROD_DEPLOY_PATH` | Deployment path on production server | `/var/www/api.yourdomain.com` |

### Development Environment Variables (for dev branch)
Set these in Bitbucket Repository Settings → Pipelines → Repository Variables:

| Variable Name | Description | Example |
|---------------|-------------|---------|
| `DEV_SSH_PRIVATE_KEY` | SSH private key for development server | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DEV_DEPLOY_HOST` | Development server hostname/IP | `192.168.1.101` |
| `DEV_DEPLOY_USER` | SSH username for development server | `deploy` |
| `DEV_DEPLOY_PATH` | Deployment path on development server | `/var/www/dev-api.yourdomain.com` |

## Server Setup Requirements

### 1. SSH Access
Ensure your Bitbucket pipeline can SSH to your servers:
- Generate SSH key pair for deployment
- Add the public key to your server's `~/.ssh/authorized_keys`
- Add the private key as a repository variable in Bitbucket

### 2. Directory Structure
Your servers should have this structure:
```
/var/www/
├── api.yourdomain.com/      # Production
│   ├── dist/
│   ├── package.json
│   ├── ecosystem.config.cjs
│   ├── deploy.sh
│   └── logs/
└── dev-api.yourdomain.com/  # Development
    ├── dist/
    ├── package.json
    ├── ecosystem.config.cjs
    ├── deploy.sh
    └── logs/
```

### 3. PM2 Setup
Install PM2 on your servers:
```bash
npm install -g pm2
```

### 4. Node.js Setup
Install Node.js 20+ and NVM on your servers:
```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Install PM2
npm install -g pm2
```

## Pipeline Workflow

### Master Branch (Production)
1. Triggers on push to `master`
2. Builds TypeScript application
3. Uses rsync to transfer files to production server
4. Executes deployment script on production server
5. Installs dependencies and starts PM2 process

### Dev Branch (Development)
1. Triggers on push to `dev`
2. Builds TypeScript application
3. Uses rsync to transfer files to development server
4. Executes deployment script on development server
5. Installs dependencies and starts PM2 process

## Deployment Script

The `deploy.sh` script handles:
- Environment setup (NVM, corepack, npm)
- Dependency installation
- TypeScript compilation
- PM2 process management
- Logging and error handling

## Files Included in Deployment

The pipeline transfers these files to your servers:
- `dist/` - Compiled TypeScript code
- `package.json` - Dependencies and scripts
- `package-lock.json` - Locked dependency versions
- `ecosystem.config.cjs` - PM2 configuration
- `deploy.sh` - Deployment script
- `env.example` - Environment template

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   - Verify SSH private key is correctly set in repository variables
   - Check server hostname/IP and username
   - Ensure SSH key is added to server's authorized_keys

2. **PM2 Process Not Found**
   - Make sure PM2 is installed globally on the server
   - Check if the app was previously started with PM2
   - Verify ecosystem.config.cjs file exists

3. **Build Failures**
   - Check TypeScript compilation errors
   - Verify all dependencies are in package.json
   - Ensure build script is working locally

4. **Permission Issues**
   - Ensure deploy user has write permissions to deployment path
   - Check that deploy.sh is executable: `chmod +x deploy.sh`

### Debugging

To debug pipeline issues:
1. Check Bitbucket Pipeline logs
2. SSH to server manually and run deployment commands
3. Check PM2 logs: `pm2 logs dealics-backend`
4. Verify file permissions and ownership
5. Check server logs in `/var/www/[domain]/logs/`

## Security Considerations

1. **SSH Keys**: Use dedicated deployment keys with minimal permissions
2. **Environment Variables**: Never commit sensitive data to your repository
3. **Server Access**: Limit SSH access to deployment user only
4. **PM2**: Run PM2 processes with non-root user
5. **File Permissions**: Ensure proper file permissions on deployment paths

## Customization

You can customize the pipeline by:
- Adding additional build steps
- Including database migrations
- Adding health checks
- Implementing rollback mechanisms
- Adding Slack/email notifications
- Customizing PM2 configuration
- Adding environment-specific configurations
