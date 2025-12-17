# Quick Setup Guide

## Step-by-Step Setup

### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
createdb blastwheels
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql-14
sudo systemctl start postgresql
sudo -u postgres createdb blastwheels
```

**Windows:**
Download and install from [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://$(whoami):@localhost:5432/blastwheels?schema=public"
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d
SUI_NETWORK=mainnet
SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
CORS_ORIGIN=http://localhost:3000
EOF

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed

# Start backend
npm run dev
```

Backend should now be running on `http://localhost:3001`
API docs: `http://localhost:3001/api-docs`

### 3. Frontend Setup

```bash
# From project root
cd blastwheels-web

# Install dependencies
npm install

# Create .env.local (optional, defaults work)
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local

# Start frontend
npm run dev
```

Frontend should now be running on `http://localhost:3000`

### 4. Test the Setup

1. Open `http://localhost:3000` in your browser
2. Connect your Sui wallet
3. Register/Login with your wallet address
4. Visit `/dashboard` to see your stats
5. If you seeded the database, login as admin:
   - Email: `admin@blastwheels.com`
   - Password: `admin123`
   - Visit `/admin` for admin panel

## Troubleshooting

### Database Connection Issues

If you get database connection errors:

1. Check PostgreSQL is running:
   ```bash
   # macOS/Linux
   brew services list  # or systemctl status postgresql
   ```

2. Verify DATABASE_URL in `.env` matches your PostgreSQL setup:
   ```bash
   # Test connection
   psql -d blastwheels
   ```

3. Update DATABASE_URL format:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/blastwheels?schema=public"
   ```

### Port Already in Use

If port 3001 or 3000 is already in use:

1. Change PORT in backend `.env`
2. Update `NEXT_PUBLIC_API_URL` in frontend `.env.local` to match

### Prisma Migration Issues

If migrations fail:

```bash
cd backend
npx prisma migrate reset  # WARNING: This deletes all data
npm run prisma:migrate
```

## Next Steps

- Read the main [README.md](./README.md) for detailed documentation
- Check API documentation at `http://localhost:3001/api-docs`
- Explore the codebase structure
- Customize the game logic and UI

## Production Deployment

For production:

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET` (generate with `openssl rand -hex 32`)
3. Configure proper CORS origins
4. Use environment-specific database URLs
5. Set up SSL/TLS for the API
6. Configure proper rate limiting
7. Set up monitoring and logging

