import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

interface Profile {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  home_address: string | null;
  home_latitude: number | null;
  home_longitude: number | null;
  car_make: string | null;
  car_model: string | null;
  car_color: string | null;
  license_plate: string | null;
  car_seats: number | null;
  account_type: 'parent' | 'student';
  grade_level: string | null;
  avatar_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  parent_guardian_name: string | null;
  parent_guardian_phone: string | null;
  parent_guardian_email: string | null;
  profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const authSyncIdRef = useRef(0);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching profile:', error);
      return null;
    }

    return (data as unknown as Profile | null) ?? null;
  };

  const getFallbackUsername = (nextUser: User) => {
    const metadataUsername = nextUser.user_metadata?.username;
    if (typeof metadataUsername === 'string' && metadataUsername.trim()) {
      return metadataUsername.trim();
    }

    const emailName = nextUser.email?.split('@')[0]?.trim();
    if (emailName) {
      return emailName;
    }

    return `user-${nextUser.id.slice(0, 8)}`;
  };

  const buildFallbackProfile = (nextUser: User): Profile => ({
    id: nextUser.id,
    username: getFallbackUsername(nextUser),
    first_name: typeof nextUser.user_metadata?.first_name === 'string' ? nextUser.user_metadata.first_name : null,
    last_name: typeof nextUser.user_metadata?.last_name === 'string' ? nextUser.user_metadata.last_name : null,
    phone_number: null,
    home_address: null,
    home_latitude: null,
    home_longitude: null,
    car_make: null,
    car_model: null,
    car_color: null,
    license_plate: null,
    car_seats: null,
    account_type: nextUser.email?.toLowerCase().endsWith('@chadwickschool.org') ? 'student' : 'parent',
    grade_level: null,
    avatar_url: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    parent_guardian_name: null,
    parent_guardian_phone: null,
    parent_guardian_email: null,
    profile_complete: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const repairMissingProfile = async (nextUser: User): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('repair-profile', {
        body: {},
      });

      if (error) {
        logger.error('Error repairing missing profile:', error);
        return buildFallbackProfile(nextUser);
      }

      const repairedProfile = (data?.profile ?? data) as Profile | null | undefined;
      return repairedProfile ?? buildFallbackProfile(nextUser);
    } catch (error) {
      logger.error('Unexpected error repairing missing profile:', error);
      return buildFallbackProfile(nextUser);
    }
  };

  const syncAuthState = async (nextSession: Session | null) => {
    const syncId = ++authSyncIdRef.current;
    const nextUser = nextSession?.user ?? null;

    setSession(nextSession);
    setUser(nextUser);

    if (!nextUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetchedProfile = await fetchProfile(nextUser.id);

    if (authSyncIdRef.current !== syncId) {
      return;
    }

    const nextProfile = fetchedProfile ?? await repairMissingProfile(nextUser);

    if (authSyncIdRef.current !== syncId) {
      return;
    }

    setProfile(nextProfile);
    setLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        void syncAuthState(nextSession);
      }
    );

    void supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      void syncAuthState(initialSession);
    });

    return () => {
      authSyncIdRef.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    // IMPORTANT: In some cases the backend may respond with `session_not_found`
    // (e.g. expired/revoked sessions). We still must clear the local persisted
    // session to prevent the app from “re-logging in” on refresh.
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      logger.warn('Local sign out failed; attempting manual cleanup:', error);
    }

    // Best-effort cleanup of any persisted auth tokens.
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) continue;
        // Supabase auth tokens are stored under keys like: sb-<project-ref>-auth-token
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      logger.warn('Manual auth storage cleanup failed:', error);
    }

    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};