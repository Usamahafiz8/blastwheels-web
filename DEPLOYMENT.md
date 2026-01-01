# Deployment Guide

## Automated CI/CD Setup

This project includes GitHub Actions for automated deployment when code is pushed to the `main` branch.

### Prerequisites

1. **GitHub Secrets** - Add these secrets to your GitHub repository:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `JWT_SECRET` - Your JWT secret key
   - `SUI_NETWORK` - Sui network (mainnet)
   - `SUI_RPC_URL` - Sui RPC endpoint
   - `SUI_PACKAGE_ID` - Sui package ID
   - `SSH_HOST` - Your server IP address
   - `SSH_USERNAME` - SSH username (usually `root`)
   - `SSH_PRIVATE_KEY` - Your SSH private key
   - `SSH_PORT` - SSH port (optional, defaults to 22)

### Setting up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret listed above

### How to Get SSH Private Key

On your server, run:
```bash
cat ~/.ssh/id_rsa
```

Copy the output and add it as `SSH_PRIVATE_KEY` secret in GitHub.

### Manual Deployment

If you prefer to deploy manually or the CI/CD fails, you can use the deployment script:

```bash
cd ~/blastwheels-web
./deploy.sh
```

Or run the commands manually:

```bash
cd ~/blastwheels-web
git pull origin main
npm ci
npm run prisma:generate
npm run build
pm2 restart blastwheels-web
```

### PM2 Setup (First Time)

If PM2 is not set up yet, run:

```bash
cd ~/blastwheels-web
npm install -g pm2
pm2 start npm --name "blastwheels-web" -- start
pm2 save
pm2 startup  # Follow instructions to enable PM2 on system startup
```

### Troubleshooting

**Build fails with Prisma errors:**
```bash
npm run prisma:generate
```

**PM2 process not found:**
```bash
pm2 start npm --name "blastwheels-web" -- start
```

**View PM2 logs:**
```bash
pm2 logs blastwheels-web
```

**Restart PM2:**
```bash
pm2 restart blastwheels-web
```

**Check PM2 status:**
```bash
pm2 status
```



