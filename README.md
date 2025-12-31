# Blast Wheels - Full Stack Application

A Play-to-Earn Racing Game built with Next.js (frontend + API routes), PostgreSQL database, and Sui blockchain integration.

## 🚀 Features

### Full Stack in One Project
- **Next.js 16** with React 19 (App Router)
- **Next.js API Routes** - Backend API built into the same project
- **PostgreSQL** database with Prisma ORM
- **JWT Authentication** with wallet and email/password support
- **Role-based Access Control** (Admin/Player)
- **Sui Wallet Integration** using @mysten/dapp-kit
- **Modern UI** with Tailwind CSS
- **Dashboard** for players to view stats and leaderboard
- **Admin Panel** for platform management

## 📁 Project Structure

```
blastwheels-web/
├── src/
│   ├── app/
│   │   ├── api/              # Next.js API routes (backend)
│   │   │   ├── auth/         # Authentication endpoints
│   │   │   ├── users/        # User endpoints
│   │   │   ├── games/        # Game endpoints
│   │   │   ├── admin/        # Admin endpoints
│   │   │   └── sui/          # Sui blockchain endpoints
│   │   ├── dashboard/        # Player dashboard page
│   │   ├── admin/            # Admin panel page
│   │   └── page.tsx          # Home page
│   ├── components/           # React components
│   ├── contexts/             # React contexts (Auth)
│   └── lib/                  # Utilities
│       ├── api.ts            # API client
│       ├── db.ts             # Prisma client
│       ├── auth.ts           # Auth utilities
│       ├── jwt.ts            # JWT utilities
│       └── sui.ts            # Sui client
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts              # Database seed script
└── public/                   # Static assets
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1. Database Setup

Install and start PostgreSQL, then create a database:

```bash
createdb blastwheels
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/blastwheels?schema=public"

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Sui Blockchain
SUI_NETWORK=mainnet
SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
SUI_PACKAGE_ID=0x6a9c2ded791f1eea4c23ac9bc3dbebf3e5b9f828a9837c9dd62d5e5698aac3ee
```

### 4. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Seed database with sample data
npm run prisma:seed
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🔐 Authentication

### Wallet-based Login
1. Connect your Sui wallet using the Connect Button
2. Register/Login with your wallet address
3. JWT token is stored in localStorage

### Email/Password Login
1. Register with email and password (optional)
2. Login with email and password

### Default Admin Account
After seeding:
- **Username**: `admin`
- **Email**: `admin@blastwheels.com`
- **Password**: `admin123`
- **Wallet**: `0x0000000000000000000000000000000000000000000000000000000000000000`

⚠️ **Change the default admin password in production!**

## 📚 API Endpoints

All API routes are available at `/api/*`

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/profile` - Get user profile
- `GET /api/users/stats` - Get user statistics
- `GET /api/users/leaderboard` - Get leaderboard
- `GET /api/users/game-history` - Get game history

### Games
- `POST /api/games/create` - Create game session
- `GET /api/games/:id` - Get game details
- `POST /api/games/:id/complete` - Complete game session
- `GET /api/games/active` - Get active games

### Admin (Admin only)
- `GET /api/admin/users` - List all users
- `GET /api/admin/stats` - Platform statistics

### Sui Blockchain
- `GET /api/sui/balance` - Get WHEELS token balance
- `GET /api/sui/transactions` - Get transaction history

## Usage

### For Players
1. Connect your Sui wallet
2. Register/Login with your wallet address
3. Visit `/dashboard` to see your stats
4. View leaderboard and game history
5. Create and participate in game sessions

### For Admins
1. Login with admin credentials
2. Visit `/admin` to access admin panel
3. View platform statistics
4. Manage users and game sessions

## 🗄️ Database Schema

### User
- User accounts with wallet addresses
- Roles: ADMIN, PLAYER
- Optional email/password

### PlayerStats
- Game statistics per user
- Wins, losses, earnings, rank, level

### GameSession
- Individual game sessions
- Entry fees, prizes, positions

### Transaction
- On-chain transaction records
- Types: DEPOSIT, WITHDRAWAL, GAME_ENTRY, GAME_REWARD, PURCHASE

## 🔧 Development

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Prisma Studio (database GUI)
npm run prisma:studio

# Run database migrations
npm run prisma:migrate

# Seed database
npm run prisma:seed
```

## 🌐 Environment Variables

Create `.env.local` in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/blastwheels
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
SUI_NETWORK=mainnet
SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
SUI_PACKAGE_ID=0x6a9c2ded791f1eea4c23ac9bc3dbebf3e5b9f828a9837c9dd62d5e5698aac3ee
```

## 📝 License

ISC

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions, please open an issue on GitHub.
