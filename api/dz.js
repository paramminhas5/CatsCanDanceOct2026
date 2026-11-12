// Deezer API, read on the server so it works wherever the visitor is. GET /api/dz?p=album/123
module.exports = async (req, res) => {
  const p = String(req.query.p || '');
  if (!/^(album|artist|search|track)\/?[A-Za-z0-9_\/?=&%.,'+ -]*$/.test(p)) { res.status(400).json({ error: 'bad path' }); return; }
  try {
    const r = await fetch('https://api.deezer.com/' + p, { headers: { 'accept': 'application/json' } });
    const j = await r.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
    res.status(200).json(j);
  } catch (e) { res.status(502).json({ error: 'deezer unreachable' }); }
};
