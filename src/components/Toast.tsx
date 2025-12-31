'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: 'success' | 'error' | 'info';
}

export default function Toast({ message, isVisible, onClose, type = 'success' }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-up">
      <div
        className={`px-6 py-4 rounded-lg shadow-2xl border backdrop-blur-md ${
          type === 'success'
            ? 'bg-green-500/20 border-green-500/50 text-green-400'
            : type === 'error'
            ? 'bg-red-500/20 border-red-500/50 text-red-400'
            : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
        }`}
      >
        <div className="flex items-center space-x-3">
          {type === 'success' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : type === 'error' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-medium">{message}</span>
        </div>
      </div>
    </div>
  );
}

