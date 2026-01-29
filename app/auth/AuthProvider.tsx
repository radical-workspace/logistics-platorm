'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/client/supabaseclient';
import type { Profile } from '@/lib/shared/types';
import { useAuthStore } from '@/lib/client/auth-store';
import { publicEnv } from '@/lib/env/public';

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
  const disableSessionSync = typeof navigator !== 'undefined' && navigator.webdriver;

  const syncSessionCookies = (session: { access_token?: string; refresh_token?: string; expires_at?: number } | null) => {
    if (typeof document === 'undefined') return;
    const maxAge =
      session?.expires_at && Number.isFinite(session.expires_at) ? Math.max(0, session.expires_at - Math.floor(Date.now() / 1000)) : 0;
    const expires = maxAge > 0 ? `; Max-Age=${maxAge}` : '; Max-Age=0';
    const projectRef = (() => {
      try {
        return new URL(publicEnv.NEXT_PUBLIC_SUPABASE_URL).host.split('.')[0];
      } catch {
        return '';
      }
    })();

    const setCookie = (name: string, value?: string) => {
      if (!value) {
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
        return;
      }
      document.cookie = `${name}=${value}; Path=/; SameSite=Lax${expires}`;
    };

    const authTokenPayload =
      session && session.access_token
        ? encodeURIComponent(
            JSON.stringify({
              currentSession: session,
              expiresAt: session.expires_at ?? null,
            })
          )
        : null;

    setCookie('sb-access-token', session?.access_token);
    setCookie('sb-refresh-token', session?.refresh_token);
    if (projectRef) {
      setCookie(`sb-${projectRef}-access-token`, session?.access_token);
      setCookie(`sb-${projectRef}-refresh-token`, session?.refresh_token);
      setCookie(`sb-${projectRef}-auth-token`, authTokenPayload ?? undefined);
    }
  };

  const syncSessionToServer = useCallback(
    async (session: { access_token?: string; refresh_token?: string } | null) => {
      if (disableSessionSync) return;
      if (!session?.access_token || !session?.refresh_token) return;
      try {
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
          credentials: 'include',
        });
      } catch {
        // best-effort; ignore
      }
    },
    [disableSessionSync],
  );

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
      syncSessionCookies(data.session ?? null);
      void syncSessionToServer(data.session ?? null);
      await hydrate(data.session?.user ?? null);

      if (!isMounted) return;
      setIsLoading(false);
      setStoreLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      syncSessionCookies(session ?? null);
      void syncSessionToServer(session ?? null);
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
  }, [setStoreLoading, setStoreUser, syncSessionToServer]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      syncSessionCookies(data.session ?? null);
      void syncSessionToServer(data.session ?? null);
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    syncSessionCookies(null);
    if (!disableSessionSync) {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: null, refresh_token: null }),
        credentials: 'include',
      }).catch(() => {});
    }
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
