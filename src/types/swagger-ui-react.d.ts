declare module 'swagger-ui-react' {
  import type { ComponentType } from 'react';

  export interface SwaggerUIProps {
    url?: string;
    spec?: any;
    docExpansion?: 'list' | 'full' | 'none';
    defaultModelsExpandDepth?: number;
    defaultModelExpandDepth?: number;
    tryItOutEnabled?: boolean;
    [key: string]: any;
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}





