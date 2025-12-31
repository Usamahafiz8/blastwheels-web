import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * CORS helper function to add CORS headers to API responses
 * Allows all origins (*) for development and production
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflight(): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Wrapper for API route handlers to automatically add CORS headers
 */
export function withCors<T>(
  handler: (req: NextRequest) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest): Promise<NextResponse<T>> => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return handleCorsPreflight();
    }

    // Execute the handler and add CORS headers
    const response = await handler(req);
    return addCorsHeaders(response);
  };
}

