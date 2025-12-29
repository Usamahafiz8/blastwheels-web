'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<any>(null);
  const [specLoading, setSpecLoading] = useState(true);

  useEffect(() => {
    // Fetch API spec without authentication requirement
    fetch('/api/docs')
      .then((res) => res.json())
      .then((data) => {
        setSpec(data);
        setSpecLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load API spec:', err);
        setSpecLoading(false);
      });
  }, []);

  if (specLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading API documentation...</div>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl mb-4">Failed to load API documentation</h2>
          <p className="text-gray-400">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SwaggerUI spec={spec} />
    </div>
  );
}

