'use client';

import { useRole } from '@/hooks/use-role';
import { Skeleton } from '@/components/ui/skeleton';

interface RequireRoleProps {
  role: 'headmaster' | 'worker' | 'any';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireRole({ role, children, fallback }: RequireRoleProps) {
  const { isHeadmaster, isWorker, isLoading } = useRole();

  if (isLoading) return <Skeleton className="h-8 w-full" />;
  if (role === 'any') return <>{children}</>;
  if (role === 'headmaster' && isHeadmaster) return <>{children}</>;
  if (role === 'worker' && isWorker) return <>{children}</>;

  return fallback ? <>{fallback}</> : null;
}
