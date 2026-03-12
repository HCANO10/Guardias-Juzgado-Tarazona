'use client';

import { RequireRole } from './RequireRole';

interface HeadmasterOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function HeadmasterOnly({ children, fallback }: HeadmasterOnlyProps) {
  return (
    <RequireRole role="headmaster" fallback={fallback}>
      {children}
    </RequireRole>
  );
}
