declare module 'swagger-jsdoc' {
  export interface SwaggerDefinition {
    openapi: string;
    info: {
      title: string;
      version: string;
      description?: string;
      contact?: {
        name?: string;
        email?: string;
        url?: string;
      };
    };
    [key: string]: any;
  }

  export interface Options {
    definition: SwaggerDefinition;
    apis: string[];
  }

  export default function swaggerJsdoc(options: Options): any;
}


