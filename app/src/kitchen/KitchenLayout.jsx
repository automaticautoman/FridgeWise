// App layout for kitchen screens: switcher + sync status + Invite + tabs
// (KitchenBar mockup), the invite dialog, and a toast when a housemate
// changes something (F12).
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/Layouts';
import { useOnline } from '../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { watchActivity } from '../lib/kitchens';
import { useKitchens } from './KitchenProvider';
import InviteDialog from './InviteDialog';
import { describe } from './activityText';
import { KitchenTile, ChevronDown, CheckGlyph, PlusGlyph, DoorGlyph, LockGlyph, UserPlusGlyph, RefreshGlyph, kitchenMeta, toDate } from './kitchenUi';

const InviteContext = createContext({ open: () => {}, inviting: false });
export const useOpenInvite = () => useContext(InviteContext).open;
export const useInviting = () => useContext(InviteContext).inviting;

function Switcher() {
  const { user } = useAuth();
  const { kitchens, active, switchTo } = useKitchens();
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const pick = async (id) => { setOpen(false); if (id !== active.id) await switchTo(id); navigate('/kitchen'); };

  return (
    <div ref={wrap} style={{ position: 'relative', minWidth: 0 }}>
      <button type="button" className="kswitch" aria-haspopup="listbox" aria-expanded={open} aria-label={`Switch kitchen. Current: ${active.name}`} onClick={() => setOpen((o) => !o)}>
        <KitchenTile kitchen={active} />
        <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="kname">{active.name}</span>
          <span className="kmeta">{kitchenMeta(active)}</span>
        </span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', display: 'flex' }}><ChevronDown /></span>
      </button>
      {open && (
        <div className="kmenu">
          <span className="kmenu-h" id="kmenu-h">Your kitchens</span>
          <div role="listbox" aria-labelledby="kmenu-h" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {kitchens.map((k) => (
              <button key={k.id} type="button" role="option" aria-selected={k.id === active.id} className="kopt" onClick={() => pick(k.id)}>
                <KitchenTile kitchen={k} size="sm" />
                <span style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 16 }}>{k.name}</span>
                  <span className="kmeta">{kitchenMeta(k, user.uid)}</span>
                </span>
                {k.id === active.id && <CheckGlyph />}
              </button>
            ))}
          </div>
          <div className="kmenu-sep" />
          <Link to="/kitchen/new" className="kopt action" onClick={() => setOpen(false)}><span className="dash"><PlusGlyph /></span>Create a kitchen</Link>
          <Link to="/kitchen/join" className="kopt action" onClick={() => setOpen(false)}><span className="dash"><DoorGlyph /></span>Join with a code</Link>
          <p style={{ margin: '6px 10px 4px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
            <LockGlyph /> You only see kitchens you're a member of.
          </p>
        </div>
      )}
    </div>
  );
}

// Shows "Ali added Eggs" when someone else changes the kitchen while you watch.
function useHousemateToast(kitchenId, uid) {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!kitchenId) return undefined;
    let first = true;
    let timer;
    const stop = watchActivity(kitchenId, (list) => {
      const e = list[0];
      if (first) { first = false; return; }
      if (!e || e.actorId === uid) return;
      const at = toDate(e.at);
      if (at && Date.now() - at.getTime() > 60000) return;
      setToast(e);
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 6000);
    }, () => {}, 1);
    return () => { stop(); clearTimeout(timer); };
  }, [kitchenId, uid]);
  return toast;
}

export function KitchenLayout({ tab, children }) {
  const { user } = useAuth();
  const { active, canInvite, isOwner } = useKitchens();
  const online = useOnline();
  const [inviting, setInviting] = useState(false);
  const toast = useHousemateToast(active && active.id, user.uid);
  const t = toast && describe(toast, user.uid);

  return (
    <AppLayout>
      <InviteContext.Provider value={{ open: () => setInviting(true), inviting }}>
        <div className="kbar">
          <div className="kbar-row">
            <Switcher />
            <div style={{ flexGrow: 1 }} />
            <span role="status" className={'sync ' + (online ? 'ok' : 'off')}><i aria-hidden="true" />{online ? 'All changes synced' : 'Offline · saved on this device'}</span>
            {canInvite && (
              <button type="button" className="btn btn-secondary btn-sm" style={{ height: 48 }} onClick={() => setInviting(true)}><UserPlusGlyph size={18} /> Invite</button>
            )}
            <Link to="/kitchen/add" className="btn btn-primary btn-sm kbar-add" style={{ height: 48 }}><PlusGlyph size={18} /> Add item</Link>
          </div>
          <nav aria-label="Kitchen sections" className="tabs">
            <Link to="/kitchen" aria-current={tab === 'items' ? 'page' : undefined}>Items</Link>
            <Link to="/kitchen/members" aria-current={tab === 'members' ? 'page' : undefined}>Members</Link>
            <Link to="/kitchen/activity" aria-current={tab === 'activity' ? 'page' : undefined}>Activity</Link>
            <Link to="/kitchen/settings" aria-current={tab === 'settings' ? 'page' : undefined}>Settings</Link>
          </nav>
        </div>
        {children}
        {inviting && active && <InviteDialog kitchen={active} isOwner={isOwner} onClose={() => setInviting(false)} />}
        {t && (
          <div role="status" className="toast">
            <span aria-hidden="true" className="ktile" style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--mint)', color: 'var(--cocoa)' }}><RefreshGlyph size={18} /></span>
            <span>{t.who} {t.verb}{t.item ? <> <strong>{t.item}</strong></> : null}{t.where && t.kind === 'added' ? ` to the ${t.where}` : ''}</span>
          </div>
        )}
      </InviteContext.Provider>
    </AppLayout>
  );
}
