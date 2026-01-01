#!/bin/bash

# Deployment script for BlastWheels Web
# This script can be run manually or via CI/CD

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Navigate to project directory
cd ~/blastwheels-web || exit 1

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run prisma:generate

# Build application
echo "🏗️  Building application..."
npm run build

# Restart PM2 process
echo "🔄 Restarting PM2 process..."
pm2 restart blastwheels-web || pm2 start npm --name "blastwheels-web" -- start

echo "✅ Deployment completed successfully!"
pm2 status



