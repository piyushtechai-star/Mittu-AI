// Session + the user's onboarding state (same shape as Naksh / Statusly: me, refresh, signIn, signOut).
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { logoutEverywhere } from '@/api/auth';
import { setApiHandlers } from '@/api/client';
import { ackPurchaseEvent, getConfig, getMe, type Me } from '@/api/mittu';
import { logNewSubscription } from '@/lib/integrations';
import { tokenStore } from '@/lib/storage';

type AuthState = {
  ready: boolean;
  signedIn: boolean;
  me: Me | null;
  signIn: (token: string) => Promise<void>;
  /** `everywhere` (the default, for the Sign out button) also ends the session on the server. */
  signOut: (everywhere?: boolean) => Promise<void>;
  refresh: () => Promise<Me | null>;
  setMe: (m: Me) => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMeState] = useState<Me | null>(null);
  const purchaseLogged = useRef(false);

  const signOut = useCallback(async (everywhere = true) => {
    const current = everywhere ? await tokenStore.get() : null;
    if (current) void logoutEverywhere(current);
    await tokenStore.clear();
    setToken(null);
    setMeState(null);
  }, []);

  const setMe = useCallback(async (m: Me) => {
    setMeState(m);
    // Meta fb_mobile_purchase only once, only for a brand-new subscription (the server sets this flag; guide 10).
    if (m.subscription.newSubscription && !purchaseLogged.current) {
      purchaseLogged.current = true;
      try {
        const cfg = await getConfig();
        logNewSubscription(cfg.plan.trialPricePaise / 100);
        await ackPurchaseEvent();
      } catch {}
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const m = await getMe();
      await setMe(m);
      return m;
    } catch {
      return null;
    }
  }, [setMe]);

  useEffect(() => {
    setApiHandlers({ unauthorized: () => void signOut(false), paymentRequired: () => void refresh() });
  }, [signOut, refresh]);

  useEffect(() => {
    (async () => {
      const t = await tokenStore.get();
      if (t) {
        setToken(t);
        try {
          await setMe(await getMe());
        } catch {
          // Offline or expired: a 401 already signed us out; otherwise keep the token and retry later.
        }
      }
      setReady(true);
      SplashScreen.hideAsync().catch(() => {});
    })();
  }, [setMe]);

  const signIn = useCallback(async (t: string) => {
    await tokenStore.set(t);
    setToken(t);
    await setMe(await getMe());
  }, [setMe]);

  const value = useMemo<AuthState>(() => ({
    ready, signedIn: !!token && !!me, me, signIn, signOut, refresh, setMe,
  }), [ready, token, me, signIn, signOut, refresh, setMe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
