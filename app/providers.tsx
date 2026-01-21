'use client';

import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/app/auth/AuthProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster position="bottom-right" />
    </AuthProvider>
  );
}
