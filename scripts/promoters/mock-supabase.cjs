// Mock Supabase for promoter pages: answers promoter/night reads and RPCs from memory, forwards everything else to the real project.
const http = require('http'); const https = require('https');
const REAL = 'jybloszaucgqlbkzquqw.supabase.co';
const today = new Date(); const d = (n) => new Date(today.getTime() + n * 864e5).toISOString().slice(0, 10);
const P = { id: 'p1', slug: 'basement-club', name: 'Basement Club', status: 'approved', city: 'Bengaluru', genres: ['house', 'disco'], blurb: 'Small rooms, long sets, house and disco. Running since 2023.', tagline: 'House and disco in small rooms', instagram: '@basementclub', website: null, accent: 'red', logo_url: null, cover_url: null, review_note: null };
const NIGHT = { id: 'e1', slug: 'basement-club-' + d(9), title: 'Basement Sessions 04', date: 'Sat, Nov 14, 2026', event_date: d(9), start_time: '9pm', venue: 'Bar Wild', city: 'Bengaluru', blurb: 'Four hours of house and disco. Doors at 9, music till late.', lineup: ['Sartdawg', 'Guest TBA'], genres: ['house', 'disco'], poster_url: null, ticket_url: null, rsvp_open: true, capacity: 120, published: true, promoter_id: 'p1', status: 'upcoming', listed: true, review_status: 'approved' };
const DRAFT = { ...NIGHT, slug: 'basement-club-' + d(20), title: 'Disco Loft', event_date: d(20), published: false, review_status: 'draft' };
const state = { team: [{ email: 'promo@example.com', role: 'owner' }], nights: [NIGHT, DRAFT], calls: [] };
const dash = () => ({ ok: true, role: 'owner', promoter: P, team: state.team, nights: state.nights.map((n) => ({ ...n, tiers: n === NIGHT ? [{ name: 'Free entry', capacity: 100, max_per_order: 2 }] : [], tickets: n === NIGHT ? 37 : 0, rsvps: n === NIGHT ? 12 : 0, going: n === NIGHT ? 21 : 0, inside: 0 })) });
const RPC = {
  my_promoters: () => ({ ok: true, promoters: [{ slug: P.slug, name: P.name, status: 'approved', city: P.city, accent: P.accent, role: 'owner', nights: state.nights.length }] }),
  promoter_get: () => dash(),
  promoter_apply: (a) => ({ ok: true, slug: 'new-crew' }),
  promoter_save: (a) => { Object.assign(P, a.p_data); return { ok: true }; },
  promoter_team_set: (a) => { state.team = state.team.filter((t) => t.email !== a.p_email); if (!a.p_remove) state.team.push({ email: a.p_email, role: a.p_role }); return { ok: true }; },
  promoter_night_save: (a) => { const slug = a.p_night || 'basement-club-' + a.p_data.event_date; const ex = state.nights.find((n) => n.slug === slug); const row = { ...(ex || DRAFT), ...a.p_data, slug, published: ex ? ex.published : false, review_status: ex ? ex.review_status : 'draft' }; state.nights = state.nights.filter((n) => n.slug !== slug).concat(row); return { ok: true, slug, published: row.published }; },
  promoter_night_status: (a) => { const n = state.nights.find((x) => x.slug === a.p_night); if (n) n.review_status = a.p_action === 'submit' ? 'pending' : 'draft'; return { ok: true }; },
  public_tiers: () => [{ id: 't1', name: 'Free entry', price_inr: 0, capacity: 100, max_per_order: 2, left: 63 }],
  night_counts: () => [], my_night_state: () => null, load_crowd: () => [],
};
http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
    const u = req.url; const send = (j) => { res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }); res.end(JSON.stringify(j)); };
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }); return res.end(); }
    const m = u.match(/^\/rest\/v1\/rpc\/([a-z_]+)/);
    if (m && RPC[m[1]]) { state.calls.push(m[1]); return send(RPC[m[1]](body ? JSON.parse(body) : {})); }
    if (u.startsWith('/auth/v1/')) return send({});
    if (u.startsWith('/rest/v1/promoters') && /slug=eq\.basement-club|id=eq\.p1|id=in\./.test(u)) return send(/maybeSingle|vnd.pgrst.object/.test(req.headers.accept || '') ? P : [P]);
    if (u.startsWith('/rest/v1/events') && u.includes('slug=eq.' + NIGHT.slug)) return send((req.headers.accept || '').includes('vnd.pgrst.object') ? NIGHT : [NIGHT]);
    if (u.startsWith('/rest/v1/events') && u.includes('promoter_id=eq.p1')) return send([NIGHT]);
    if (u.startsWith('/rest/v1/events') && u.includes('promoter_id=not.is.null')) return send([NIGHT]);
    if (u.startsWith('/rest/v1/ticket_tiers') && u.includes(NIGHT.slug)) { res.writeHead(200, { 'content-type': 'application/json', 'content-range': '0-0/1', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' }); return res.end('[]'); }
    if (u.startsWith('/rest/v1/members')) return send({ id: 'u1', email: 'promo@example.com', display_name: 'Promo', city: 'Bengaluru', genres: [], role: 'member', quiz: null });
    const r = https.request({ host: REAL, path: u, method: req.method, headers: { ...req.headers, host: REAL } }, (pr) => { res.writeHead(pr.statusCode, pr.headers); pr.pipe(res); });
    r.on('error', () => { res.writeHead(502); res.end(); }); if (body) r.write(body); r.end();
  });
}).listen(54399, () => console.log('proxy on 54399'));
