import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { auth } from '../firebase';
import { profileRef, createProfile, signupState } from '../lib/profile';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking
  const [profile, setProfile] = useState(undefined);
  const [version, setVersion] = useState(0); // bump after provider changes

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  useEffect(() => {
    if (!user) {
      setProfile(user === null ? null : undefined);
      return undefined;
    }
    setProfile(undefined);
    return onSnapshot(profileRef(user.uid), (snap) => {
      if (snap.exists()) {
        setProfile({ id: snap.id, ...snap.data() });
      } else if (snap.metadata.fromCache) {
        setProfile(null); // offline and not cached yet: unknown
      } else {
        setProfile({ missing: true });
        // Account exists but its profile never got saved (e.g. the
        // connection dropped mid sign-up). Repair it, unless sign-up is
        // still busy writing it.
        if (!signupState.inProgress) createProfile(user, user.displayName).catch(() => {});
      }
    }, () => setProfile(null));
  }, [user]);

  const value = {
    user,
    profile,
    loading: user === undefined || (user && profile === undefined),
    refreshUser: async () => {
      if (auth.currentUser) await auth.currentUser.reload();
      setUser(auth.currentUser);
      setVersion((v) => v + 1);
    },
    version
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
