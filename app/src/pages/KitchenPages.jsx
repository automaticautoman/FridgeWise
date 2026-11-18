// Epic 2 screens (F06–F13), built from the epic2-kitchens-sharing mockups.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/Layouts';
import { ErrorAlert } from '../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { friendlyError } from '../auth/errors';
import {
  createKitchen, joinKitchen, previewInvite, leaveKitchen, removeMember, transferOwnership,
  peekInvite, watchMembers, watchActivity, normalizeCode, DEFAULT_LOCATIONS
} from '../lib/kitchens';
import { useKitchens, pendingInvite } from '../kitchen/KitchenProvider';
import { KitchenLayout, useOpenInvite, useInviting } from '../kitchen/KitchenLayout';
import { describe, KIND_STYLE } from '../kitchen/activityText';
import {
  Dialog, Avatar, KitchenTile, plural, toDate, dayLabel, shortDate, timeAgo, expiresIn,
  BackGlyph, PlusGlyph, DoorGlyph, CheckGlyph, LeaveGlyph, CrownGlyph, InfoGlyph, AlertGlyph,
  FridgeGlyph, HomeGlyph
} from '../kitchen/kitchenUi';

function Loading() {
  return <AppLayout><div role="status" aria-label="Loading" style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div></AppLayout>;
}

// Screens inside a kitchen. With no kitchen yet, show the way in.
export function WithKitchen({ children }) {
  const { loading, active } = useKitchens();
  if (loading) return <Loading />;
  if (!active) return <NoKitchen />;
  return children;
}

function NoKitchen() {
  return (
    <AppLayout>
      <h1 className="title">My Kitchen</h1>
      <p className="lead">FridgeWise works around a kitchen. Start one, or join your housemates.</p>
      <div className="option-grid" style={{ marginTop: 32, maxWidth: 760 }}>
        <Link to="/kitchen/new?type=shared" className="option" style={{ textDecoration: 'none' }}>
          <span aria-hidden="true" className="ktile" style={{ background: 'var(--sky)' }}><FridgeGlyph /></span>
          <strong>Start a shared kitchen</strong><span>A dorm or flat. Invite housemates with a link or code.</span>
        </Link>
        <Link to="/kitchen/new?type=private" className="option" style={{ textDecoration: 'none' }}>
          <span aria-hidden="true" className="ktile" style={{ background: 'var(--butter)' }}><HomeGlyph /></span>
          <strong>Start my home kitchen</strong><span>Just for you.</span>
        </Link>
        <Link to="/kitchen/join" className="option" style={{ textDecoration: 'none' }}>
          <span aria-hidden="true" className="ktile" style={{ background: 'var(--mint)' }}><DoorGlyph /></span>
          <strong>Join a kitchen</strong><span>Someone sent you a link or a 6-character code.</span>
        </Link>
      </div>
    </AppLayout>
  );
}

// ---------- F06 Create kitchen (CreateKitchen mockup) ----------

