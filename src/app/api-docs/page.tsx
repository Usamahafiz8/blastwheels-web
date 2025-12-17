'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [spec, setSpec] = useState<any>(null);
  const [specLoading, setSpecLoading] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'ADMIN') {
      // Non-admins see a forbidden state, no need to fetch spec
      setSpecLoading(false);
      return;
    }

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
  }, [loading, user, router]);

  if (loading || specLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading API documentation...</div>
      </div>
    );
  }

  if (!user) {
    // Just in case redirect didn't happen yet
    return null;
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl mb-4">Access Denied</h2>
          <p className="text-gray-400">Only admins can view the API documentation.</p>
        </div>
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

