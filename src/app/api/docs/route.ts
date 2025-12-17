import { NextResponse } from 'next/server';
import swaggerJsdoc, { Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blast Wheels API',
      version: '1.0.0',
      description: 'API documentation for Blast Wheels Play-to-Earn Racing Game',
      contact: {
        name: 'Blast Wheels Support',
        email: 'support@blastwheels.com',
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    // No global security - each endpoint specifies its own security requirements
  },
  apis: [
    './src/app/api/**/route.ts', // Path to the API route files
    './src/app/api/**/*.ts', // Also check other TypeScript files
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export async function GET() {
  return NextResponse.json(swaggerSpec);
}