export function CreateKitchen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { kitchens } = useKitchens();
  const [kind, setKind] = useState(params.get('type') === 'private' ? 'private' : 'shared');
  const [name, setName] = useState('');
  const [spots, setSpots] = useState(DEFAULT_LOCATIONS.map((s) => ({ name: s, on: true })));
  const [adding, setAdding] = useState(false);
  const [newSpot, setNewSpot] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const addSpot = () => {
    const s = newSpot.replace(/\s+/g, ' ').trim().slice(0, 24);
    if (s && !spots.some((x) => x.name.toLowerCase() === s.toLowerCase())) setSpots([...spots, { name: s, on: true }]);
    setNewSpot(''); setAdding(false);
  };
  const chosen = spots.filter((s) => s.on).map((s) => s.name);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Give the kitchen a name.'); return; }
    if (!chosen.length) { setError('Pick at least one storage spot.'); return; }
    setBusy(true); setError(null);
    try {
      await createKitchen({ name, type: kind, locations: chosen });
      navigate(kind === 'shared' ? '/kitchen/members?invite=1' : '/kitchen', { replace: true });
    } catch (err) { setError(friendlyError(err)); setBusy(false); }
  };

  return (
    <AppLayout>
      <div style={{ width: '100%', maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <Link to={kitchens.length ? '/kitchen' : '/home'} className="back"><BackGlyph /> {kitchens.length ? 'My Kitchen' : 'Home'}</Link>
        <form className="card" style={{ marginTop: 12, padding: 36, borderRadius: 28, display: 'flex', flexDirection: 'column', gap: 28 }} onSubmit={submit} noValidate>
          <div>
            <h1 className="title" style={{ fontSize: 38 }}>New kitchen</h1>
            <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>Three quick things and you're in.</p>
          </div>
          {error && <ErrorAlert id="create-error">{error}</ErrorAlert>}
          <fieldset style={{ margin: 0, padding: 0, border: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <legend className="label" style={{ padding: 0, marginBottom: 10 }}>Who's it for?</legend>
            <div role="radiogroup" aria-label="Who's it for?" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <button type="button" role="radio" aria-checked={kind === 'shared'} className="kind" onClick={() => setKind('shared')}>
                <span aria-hidden="true" className="ktile sm" style={{ background: 'var(--sky)' }}><FridgeGlyph /></span>Housemates
              </button>
              <button type="button" role="radio" aria-checked={kind === 'private'} className="kind" onClick={() => setKind('private')}>
                <span aria-hidden="true" className="ktile sm" style={{ background: 'var(--butter)' }}><HomeGlyph /></span>My home
              </button>
            </div>
            <span className="small">{kind === 'shared' ? 'A dorm or flat. You can invite people right after.' : 'Your own kitchen. Only you can see it.'}</span>
          </fieldset>
          <div className="field">
            <label htmlFor="kname" className="label">Name it</label>
            <input id="kname" className="input" type="text" maxLength={40} value={name} placeholder={kind === 'shared' ? 'e.g. Room 4B kitchen' : 'e.g. Home kitchen'}
              onChange={(e) => setName(e.target.value)} aria-invalid={error && !name.trim() ? 'true' : undefined} aria-describedby={error ? 'create-error' : undefined} />
          </div>
          <fieldset style={{ margin: 0, padding: 0, border: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <legend className="label" style={{ padding: 0, marginBottom: 10 }}>Storage spots</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {spots.map((s, i) => (
                <button key={s.name} type="button" className="spot" aria-pressed={s.on}
                  onClick={() => setSpots(spots.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}>
                  {s.on ? <CheckGlyph size={16} /> : <PlusGlyph size={16} />}{s.name}
                </button>
              ))}
              {adding ? (
                <span style={{ display: 'flex', gap: 6 }}>
                  <input className="input" aria-label="New storage spot" autoFocus maxLength={24} value={newSpot} style={{ height: 44, width: 160, borderRadius: 999 }}
                    onChange={(e) => setNewSpot(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpot(); } if (e.key === 'Escape') setAdding(false); }} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addSpot}>Add</button>
                </span>
              ) : (
                spots.length < 8 && <button type="button" className="spot add" aria-label="Add a storage spot" onClick={() => setAdding(true)}><PlusGlyph size={16} /> Add</button>
              )}
            </div>
          </fieldset>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? <span className="spinner" /> : 'Create kitchen'}</button>
            <span className="small center">You'll be the owner. You can change all of this later.</span>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

// ---------- F09 Join (JoinKitchen / JoinError mockups) ----------

// /join/:code from an invite link. Works signed out: the code waits for sign-in.
export function JoinLink() {
  const { code } = useParams();
  const { user, loading } = useAuth();
  if (loading) return null;
  pendingInvite.set(normalizeCode(code));
  return <Navigate to={user ? '/kitchen/join' : '/signin'} replace state={user ? undefined : { joining: true }} />;
}

export function JoinKitchen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { switchTo } = useKitchens();
  const [chars, setChars] = useState(() => {
    const start = normalizeCode((location.state && location.state.code) || pendingInvite.get() || '');
    return Array.from({ length: 6 }, (_, i) => start[i] || '');
  });
  const [state, setState] = useState({ kind: 'idle' }); // idle | checking | found | bad | joining
  const boxes = useRef([]);
  const code = chars.join('');

  useEffect(() => { pendingInvite.clear(); }, []);

  useEffect(() => {
    if (code.length !== 6) { setState((s) => (s.kind === 'found' || s.kind === 'bad' ? { kind: 'idle' } : s)); return undefined; }
    let live = true;
    setState({ kind: 'checking' });
    previewInvite(code).then(
      (k) => { if (live) setState({ kind: 'found', kitchen: k }); },
      (e) => { if (live) setState({ kind: 'bad', code: e.code, message: friendlyError(e) }); }
    );
    return () => { live = false; };
  }, [code]);

  const setAt = (i, v) => {
    const clean = normalizeCode(v);
    if (clean.length > 1) { // pasted a whole code
      const next = Array.from({ length: 6 }, (_, j) => clean[j] || '');
      setChars(next);
      boxes.current[Math.min(clean.length, 5)].focus();
      return;
    }
    const next = [...chars]; next[i] = clean; setChars(next);
    if (clean && i < 5) boxes.current[i + 1].focus();
  };
  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !chars[i] && i > 0) { boxes.current[i - 1].focus(); const n = [...chars]; n[i - 1] = ''; setChars(n); e.preventDefault(); }
    if (e.key === 'ArrowLeft' && i > 0) boxes.current[i - 1].focus();
    if (e.key === 'ArrowRight' && i < 5) boxes.current[i + 1].focus();
  };
  const clear = () => { setChars(['', '', '', '', '', '']); setState({ kind: 'idle' }); boxes.current[0].focus(); };

  const join = async () => {
    const k = state.kitchen;
    if (k.alreadyMember) { await switchTo(k.kitchenId); navigate('/kitchen'); return; }
    setState({ kind: 'joining', kitchen: k });
    try { await joinKitchen(code); navigate('/kitchen', { replace: true }); }
    catch (e) { setState({ kind: 'bad', code: e.code, message: friendlyError(e) }); }
  };

  const bad = state.kind === 'bad';
  const k = state.kitchen;
  return (
    <AppLayout>
      <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: '100%', maxWidth: 560, padding: 40, borderRadius: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span aria-hidden="true" className="ktile xl" style={{ background: 'var(--mint)' }}><DoorGlyph size={28} /></span>
            <h1 className="title" style={{ fontSize: 40, marginTop: 12 }}>Join a kitchen</h1>
            <p className="lead" style={{ margin: 0, fontSize: 16 }}>Got an invite link? Just open it. Or type the 6-character code a housemate sent you.</p>
          </div>
          <fieldset style={{ margin: 0, padding: 0, border: 'none' }} aria-describedby={bad ? 'code-err' : undefined}>
            <legend className="label" style={{ padding: 0, marginBottom: 10 }}>Invite code</legend>
            <div className="code-grid">
              {chars.map((c, i) => (
                <input key={i} ref={(el) => { boxes.current[i] = el; }} className="code-cell" aria-label={`Character ${i + 1}`} value={c}
                  inputMode="text" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={i === 0 ? 8 : 6}
                  aria-invalid={bad ? 'true' : undefined} autoFocus={i === chars.findIndex((x) => !x)}
                  onChange={(e) => setAt(i, e.target.value)} onKeyDown={(e) => onKey(i, e)} onFocus={(e) => e.target.select()} />
              ))}
            </div>
          </fieldset>

          {state.kind === 'checking' && <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, color: 'var(--muted)' }}><span className="spinner" /> Checking the code…</div>}

          {(state.kind === 'found' || state.kind === 'joining') && (
            <div role="status" className="found">
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#1F5E37' }}>
                <CheckGlyph size={18} /> {k.alreadyMember ? "You're already in this kitchen." : 'Found it! Is this the right kitchen?'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <KitchenTile kitchen={k} size="lg" />
                <span style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>{k.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#3F5A47' }}>Shared · {plural(k.memberCount, 'member')}{k.ownerName ? ` · Owner: ${k.ownerName}` : ''}</span>
                </span>
                <span aria-hidden="true" style={{ display: 'flex' }}>
                  {(k.memberNames || []).slice(0, 3).map((n, i) => <span key={i} style={{ marginLeft: i ? -8 : 0 }}><Avatar id={n} name={n} size="xs" /></span>)}
                </span>
              </div>
            </div>
          )}

          {bad && (
            <div id="code-err" role="alert" className="bad">
              <span aria-hidden="true" className="ktile sm" style={{ background: 'var(--coral-tint)', color: 'var(--error)' }}><AlertGlyph /></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#8E2C26' }}>{state.code === 'kitchen/too-many-tries' ? 'Too many wrong codes' : "That code isn't working"}</span>
                <span style={{ fontSize: 14, lineHeight: 1.5, color: '#5C4744' }}>
                  {state.code === 'kitchen/bad-code' ? 'It may have expired or been typed wrong. Check it, or ask whoever invited you for a new one.' : state.message}
                </span>
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button type="button" className="btn btn-primary btn-block" disabled={!(state.kind === 'found')} onClick={join}>
              {state.kind === 'joining' ? <span className="spinner" /> : k && state.kind === 'found' ? (k.alreadyMember ? `Open ${k.name}` : `Join ${k.name}`) : 'Join kitchen'}
            </button>
            {(state.kind === 'found' || bad) && (
              <button type="button" className="link-btn" style={{ alignSelf: 'center', padding: 8, fontSize: 15 }} onClick={clear}>
                {bad ? 'Clear and try again' : 'Not the right kitchen? Change the code'}
              </button>
            )}
          </div>
          <p className="note"><InfoGlyph />{bad ? 'After 5 wrong tries in a row, you\'ll need to wait 10 minutes before trying again.' : "Codes stop working after 7 days. If yours doesn't work, ask whoever invited you for a new one."}</p>
        </div>
      </div>
    </AppLayout>
  );
}

// ---------- F10 / F11 Members (Members, TransferOwnership mockups) ----------

// The kitchen layout wraps the body so the body can open the layout's invite dialog.
export function Members() {
  return <WithKitchen><KitchenLayout tab="members"><MembersInner /></KitchenLayout></WithKitchen>;
}

function MembersInner() {
  const { user } = useAuth();
  const { active, isOwner, canInvite } = useKitchens();
  const openInvite = useOpenInvite();
  const inviting = useInviting();
  const [params, setParams] = useSearchParams();
  const [members, setMembers] = useState(null);
  const [invite, setInvite] = useState(null);
  const [dialog, setDialog] = useState(null); // { type: 'remove'|'leave'|'transfer', member? }

  useEffect(() => watchMembers(active.id, setMembers, () => setMembers([])), [active.id]);
  // Re-check the current code when the invite dialog closes. Keep showing the
  // last answer meanwhile, so it doesn't flicker to "None yet".
  useEffect(() => {
    if (!canInvite || inviting) return undefined;
    let live = true;
    peekInvite(active.id).then((r) => { if (live) setInvite(r); }, () => {});
    return () => { live = false; };
  }, [active.id, canInvite, inviting]);
  useEffect(() => {
    if (params.get('invite') === '1' && canInvite) { openInvite(); setParams({}, { replace: true }); }
  }, [params, canInvite]); // eslint-disable-line react-hooks/exhaustive-deps

  const others = (members || []).filter((m) => m.id !== user.uid);
  const createdAt = toDate(active.createdAt);
  const shared = active.type === 'shared';

  let leaveText = 'Your personal items are removed. Shared items stay in the kitchen.';
  if (isOwner && others.length) leaveText = "You're the owner, so you'll pick someone to take over first. Your shared items stay in the kitchen.";
  else if (!others.length) leaveText = "You're the only one here, so leaving deletes the kitchen and everything in it.";

  return (
    <>
      <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <section aria-labelledby="mem-h" className="card" style={{ flex: '1 1 460px', minWidth: 0, padding: 28, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <h1 id="mem-h" className="h2" style={{ fontSize: 32 }}>Members</h1>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)' }}>{plural(active.memberCount || 1, 'person', 'people')}</span>
          </div>
          {!members && <div role="status" aria-label="Loading members" style={{ padding: 24, display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>}
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(members || []).map((m) => {
              const joined = toDate(m.joinedAt);
              const me = m.id === user.uid;
              const founder = m.role === 'owner' && joined && createdAt && Math.abs(joined - createdAt) < 10000;
              const isNew = joined && Date.now() - joined.getTime() < 864e5 && !founder;
              return (
                <li key={m.id} className={'mrow' + (me ? ' is-me' : '')}>
                  <Avatar id={m.id} name={m.name} />
                  <span style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>{m.name}{me && <span style={{ fontWeight: 700, color: 'var(--muted)' }}> (you)</span>}</span>
                    {m.email && <span title={m.email} style={{ fontSize: 13, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</span>}
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{founder ? `Created the kitchen · ${shortDate(joined)}` : `Joined ${shortDate(joined)}`}</span>
                  </span>
                  {m.role === 'owner' && <span className="badge" style={{ height: 32, background: 'var(--butter)', fontSize: 13 }}><CrownGlyph /> Owner</span>}
                  {isNew && <span className="badge" style={{ background: 'var(--mint-tint)', color: '#1F5E37' }}>New</span>}
                  {isOwner && !me && <button type="button" className="ghost-btn" aria-label={`Remove ${m.name}`} onClick={() => setDialog({ type: 'remove', member: m })}>Remove</button>}
                </li>
              );
            })}
          </ul>
          {canInvite && (
            <button type="button" className="dashed-row" style={{ marginTop: 8 }} onClick={openInvite}>
              <span aria-hidden="true" className="ktile sm" style={{ borderRadius: '50%', background: 'var(--coral-tint)' }}><PlusGlyph /></span>Invite someone
            </button>
          )}
          {!shared && <p className="note" style={{ marginTop: 8 }}><InfoGlyph />This is a private kitchen, so it's just you.</p>}
        </section>

        <aside style={{ flex: '1 1 300px', minWidth: 0, maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {shared && (
            <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 className="h2" style={{ fontSize: 22 }}>Invites</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="small">Who can invite</span>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{active.invitePolicy === 'owner' ? (isOwner ? 'Only me' : 'Only the owner') : 'Any member'}</span>
              </div>
              {canInvite && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="small">Current code</span>
                  {invite && invite.code ? (
                    <>
                      <span style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800, letterSpacing: 3 }}>{invite.code}</span>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{expiresIn(invite.expiresAt)}</span>
                    </>
                  ) : <span style={{ fontSize: 15, fontWeight: 700 }}>{invite ? 'None yet' : '…'}</span>}
                </div>
              )}
              {canInvite && <button type="button" className="link-btn" style={{ alignSelf: 'flex-start', fontSize: 15 }} onClick={openInvite}>{invite && invite.code ? 'Manage invites' : 'Make an invite code'}</button>}
            </div>
          )}
          <div className="danger-card">
            <h2 className="h2" style={{ fontSize: 22 }}>Leave this kitchen</h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: '#5C4744' }}>{leaveText}</p>
            <button type="button" className="btn btn-danger btn-sm" style={{ alignSelf: 'flex-start', height: 48 }} disabled={!members}
              onClick={() => setDialog({ type: isOwner && others.length ? 'transfer' : 'leave' })}>
              <LeaveGlyph size={18} /> Leave kitchen
            </button>
          </div>
        </aside>
      </div>

      {dialog && dialog.type === 'remove' && <RemoveDialog kitchen={active} member={dialog.member} onClose={() => setDialog(null)} />}
      {dialog && dialog.type === 'leave' && <LeaveDialog kitchen={active} alone={!others.length} onClose={() => setDialog(null)} />}
      {dialog && dialog.type === 'transfer' && <TransferDialog kitchen={active} members={others} onClose={() => setDialog(null)} />}
    </>
  );
}

function useAction(fn, after) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async () => {
    setBusy(true); setError(null);
    try { await fn(); after(); } catch (e) { setError(friendlyError(e)); setBusy(false); }
  };
  return { busy, error, run };
}

function RemoveDialog({ kitchen, member, onClose }) {
  const first = member.name.split(' ')[0];
  const { busy, error, run } = useAction(() => removeMember(kitchen.id, member.id), onClose);
  return (
    <Dialog labelledBy="rm-h" describedBy="rm-d" onClose={busy ? undefined : onClose} width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Avatar id={member.id} name={member.name} />
        <h2 id="rm-h">Remove {first}?</h2>
        <p id="rm-d" className="lead" style={{ margin: 0, fontSize: 16 }}>{first} won't see {kitchen.name} any more. Their personal items are removed; items they marked shared stay. They can come back only with a new invite.</p>
      </div>
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary btn-sm" style={{ height: 52 }} onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="btn btn-primary btn-sm" style={{ height: 52 }} onClick={run} disabled={busy}>{busy ? <span className="spinner" /> : `Remove ${first}`}</button>
      </div>
    </Dialog>
  );
}

function LeaveDialog({ kitchen, alone, onClose }) {
  const navigate = useNavigate();
  const { busy, error, run } = useAction(() => leaveKitchen(kitchen.id), () => navigate('/kitchen', { replace: true }));
  return (
    <Dialog labelledBy="lv-h" describedBy="lv-d" onClose={busy ? undefined : onClose} width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span aria-hidden="true" className="ktile" style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--coral-tint)' }}><LeaveGlyph size={26} /></span>
        <h2 id="lv-h">{alone ? `Delete ${kitchen.name}?` : `Leave ${kitchen.name}?`}</h2>
        <p id="lv-d" className="lead" style={{ margin: 0, fontSize: 16 }}>
          {alone
            ? "You're the only one here, so the kitchen and everything in it will be deleted. This can't be undone."
            : 'Your personal items in this kitchen are removed. Items you marked shared stay for everyone else. You can come back only with a new invite.'}
        </p>
      </div>
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary btn-sm" style={{ height: 52 }} onClick={onClose} disabled={busy}>Stay</button>
        <button type="button" className="btn btn-danger btn-sm" style={{ height: 52 }} onClick={run} disabled={busy}>{busy ? <span className="spinner" /> : alone ? 'Delete kitchen' : 'Leave kitchen'}</button>
      </div>
    </Dialog>
  );
}

function TransferDialog({ kitchen, members, onClose }) {
  const navigate = useNavigate();
  const [pick, setPick] = useState(members[0] ? members[0].id : null);
  const chosen = members.find((m) => m.id === pick);
  const first = chosen ? chosen.name.split(' ')[0] : '';
  const { busy, error, run } = useAction(() => transferOwnership(kitchen.id, pick, { andLeave: true }), () => navigate('/kitchen', { replace: true }));
  return (
    <Dialog labelledBy="tr-h" describedBy="tr-d" onClose={busy ? undefined : onClose} width={540}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span aria-hidden="true" className="ktile" style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--butter)' }}><CrownGlyph size={26} /></span>
        <h2 id="tr-h">Pick a new owner first</h2>
        <p id="tr-d" className="lead" style={{ margin: 0, fontSize: 16 }}>You own {kitchen.name} and {plural(members.length, 'person', 'people')} still {members.length === 1 ? 'uses' : 'use'} it. Choose who takes over before you leave.</p>
      </div>
      <div role="radiogroup" aria-label="New owner" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {members.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={pick === m.id} className="choice" onClick={() => setPick(m.id)}>
            <Avatar id={m.id} name={m.name} size="sm" />
            <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 16, fontWeight: 800 }}>{m.name}</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Member since {shortDate(toDate(m.joinedAt))}</span>
            </span>
            <span className="radio-dot" aria-hidden="true">{pick === m.id && <CheckGlyph size={14} style={{ color: '#fff' }} />}</span>
          </button>
        ))}
      </div>
      <p className="note" style={{ color: '#5C5552' }}><InfoGlyph />{first} will be able to invite and remove people. Everyone will see the change in the kitchen's activity.</p>
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary btn-sm" style={{ height: 52 }} onClick={onClose} disabled={busy}>Stay</button>
        <button type="button" className="btn btn-primary btn-sm" style={{ height: 52 }} onClick={run} disabled={busy || !pick}>{busy ? <span className="spinner" /> : `Make ${first} owner and leave`}</button>
      </div>
    </Dialog>
  );
}

