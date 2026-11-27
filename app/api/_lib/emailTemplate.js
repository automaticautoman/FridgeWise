// The 6-digit code email, shared by sign-up (verify) and forgot password (reset).
//
// Email apps ignore most modern CSS, so this uses tables and inline styles only,
// and no images (many inboxes block them). Colours match the app.
//
// To change who is credited at the bottom, edit TEAM.

export const TEAM = {
  name: 'Team Git Happens',
  members: ['Huzaifa Iqbal', 'Usman Shaukat', 'Bareera Rehan', 'Emaan Tariq', 'Abdul Haseeb', 'Mohammad Yahya']
};

const SITE = 'https://www.fridgewise.me';

const C = {
  page: '#FFF9F0',
  card: '#FFFFFF',
  ink: '#3D3533',
  muted: '#6B6663',
  coral: '#FF7F79',
  coralDeep: '#D9524C',
  coralSoft: '#FFE3E1',
  butter: '#FFE28A',
  mint: '#A8DDB5',
  mintSoft: '#D6F0DC',
  line: '#EFE7DE'
};
const FONT = "'Nunito','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const DISPLAY = "'Baloo 2','Nunito','Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const COPY = {
  verify: {
    subject: (code) => `${code} is your FridgeWise sign-up code`,
    preheader: (code, min) => `Your code is ${code}. It works for ${min} minutes.`,
    badge: '🍳 Welcome to the kitchen',
    badgeBg: C.mintSoft,
    title: "Let's get you in, chef",
    lead: "Your fridge has been waiting for someone like you. Pop this code into FridgeWise to confirm your email, before the milk notices you're late.",
    ignore: "Didn't sign up for FridgeWise? Then someone typed your email by mistake. Ignore this, nothing happens. Your fridge remains a mystery.",
    text: (code, min) => `Welcome to FridgeWise!\n\nYour code to confirm your email is ${code}. It works for ${min} minutes.\n\nDidn't create an account? You can ignore this email.`
  },
  reset: {
    subject: (code) => `${code} is your FridgeWise reset code`,
    preheader: (code, min) => `Your password reset code is ${code}. It works for ${min} minutes.`,
    badge: '🔑 Password reset',
    badgeBg: C.butter,
    title: 'Forgot your password? Happens.',
    lead: "Your password went the way of that one Tupperware lid: gone, no trace. No judgement. Enter this code in FridgeWise and pick a fresh one.",
    ignore: "Didn't ask for this? Ignore it. Your password stays exactly as it is, safer than the last slice of pizza.",
    text: (code, min) => `Your FridgeWise code to set a new password is ${code}. It works for ${min} minutes.\n\nDidn't ask for this? You can ignore this email. Your password stays the same.`
  }
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function digitCells(code) {
  return String(code).split('').map((d) => `
              <td align="center" style="padding:0 4px">
                <div style="width:44px;height:56px;line-height:56px;border-radius:14px;background:${C.page};border:2px solid ${C.line};font-family:${DISPLAY};font-size:30px;font-weight:800;color:${C.ink};text-align:center">${esc(d)}</div>
              </td>`).join('');
}

function teamList() {
  return TEAM.members.map(esc).join(' &middot; ');
}

export function renderCodeEmail({ code, minutes, purpose = 'reset' }) {
  const copy = COPY[purpose] || COPY.reset;
  const year = new Date().getFullYear();

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${esc(copy.subject(code))}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
  <!-- Inbox preview line (hidden in the email itself) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(copy.preheader(code, minutes))}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page}">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">

          <!-- Logo -->
          <tr>
            <td style="padding:0 4px 20px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="40" height="40" align="center" valign="middle" bgcolor="${C.coral}" style="width:40px;height:40px;border-radius:12px;background:${C.coral};font-family:${DISPLAY};font-size:22px;font-weight:800;color:${C.ink}">F</td>
                  <td style="padding-left:10px;font-family:${DISPLAY};font-size:24px;font-weight:800;color:${C.ink}">FridgeWise</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td bgcolor="${C.card}" style="background:${C.card};border-radius:24px;padding:32px 28px;border:1px solid ${C.line}">

              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="${copy.badgeBg}" style="background:${copy.badgeBg};border-radius:999px;padding:6px 14px;font-family:${FONT};font-size:13px;font-weight:800;color:${C.ink}">${esc(copy.badge)}</td>
                </tr>
              </table>

              <h1 style="margin:18px 0 0;font-family:${DISPLAY};font-size:30px;line-height:1.15;font-weight:800;color:${C.ink}">${esc(copy.title)}</h1>
              <p style="margin:10px 0 0;font-family:${FONT};font-size:16px;line-height:1.55;color:${C.muted}">${esc(copy.lead)}</p>

              <!-- The code, one box per digit -->
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0">
                <tr>${digitCells(code)}
                </tr>
              </table>
              <p style="margin:16px 0 0;text-align:center;font-family:${FONT};font-size:14px;font-weight:700;color:${C.muted}">
                Fresh for <span style="color:${C.ink}">${minutes} minutes</span>. Single use, like a paper napkin.
              </p>

              <!-- Safety note -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px">
                <tr>
                  <td bgcolor="${C.coralSoft}" style="background:${C.coralSoft};border-radius:16px;padding:14px 16px;font-family:${FONT};font-size:14px;line-height:1.5;color:${C.ink}">
                    <strong>Guard it like your leftovers.</strong> Never share this code. The FridgeWise team will never ask for it, not even nicely.
                  </td>
                </tr>
              </table>

              <p style="margin:18px 0 0;font-family:${FONT};font-size:13px;line-height:1.55;color:${C.muted}">${esc(copy.ignore)}</p>
            </td>
          </tr>

          <!-- Team credit -->
          <tr>
            <td align="center" style="padding:28px 12px 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted}">
              <div style="font-weight:800;color:${C.ink}">Cooked up with 🧡 by ${esc(TEAM.name)}</div>
              <div style="margin-top:4px">${teamList()}</div>
              <div style="margin-top:14px">
                <a href="${SITE}" style="color:${C.coralDeep};font-weight:800;text-decoration:none">www.fridgewise.me</a>
                &nbsp;&middot;&nbsp; Eat it before it eats your budget &nbsp;&middot;&nbsp; &copy; ${year} FridgeWise
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${copy.text(code, minutes)}\n\n--\nFridgeWise, made by ${TEAM.name}: ${TEAM.members.join(', ')}\n${SITE}`;
  return { subject: copy.subject(code), text, html };
}
