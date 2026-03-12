'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UserRole {
  role: 'headmaster' | 'worker' | null;
  isHeadmaster: boolean;
  isWorker: boolean;
  isLoading: boolean;
  staffId: string | null;
  staffName: string | null;
}

export function useRole(): UserRole {
  const [role, setRole] = useState<'headmaster' | 'worker' | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: staff } = await supabase
        .from('staff')
        .select('id, first_name, last_name, role')
        .eq('auth_user_id', user.id)
        .single();

      if (staff) {
        setRole(staff.role as 'headmaster' | 'worker');
        setStaffId(staff.id);
        setStaffName(`${staff.first_name} ${staff.last_name}`);
      }
      setIsLoading(false);
    }
    fetchRole();
  }, []);

  return {
    role,
    isHeadmaster: role === 'headmaster',
    isWorker: role === 'worker',
    isLoading,
    staffId,
    staffName,
  };
}
