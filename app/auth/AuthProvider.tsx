'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseclient';
import type { Profile } from '@/lib/types';
import { useAuthStore } from '@/lib/auth-store';

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: unknown | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const setStoreUser = useAuthStore((s) => s.setUser);
  const setStoreLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async (authUser: User | null) => {
      if (!isMounted) return;

      setUser(authUser);

      if (!authUser) {
        setProfile(null);
        setStoreUser(null);
        return;
      }

      const fetchProfile = async (): Promise<Profile | null> => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (error) return null;
        return data as Profile;
      };

      const profileRow = await fetchProfile();

      if (!isMounted) return;
      if (!profileRow) {
        setProfile(null);
        setStoreUser(null);
        return;
      }

      setProfile(profileRow);
      setStoreUser(profileRow);
    };

    (async () => {
      setIsLoading(true);
      setStoreLoading(true);

      const { data } = await supabase.auth.getSession();
      await hydrate(data.session?.user ?? null);

      if (!isMounted) return;
      setIsLoading(false);
      setStoreLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoading(true);
      setStoreLoading(true);
      void hydrate(session?.user ?? null).finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
        setStoreLoading(false);
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setStoreLoading, setStoreUser]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
