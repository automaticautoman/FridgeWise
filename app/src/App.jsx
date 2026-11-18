import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { OfflineBar } from './components/ui';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import { ForgotPassword, EnterCode } from './pages/ForgotPassword';
import { NewPassword, ResetDone } from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';
import Onboarding from './pages/Onboarding';
import { Home, Soon, Settings, Preferences } from './pages/AppPages';
import { CreateKitchen, JoinKitchen, JoinLink, Members, Activity } from './pages/KitchenPages';
import { InventoryHome, AddItem, QuickAdd } from './pages/InventoryPages';
import { NewItem, EditItem, ItemDetail, RecentlyRemoved } from './pages/ItemPages';
import { KitchenSettings } from './pages/KitchenSettings';

function Splash() {
  return <div className="splash" role="status" aria-label="Loading"><span className="spinner" /></div>;
}

function needsOnboarding(profile) {
  return !!profile && (!!profile.missing || !(profile.onboarding && profile.onboarding.completed));
}

// Signed-out only (sign in, sign up). Signed-in people go to the app.
function PublicOnly({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <Splash />;
  if (user) return <Navigate to={needsOnboarding(profile) ? '/onboarding' : '/home'} replace />;
  return children;
}

// Signed-in only. New accounts finish onboarding first (F05).
function Private({ children, onboarding = false }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  if (!onboarding && needsOnboarding(profile)) return <Navigate to="/onboarding" replace />;
  if (onboarding && !needsOnboarding(profile)) return <Navigate to="/home" replace />;
  return children;
}

// New screens start at the top instead of where the last one was scrolled to.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/signin" element={<PublicOnly><SignIn /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><SignUp /></PublicOnly>} />
        {/* Reset flow works whether or not someone is signed in. */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset/code" element={<EnterCode />} />
        <Route path="/reset/new" element={<NewPassword />} />
        {/* Old reset-link URLs from before codes. */}
        <Route path="/check-email" element={<Navigate to="/forgot-password" replace />} />
        <Route path="/auth/action" element={<Navigate to="/forgot-password" replace />} />
        <Route path="/reset-done" element={<ResetDone />} />

        <Route path="/onboarding" element={<Private onboarding><Onboarding /></Private>} />
        <Route path="/home" element={<Private><Home /></Private>} />
        <Route path="/settings" element={<Private><Settings /></Private>} />
        <Route path="/settings/password" element={<Private><ChangePassword /></Private>} />
        <Route path="/settings/preferences" element={<Private><Preferences /></Private>} />
        <Route path="/soon/:section" element={<Private><Soon /></Private>} />

        {/* Epic 2: kitchens */}
        <Route path="/kitchen" element={<Private><InventoryHome /></Private>} />
        {/* Epic 3: inventory */}
        <Route path="/kitchen/add" element={<Private><AddItem /></Private>} />
        <Route path="/kitchen/add/quick" element={<Private><QuickAdd /></Private>} />
        <Route path="/kitchen/item/new" element={<Private><NewItem /></Private>} />
        <Route path="/kitchen/item/:id/edit" element={<Private><EditItem /></Private>} />
        <Route path="/kitchen/items/:key" element={<Private><ItemDetail /></Private>} />
        <Route path="/kitchen/removed" element={<Private><RecentlyRemoved /></Private>} />
        <Route path="/kitchen/new" element={<Private><CreateKitchen /></Private>} />
        <Route path="/kitchen/join" element={<Private><JoinKitchen /></Private>} />
        <Route path="/kitchen/members" element={<Private><Members /></Private>} />
        <Route path="/kitchen/activity" element={<Private><Activity /></Private>} />
        <Route path="/kitchen/settings" element={<Private><KitchenSettings /></Private>} />
        {/* Invite links: work signed out too, the code waits for sign-in. */}
        <Route path="/join/:code" element={<JoinLink />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      <OfflineBar />
    </>
  );
}
