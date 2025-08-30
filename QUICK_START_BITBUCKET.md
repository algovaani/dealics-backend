# 🚀 Quick Start: Bitbucket Pipeline Setup

Get your Dealics backend pipeline running in minutes with this quick start guide.

## ⚡ Quick Setup (5 minutes)

### 1. Enable Pipelines
1. Go to your Bitbucket repository
2. Navigate to **Repository settings** > **Pipelines**
3. Click **Enable Pipelines**

### 2. Add Repository Variables
Go to **Repository settings** > **Pipelines** > **Repository variables** and add:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `STAGING_SERVER_HOST` | `staging.yourdomain.com` | Staging server hostname |
| `PRODUCTION_SERVER_HOST` | `yourdomain.com` | Production server hostname |

### 3. Push to Trigger Pipeline
```bash
git add .
git commit -m "Add Bitbucket pipeline configuration"
git push origin main
```

## 🔄 What Happens Next

### On Every Push:
- ✅ **Lint & Test**: Code quality checks
- ✅ **Security Scan**: Vulnerability assessment
- ✅ **Build**: TypeScript compilation

### On `develop` Branch:
- 🚀 **Deploy to Staging**: Automatic staging deployment

### On `main` Branch:
- 🚀 **Deploy to Production**: Production deployment
- 🏥 **Health Check**: Post-deployment verification

### On Pull Requests:
- 🔒 **Quality Gates**: Blocks merge if tests fail

## 🚀 Server Deployment

The pipeline automatically:
- Builds the TypeScript application
- Runs tests to ensure quality
- Deploys directly to your server via SSH
- Restarts the service automatically

## 🚨 Troubleshooting

### Pipeline Not Running?
- ✅ Check if Pipelines are enabled
- ✅ Verify `bitbucket-pipelines.yml` exists in root
- ✅ Ensure file has correct YAML syntax

### Build Failures?
- ✅ Check if `npm test` passes locally
- ✅ Verify all dependencies are in `package.json`
- ✅ Check if linting passes locally

### Deployment Issues?
- ✅ Verify SSH key authentication
- ✅ Check server permissions
- ✅ Ensure service is properly configured

## 📚 Next Steps

1. **Setup Server**: Follow [SERVER_SETUP.md](SERVER_SETUP.md) guide
2. **Customize Deployment**: Update deployment paths in pipeline
3. **Add Notifications**: Integrate with Slack, email, etc.
4. **Monitor Performance**: Set up logging and metrics

## 🆘 Need Help?

- 📖 **Full Guide**: See `BITBUCKET_PIPELINE_SETUP.md`
- 🐛 **Issues**: Check pipeline logs in Bitbucket
- 🔧 **Customization**: Modify `bitbucket-pipelines.yml`

---

**🎉 You're all set!** Your pipeline will now run automatically on every push.
