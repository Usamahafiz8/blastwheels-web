import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/admin/car-types:
 *   get:
 *     summary: List all car types (admin only)
 *     tags: [Admin, Car Types]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of car types
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin)
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, 'ADMIN');
    
    // Car types are managed through the NFT system
    // This endpoint can return available car types from the NFT collection map
    return NextResponse.json({ 
      message: 'Car types are managed through NFT collections',
      carTypes: []
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    console.error('Get car types error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