// ---------- F13 Activity (Activity mockup) ----------

const FILTERS = [['all', 'All'], ['added', 'Added'], ['edited', 'Edited'], ['used', 'Used up'], ['removed', 'Removed'], ['people', 'People']];

export function Activity() {
  return <WithKitchen><ActivityInner /></WithKitchen>;
}

function ActivityInner() {
  const { user } = useAuth();
  const { active } = useKitchens();
  const [entries, setEntries] = useState(null);
  const [filter, setFilter] = useState('all');
  useEffect(() => watchActivity(active.id, setEntries, () => setEntries([]), 100), [active.id]);

  const groups = useMemo(() => {
    const out = [];
    (entries || []).forEach((e) => {
      const d = describe(e, user.uid);
      if (filter !== 'all' && d.kind !== filter) return;
      const at = toDate(e.at);
      const day = dayLabel(at);
      let g = out.find((x) => x.day === day);
      if (!g) { g = { day, items: [] }; out.push(g); }
      g.items.push({ ...e, d, at });
    });
    return out;
  }, [entries, filter, user.uid]);

  return (
    <KitchenLayout tab="activity">
      <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <h1 className="h2" style={{ fontSize: 36 }}>What's been happening</h1>
        <div role="group" aria-label="Filter activity" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {FILTERS.map(([id, label]) => <button key={id} type="button" className="filter-btn" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
        </div>
      </div>
      <section aria-label="Activity" className="card" style={{ marginTop: 20, padding: '12px 24px 20px', display: 'flex', flexDirection: 'column' }}>
        {!entries && <div role="status" aria-label="Loading activity" style={{ padding: 24, display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>}
        {groups.map((g) => (
          <div key={g.day}>
            <h2 className="feed-day">{g.day}</h2>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {g.items.map((e) => {
                const s = KIND_STYLE[e.d.kind];
                return (
                  <li key={e.id} className="feed-row">
                    <Avatar id={e.actorId} name={e.actorName} size="sm" />
                    <span style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 15, lineHeight: 1.4 }}><strong>{e.d.who}</strong> {e.d.verb}{e.d.item ? <> <strong>{e.d.item}</strong></> : null}</span>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{e.d.where ? `${e.d.where} · ` : ''}{g.day === 'Today' ? timeAgo(e.at) : (e.at ? e.at.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }).toLowerCase() : '')}</span>
                    </span>
                    <span className="badge" style={{ background: s.bg, color: s.fg }}>{s.badge}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {entries && !groups.length && <p style={{ margin: '24px 0 8px', textAlign: 'center', fontSize: 15, color: 'var(--muted)' }}>Nothing like that yet.</p>}
      </section>
    </KitchenLayout>
  );
}

