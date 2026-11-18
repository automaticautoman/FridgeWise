// Wraps an OTP step as a Vercel Node function: POST + JSON only.
export function postHandler(step) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'method-not-allowed' });
    }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim();
    res.setHeader('Cache-Control', 'no-store');
    try {
      const { status, body: out } = await step(body || {}, { ip, headers: req.headers });
      return res.status(status).json(out);
    } catch (err) {
      if (err && err.httpStatus) return res.status(err.httpStatus).json({ error: err.code });
      console.error('[api]', err);
      return res.status(500).json({ error: 'server-error' });
    }
  };
}
