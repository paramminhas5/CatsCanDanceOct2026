// A Deezer 30 second preview, passed through so the browser can decode and scratch it. GET /api/pv?u=<preview url>
const OK = /^https:\/\/(cdnt-preview|cdns-preview-[a-z0-9]+|e-cdns-preview-[a-z0-9]+)\.dzcdn\.net\//;
module.exports = async (req, res) => {
  const u = String(req.query.u || '');
  if (!OK.test(u)) { res.status(400).end('bad url'); return; }
  try {
    const r = await fetch(u);
    if (!r.ok) { res.status(r.status).end(); return; }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', r.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=600');
    res.status(200).send(buf);
  } catch (e) { res.status(502).end(); }
};
