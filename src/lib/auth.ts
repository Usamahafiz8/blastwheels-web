import { NextRequest } from 'next/server';
import { verifyToken } from './jwt';
import { prisma } from './db';

export interface AuthUser {
  id: string;
  walletAddress: string;
  role: string;
  email?: string;
  username: string;
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        walletAddress: true,
        role: true,
        email: true,
        username: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      email: user.email || undefined,
      username: user.username,
    };
  } catch (error) {
    return null;
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireRole(request: NextRequest, ...roles: string[]): Promise<AuthUser> {
  const user = await getAuthUser(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  if (!roles.includes(user.role)) {
    throw new Error('Forbidden');
  }
  return user;
}

