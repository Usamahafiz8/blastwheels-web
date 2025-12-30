import { NextRequest, NextResponse } from 'next/server';

/**
 * @swagger
 * /api/cars/mint:
 *   post:
 *     summary: Mint NFT endpoint (deprecated - minting happens client-side)
 *     tags: [Cars]
 *     responses:
 *       501:
 *         description: Not implemented - minting is handled client-side
 */
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: 'This endpoint is not implemented. Minting happens client-side.' },
    { status: 501 }
  );
}

export async function GET(req: NextRequest) {
  return NextResponse.json(
    { error: 'This endpoint is not implemented. Minting happens client-side.' },
    { status: 501 }
  );
}

