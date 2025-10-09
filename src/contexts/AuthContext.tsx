import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  user_id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  created_at: string;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user data
    const storedUser = localStorage.getItem('schoolpool_user');
    const rememberMe = localStorage.getItem('schoolpool_remember');
    
    if (storedUser && rememberMe === 'true') {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (usernameOrEmail: string, password: string, rememberMe = false) => {
    const { data, error } = await supabase.functions.invoke('auth-login', {
      body: { usernameOrEmail, password }
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Login failed');

    setUser(data.user);
    
    if (rememberMe) {
      localStorage.setItem('schoolpool_user', JSON.stringify(data.user));
      localStorage.setItem('schoolpool_remember', 'true');
    } else {
      sessionStorage.setItem('schoolpool_user', JSON.stringify(data.user));
      localStorage.removeItem('schoolpool_remember');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('schoolpool_user');
    localStorage.removeItem('schoolpool_remember');
    sessionStorage.removeItem('schoolpool_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};