# 🚀 Server Setup Guide

Simple server setup for Dealics Backend deployment.

## 📋 Prerequisites

- Ubuntu/Debian server
- Node.js 18+ installed
- Nginx installed
- SSH access with key-based authentication

## ⚡ Quick Setup

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt install nginx -y

# Create deploy user
sudo adduser deploy
sudo usermod -aG sudo deploy
```

### 2. Setup Application Directory

```bash
# Create application directories
sudo mkdir -p /var/www/dealics-prod
sudo mkdir -p /var/www/dealics-staging

# Set permissions
sudo chown deploy:deploy /var/www/dealics-prod
sudo chown deploy:deploy /var/www/dealics-staging
```

### 3. Setup Systemd Service

```bash
# Copy service file
sudo cp deploy/dealics-backend.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable dealics-backend
```

### 4. Setup Nginx

```bash
# Copy nginx config
sudo cp deploy/nginx.conf /etc/nginx/sites-available/dealics-backend

# Enable site
sudo ln -s /etc/nginx/sites-available/dealics-backend /etc/nginx/sites-enabled/

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Setup SSH Keys

```bash
# On your local machine, generate SSH key
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Copy public key to server
ssh-copy-id deploy@your-server.com
```

## 🔧 Configuration

### Environment Variables

Create `.env` file in `/var/www/dealics-prod`:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://user:password@localhost:3306/dealics
JWT_SECRET=your-super-secret-key
```

### Database Setup

```bash
# Install MySQL
sudo apt install mysql-server -y

# Create database and user
sudo mysql -e "CREATE DATABASE dealics;"
sudo mysql -e "CREATE USER 'dealics_user'@'localhost' IDENTIFIED BY 'password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON dealics.* TO 'dealics_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
```

## 🚀 Deployment

### First Deployment

```bash
# Clone repository
git clone https://bitbucket.org/your-username/dealics-backend.git
cd dealics-backend

# Install dependencies and build
npm ci
npm run build

# Copy files to production directory
sudo cp -r dist/* /var/www/dealics-prod/
sudo cp package*.json /var/www/dealics-prod/

# Install production dependencies
cd /var/www/dealics-prod
npm ci --only=production

# Start service
sudo systemctl start dealics-backend
```

### Automated Deployment

The Bitbucket pipeline will automatically deploy using the `scripts/deploy.sh` script.

## 📊 Monitoring

### Check Service Status

```bash
# Check service status
sudo systemctl status dealics-backend

# View logs
sudo journalctl -u dealics-backend -f

# Check nginx status
sudo systemctl status nginx
```

### Health Check

```bash
# Test health endpoint
curl http://your-domain.com/health
```

## 🔒 Security

### Firewall Setup

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### SSL Certificate (Optional)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## 🚨 Troubleshooting

### Common Issues

1. **Service won't start**: Check logs with `sudo journalctl -u dealics-backend`
2. **Permission denied**: Ensure deploy user owns application directory
3. **Port already in use**: Check if another service is using port 3000
4. **Database connection failed**: Verify database credentials and connectivity

### Debug Commands

```bash
# Check if port is in use
sudo netstat -tlnp | grep :3000

# Check file permissions
ls -la /var/www/dealics-prod/

# Test database connection
mysql -u dealics_user -p dealics
```

---

**🎉 Your server is now ready for automated deployments!**
