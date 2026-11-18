// F08: Invite housemates (Invite mockup).
import { useEffect, useState } from 'react';
import { getInvite, inviteLink, updateKitchen, inviteByEmail } from '../lib/kitchens';
import { friendlyError } from '../auth/errors';
import { ErrorAlert } from '../components/ui';
import { Dialog, CloseGlyph, LinkGlyph, CopyGlyph, ClockGlyph, RefreshGlyph, UserPlusGlyph, CheckGlyph, expiresIn } from './kitchenUi';

export default function InviteDialog({ kitchen, isOwner, onClose }) {
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [policy, setPolicy] = useState(kitchen.invitePolicy || 'anyone');
  const [, tick] = useState(0);

  const load = async (renew = false) => {
    setBusy(true); setError(null);
    try { setInvite(await getInvite(kitchen.id, { renew })); setCopied(false); }
    catch (e) { setError(friendlyError(e)); }
    setBusy(false);
  };
  useEffect(() => { load(false); }, [kitchen.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { setPolicy(kitchen.invitePolicy || 'anyone'); }, [kitchen.invitePolicy]);

  const link = invite ? inviteLink(invite.code) : '';
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); }
    catch { const el = document.getElementById('inv-link'); el.select(); setCopied(false); }
  };
  const share = async () => {
    try { await navigator.share({ title: `Join ${kitchen.name} on FridgeWise`, text: `Join ${kitchen.name} on FridgeWise. Code: ${invite.code}`, url: link }); } catch { /* closed */ }
  };
  const setWho = async (p) => {
    const before = policy;
    setPolicy(p); setError(null);
    try { await updateKitchen(kitchen.id, { invitePolicy: p }); }
    catch (e) { setPolicy(before); setError(friendlyError(e)); }
  };

  return (
    <Dialog labelledBy="inv-h" onClose={onClose}>
      <button type="button" className="dialog-x" aria-label="Close" onClick={onClose}><CloseGlyph /></button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span aria-hidden="true" className="ktile" style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--butter)' }}><UserPlusGlyph size={26} /></span>
        <h2 id="inv-h">Invite housemates</h2>
        <p className="lead" style={{ margin: 0, fontSize: 16 }}>Send the link, or read out the code. Anyone who has it can join {kitchen.name} until it expires.</p>
      </div>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      {!invite && busy && <div role="status" aria-label="Making a code" style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><span className="spinner" /></div>}

      {invite && (
        <>
          <div className="field">
            <label htmlFor="inv-link" className="label">Invite link</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="inv-link" className="input" type="text" readOnly value={link} onFocus={(e) => e.target.select()} style={{ flexGrow: 1, minWidth: 0, height: 52, background: 'var(--cream)', fontWeight: 700, fontSize: 15 }} />
              <button type="button" className="btn btn-primary btn-sm" style={{ height: 52 }} onClick={copy}>
                {copied ? <CheckGlyph size={18} /> : <CopyGlyph size={18} />}{copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <span aria-live="polite" className="sr-only">{copied ? 'Link copied' : ''}</span>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button type="button" className="link-btn" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }} onClick={share}><LinkGlyph size={16} /> Share…</button>
            )}
          </div>

          <div className="divider"><span>or share the code</span></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p className="code-grid" role="text" aria-label={'Invite code ' + invite.code.split('').join(' ')}>
              {invite.code.split('').map((c, i) => <span key={i} aria-hidden="true" className="code-cell">{c}</span>)}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span className="small" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}><ClockGlyph /> {expiresIn(invite.expiresAt)}</span>
              <button type="button" className="ghost-btn" style={{ height: 44, display: 'flex', alignItems: 'center', gap: 6, borderColor: 'var(--line)' }} onClick={() => load(true)} disabled={busy}>
                <RefreshGlyph size={16} /> New code
              </button>
            </div>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>A new code turns the old one off. You can make up to 5 new codes an hour.</span>
          </div>
        </>
      )}

      {invite && <EmailInvite kitchenId={kitchen.id} />}

      {isOwner && (
        <fieldset style={{ margin: 0, padding: 16, border: 'none', borderRadius: 20, background: 'var(--cream)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <legend style={{ float: 'left', padding: 0, fontSize: 15, fontWeight: 800 }}>Who can invite people?</legend>
          <div className="seg" role="radiogroup" aria-label="Who can invite people?" style={{ clear: 'both' }}>
            <button type="button" role="radio" aria-checked={policy === 'owner'} onClick={() => setWho('owner')}>Only me</button>
            <button type="button" role="radio" aria-checked={policy === 'anyone'} onClick={() => setWho('anyone')}>Any member</button>
          </div>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Only you see this setting because you're the owner.</span>
        </fieldset>
      )}

      <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-end', height: 52 }} onClick={onClose}>Done</button>
    </Dialog>
  );
}

// S9 wireframe: "Invite via email".
function EmailInvite({ kitchenId }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState(null); // null | 'sending' | { sent: email } | { error }
  const send = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState('sending');
    try { await inviteByEmail(kitchenId, email.trim()); setState({ sent: email.trim() }); setEmail(''); }
    catch (err) { setState({ error: friendlyError(err) }); }
  };
  return (
    <form className="field" onSubmit={send} noValidate>
      <label htmlFor="inv-email" className="label">Or invite by email</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input id="inv-email" className="input" type="email" autoComplete="off" placeholder="housemate@example.com" value={email}
          style={{ flexGrow: 1, minWidth: 0, height: 52 }} onChange={(e) => { setEmail(e.target.value); if (state && state !== 'sending') setState(null); }}
          aria-invalid={state && state.error ? 'true' : undefined} />
        <button type="submit" className="btn btn-secondary btn-sm" style={{ height: 52 }} disabled={!email.trim() || state === 'sending'}>
          {state === 'sending' ? <span className="spinner" /> : 'Send invite'}
        </button>
      </div>
      <span aria-live="polite">
        {state && state.sent && <span className="field-ok"><CheckGlyph size={16} /> Invite sent to {state.sent}</span>}
        {state && state.error && <span className="field-error">{state.error}</span>}
      </span>
    </form>
  );
}
