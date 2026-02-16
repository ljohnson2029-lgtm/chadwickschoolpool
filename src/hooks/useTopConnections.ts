import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TopConnection {
  connected_user_id: string;
  full_name: string;
  avatar_url: string | null;
  account_type: string;
  message_count: number;
  shared_rides: number;
  connection_score: number;
}

export function useTopConnections(limit: number = 5) {
  const { user } = useAuth();
  const [connections, setConnections] = useState<TopConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setConnections([]);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_top_connections', {
        current_user_id: user.id,
        result_limit: limit,
      });

      if (error) {
        console.error('Error fetching top connections:', error);
      } else {
        setConnections((data as TopConnection[]) || []);
      }
      setLoading(false);
    };

    fetch();
  }, [user, limit]);

  return { connections, loading };
}
