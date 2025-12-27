import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/cars:
 *   get:
 *     summary: List cars (NFTs)
 *     tags: [Cars]
 *     parameters:
 *       - in: query
 *         name: ownerAddress
 *         schema:
 *           type: string
 *       - in: query
 *         name: collectionId
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, tokenId, or suiObjectId
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated list of cars
 *   post:
 *     summary: Create a car record (NFT metadata)
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenId
 *               - suiObjectId
 *               - name
 *             properties:
 *               tokenId:
 *                 type: string
 *               suiObjectId:
 *                 type: string
 *               ownerAddress:
 *                 type: string
 *               collectionId:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Car created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const skip = (page - 1) * limit;

    const ownerAddress = searchParams.get('ownerAddress') || undefined;
    const collectionId = searchParams.get('collectionId') || undefined;
    const search = searchParams.get('search') || undefined;

    const where: any = {};

    if (ownerAddress) where.ownerAddress = ownerAddress;
    if (collectionId) where.collectionId = collectionId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { tokenId: { contains: search, mode: 'insensitive' } },
        { suiObjectId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [cars, total] = await Promise.all([
      prisma.nFT.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.nFT.count({ where }),
    ]);

    return NextResponse.json({
      cars,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List cars error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json();
    const {
      tokenId,
      suiObjectId,
      ownerAddress,
      collectionId,
      name,
      description,
      imageUrl,
      metadata,
    } = body as {
      tokenId?: string;
      suiObjectId?: string;
      ownerAddress?: string;
      collectionId?: string;
      name?: string;
      description?: string;
      imageUrl?: string;
      metadata?: Record<string, any>;
    };

    if (!tokenId || !tokenId.trim()) {
      return NextResponse.json(
        { error: 'tokenId is required' },
        { status: 400 }
      );
    }
    if (!suiObjectId || !suiObjectId.trim()) {
      return NextResponse.json(
        { error: 'suiObjectId is required' },
        { status: 400 }
      );
    }
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    const resolvedOwner = ownerAddress?.trim() || authUser.walletAddress;
    if (!resolvedOwner || !resolvedOwner.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Valid ownerAddress is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.nFT.findFirst({
      where: {
        OR: [{ tokenId }, { suiObjectId }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'tokenId or suiObjectId already exists' },
        { status: 400 }
      );
    }

    const car = await prisma.nFT.create({
      data: {
        tokenId: tokenId.trim(),
        suiObjectId: suiObjectId.trim(),
        ownerAddress: resolvedOwner,
        collectionId: collectionId?.trim() || null,
        name: name.trim(),
        description: description?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        metadata: metadata ?? undefined,
      },
    });

    return NextResponse.json(
      { message: 'Car created', car },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create car error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

