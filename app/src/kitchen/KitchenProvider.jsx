// The signed-in user's kitchens (F07), kept live, plus which one is active.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { watchMyKitchens, setActiveKitchen } from '../lib/kitchens';

const KitchenContext = createContext(null);

export function KitchenProvider({ children }) {
  const { user, profile } = useAuth();
  const [kitchens, setKitchens] = useState(undefined); // undefined = loading
  const [error, setError] = useState(null);
  const uid = user ? user.uid : null;

  useEffect(() => {
    setKitchens(uid ? undefined : []);
    setError(null);
    if (!uid) return undefined;
    return watchMyKitchens(uid, setKitchens, (e) => { setError(e); setKitchens([]); });
  }, [uid]);

  const wanted = profile && profile.activeKitchenId;
  const active = useMemo(() => {
    if (!kitchens || !kitchens.length) return null;
    return kitchens.find((k) => k.id === wanted) || kitchens[0];
  }, [kitchens, wanted]);

  const switchTo = useCallback((kitchenId) => (uid ? setActiveKitchen(uid, kitchenId) : Promise.resolve()), [uid]);

  const value = {
    kitchens: kitchens || [],
    loading: kitchens === undefined,
    error,
    active,
    switchTo,
    isOwner: !!(active && uid && active.ownerId === uid),
    canInvite: !!(active && uid && active.type === 'shared' && (active.invitePolicy !== 'owner' || active.ownerId === uid))
  };
  return <KitchenContext.Provider value={value}>{children}</KitchenContext.Provider>;
}

export function useKitchens() {
  return useContext(KitchenContext);
}

// Invite links work before sign-in and through onboarding: the code waits here.
const PENDING = 'fw-pending-invite';
export const pendingInvite = {
  get() { try { return sessionStorage.getItem(PENDING); } catch { return null; } },
  set(code) { try { sessionStorage.setItem(PENDING, code); } catch { /* private mode */ } },
  clear() { try { sessionStorage.removeItem(PENDING); } catch { /* private mode */ } }
};
