// An album cover from Deezer. GET /api/cover?id=123&s=medium
module.exports = async (req, res) => {
  const id = String(req.query.id || ''), s = ['small', 'medium', 'big'].includes(req.query.s) ? req.query.s : 'medium';
  if (!/^\d+$/.test(id)) { res.status(400).end(); return; }
  try {
    const r = await fetch(`https://api.deezer.com/album/${id}/image?size=${s}`);
    if (!r.ok) { res.status(404).end(); return; }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=86400');
    res.status(200).send(buf);
  } catch (e) { res.status(502).end(); }
};
