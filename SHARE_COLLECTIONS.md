# How to Share NFT Collections

Collections must be shared on-chain for users to mint NFTs with their own wallets.

## Quick Fix

Run this command in your terminal:

```bash
cd /Users/cybillnerd/Desktop/blastwheel/blastwheels-web
npm run share-collections
```

## Prerequisites

Make sure you have `ADMIN_PRIVATE_KEY` or `ADMIN_MNEMONIC` set in your `.env.local` file:

```env
ADMIN_PRIVATE_KEY=your_private_key_here
# OR
ADMIN_MNEMONIC=your_mnemonic_phrase_here
```

## What the Script Does

1. Checks all 32 NFT collections
2. Shares any collections that aren't already shared
3. Shows progress for each collection
4. Provides a summary at the end

## After Running

Once collections are shared:
- ✅ Users can mint NFTs with their own wallets
- ✅ Users pay gas fees from their Sui wallets
- ✅ Purchase price is deducted from database balance
- ✅ NFTs are minted and transferred to user wallets

## Alternative: Use Admin API

If you're logged in as an admin, you can also use the admin API endpoint:
- The marketplace will automatically try to share collections when you attempt to purchase
- Or call: `POST /api/admin/share-collections` (requires admin authentication)

## Troubleshooting

**Error: "Admin credentials not configured"**
- Make sure `ADMIN_PRIVATE_KEY` or `ADMIN_MNEMONIC` is set in `.env.local`
- Restart your dev server after adding the environment variable

**Error: "Insufficient balance"**
- Make sure the admin account has at least 0.1 SUI per collection (about 3.2 SUI total for all 32 collections)

**Collections already shared**
- The script will skip collections that are already shared
- Safe to run multiple times

