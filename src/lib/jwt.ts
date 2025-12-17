import jwt, { SignOptions } from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  walletAddress: string;
  role: string;
}

export function generateToken(payload: TokenPayload): string {
  const secret = process.env.JWT_SECRET;
  const expiresIn: SignOptions['expiresIn'] = (process.env.JWT_EXPIRES_IN as any) || '7d';

  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.verify(token, secret) as TokenPayload;
}

