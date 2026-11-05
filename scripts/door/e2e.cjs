const { chromium, devices } = require('playwright');
// Door end to end against a production build on :3322, with the backend mocked and a fake camera.
// Make the video first: node -e 'require("qrcode").toFile("/tmp/door/qr.png","A1B2C3D4E5",{width:480,margin:4})' then
// ffmpeg -loop 1 -i /tmp/door/qr.png -vf "scale=640:480:force_original_aspect_ratio=decrease,pad=640:480:(ow-iw)/2:(oh-ih)/2:white,format=yuv420p" -t 2 -r 10 /tmp/door/qr.y4m
const OUT = process.env.OUT || '/tmp/door/';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const uid = '11111111-1111-1111-1111-111111111111';
const exp = Math.floor(Date.now() / 1000) + 3600 * 5;
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: uid, role: 'authenticated', exp, aud: 'authenticated' })}.sig`;
const session = { access_token: jwt, refresh_token: 'r', expires_at: exp, expires_in: 18000, token_type: 'bearer', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'door@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };

const S = {
  tickets: [
    { code: 'A1B2C3D4E5', name: 'Asha Rao', tier: 'Free list', in_at: null, void: false, order: 'o1' },
    { code: 'FFFF000011', name: 'Ravi K', tier: 'Free list', in_at: new Date(Date.now() - 20 * 60000).toISOString(), void: false, order: 'o2' },
    { code: 'BEEF000022', name: 'Meera S', tier: 'Free list', in_at: null, void: false, order: 'o3' },
    { code: 'DEAD000033', name: 'Refund Person', tier: 'Free list', in_at: null, void: true, order: 'o4' },
  ],
  rsvps: [{ id: 'r1', name: 'Neha Iyer', party: 3, in_count: 0, in_at: null }],
  walkins: [], calls: [], team: [], live_key: null, imports: [],
  // Outside tickets (migration 060): one imported from District, one added by the guest from BookMyShow.
  guests: [
    { id: 'g1', code: 'DST12345', name: 'Tara M', source: 'district', party: 2, in_count: 0, in_at: null, uploaded: false, proof: null },
    { id: 'g2', code: 'BMS998877', name: 'Kabir D', source: 'bookmyshow', party: 1, in_count: 0, in_at: null, uploaded: true, proof: 'door/episode-5/u/1.jpg' },
  ],
  settings: { age_check: true, note: 'Wristband after ID', upi_vpa: 'ccd@okhdfc', upi_name: 'Cats Can Dance', lead: true },
};
const night = { slug: 'episode-5', title: 'Cats Can Dance Episode 5', event_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), date: 'Wed 25 Nov 2026', start_time: '8pm', venue: 'The Humming Tree', city: 'Bengaluru', capacity: 150 };
function rpc(name, a) {
  S.calls.push(name + ' ' + JSON.stringify(a));
  if (name === 'door_nights') return { ok: true, nights: [{ ...night, expected: 7, inside: 1 }] };
  if (name === 'door_list') return { ok: true, night, settings: S.settings, tickets: S.tickets, rsvps: S.rsvps, walkins: S.walkins, server_time: new Date().toISOString() };
  if (name === 'door_passout') { const t = S.tickets.find((x) => x.code === a.p_code); if (!t || !t.in_at) return { ok: true, result: 'not_in' }; if (t.out_at) return { ok: true, result: 'already_out' }; t.out_at = new Date().toISOString(); return { ok: true, result: 'out', name: t.name }; }
  if (name === 'door_setup') return { ok: true, settings: { ...S.settings, live_key: S.live_key }, team: S.team };
  if (name === 'door_save_settings') { Object.assign(S.settings, { age_check: a.p_age_check, note: a.p_note, upi_vpa: a.p_upi_vpa, upi_name: a.p_upi_name }); return { ok: true }; }
  if (name === 'door_team_set') { S.team = S.team.filter((t) => t.email !== a.p_email.toLowerCase()); if (!a.p_remove) S.team.push({ email: a.p_email.toLowerCase(), role: a.p_role, name: a.p_name, joined: false }); return { ok: true }; }
  if (name === 'door_live_link') { S.live_key = S.live_key || 'k'.repeat(32); return { ok: true, key: S.live_key }; }
  if (name === 'door_live') return { ok: true, title: night.title, venue: night.venue, date: night.date, capacity: 150, inside: 9, expected: 6, last15: 4, at: new Date().toISOString() };
  if (name === 'door_report') return { ok: true, night, tiers: [{ tier: 'Free list', sold: 3, in: 3 }], list: { people: 3, in: 3 }, walkins: { people: 2, takings: { upi: 1000 } }, arrivals: [{ t: new Date(Date.now() - 30 * 60000).toISOString(), n: 2 }, { t: new Date(Date.now() - 15 * 60000).toISOString(), n: 5 }, { t: new Date().toISOString(), n: 1 }], repeat: 2, first_timers: 1, passouts: 1, devices: [{ device: 'Door A', actions: 9 }] };
  if (name === 'door_checkin') {
    const t = S.tickets.find((x) => x.code === a.p_code.toUpperCase());
    if (!t) return { ok: true, result: 'not_found' };
    if (t.void) return { ok: true, result: 'void', name: t.name };
    if (t.in_at && t.out_at) { t.out_at = null; return { ok: true, result: 'back', name: t.name }; }
    if (t.in_at) return { ok: true, result: 'already', name: t.name, at: t.in_at };
    t.in_at = a.p_client_at || new Date().toISOString(); return { ok: true, result: 'admit', name: t.name, tier: t.tier, at: t.in_at };
  }
  if (name === 'door_rsvp') { const r = S.rsvps.find((x) => x.id === a.p_id); r.in_count = Math.max(0, Math.min(r.party, a.p_count)); r.in_at = r.in_count ? (r.in_at || new Date().toISOString()) : null; return { ok: true, in_count: r.in_count }; }
  if (name === 'door_walkin') { if (!S.walkins.find((w) => w.id === a.p_id)) S.walkins.unshift({ id: a.p_id, name: a.p_name, party: a.p_party, amount: a.p_amount, method: a.p_method, at: new Date().toISOString() }); return { ok: true }; }
  if (name === 'door_void_walkin') { S.walkins = S.walkins.filter((w) => w.id !== a.p_id); return { ok: true }; }
  if (name === 'door_guests_list') return { ok: true, guests: S.guests, limits: { plan: 'pro', billing: false, import_cap: 5000, plan_if_billing: 'free' }, imports: S.imports };
  if (name === 'door_guest_set') { const g = S.guests.find((x) => x.id === a.p_id); g.in_count = Math.max(0, Math.min(g.party, a.p_count)); g.in_at = g.in_count ? (g.in_at || new Date().toISOString()) : null; return { ok: true, in_count: g.in_count }; }
  if (name === 'door_check_guest') { const c = a.p_code.toUpperCase().replace(/[^A-Z0-9]/g, ''); const g = S.guests.find((x) => c.includes(x.code)); if (!g) return { ok: true, result: 'not_found' }; if (g.in_count >= g.party) return { ok: true, result: 'already', name: g.name, tier: g.source, party: g.party, at: g.in_at }; g.in_count = g.party; g.in_at = new Date().toISOString(); return { ok: true, result: 'admit', name: g.name, tier: g.source, party: g.party }; }
  if (name === 'door_import_guests') { const b = 'b' + (S.imports.length + 1); let added = 0; for (const r of a.p_rows) { const c = (r.code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c && S.guests.find((g) => g.code === c)) continue; S.guests.push({ id: 'g' + (S.guests.length + 1), code: c || null, name: r.name, source: a.p_source, party: r.party || 1, in_count: 0, in_at: null, uploaded: false, proof: null, batch: b }); added++; } S.imports.unshift({ batch: b, source: a.p_source, rows: added, at: new Date().toISOString() }); return { ok: true, batch: b, added, updated: a.p_rows.length - added, skipped: 0, cap: 5000, plan: 'pro' }; }
  if (name === 'door_void_import') { const n = S.guests.filter((g) => g.batch === a.p_batch && !g.in_count).length; S.guests = S.guests.filter((g) => g.batch !== a.p_batch || g.in_count); S.imports = S.imports.filter((x) => x.batch !== a.p_batch); return { ok: true, removed: n }; }
  if (name === 'door_undo_ticket') { const t = S.tickets.find((x) => x.code === a.p_code); if (t) t.in_at = null; return { ok: true }; }
  return { ok: false, error: 'unknown' };
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${OUT}qr.y4m`] });
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2, permissions: ['camera'] });
  await ctx.addInitScript(([s]) => { localStorage.setItem('sb-jybloszaucgqlbkzquqw-auth-token', s); }, [JSON.stringify(session)]);
  await ctx.route('**/rest/v1/rpc/door_*', async (route) => {
    const name = route.request().url().split('/rpc/')[1].split('?')[0];
    await route.fulfill({ json: rpc(name, JSON.parse(route.request().postData() || '{}')) });
  });
  await ctx.route('**/rest/v1/members*', (route) => route.fulfill({ json: { id: uid, email: 'door@example.com', display_name: 'Door', city: 'Bengaluru', genres: [], role: 'staff', quiz: null } }));
  await ctx.route('**/auth/v1/**', (route) => route.fulfill({ json: {} }));
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const step = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: OUT + name + '.png' }); console.log('shot', name); };

  await page.goto('http://localhost:3322/door', { waitUntil: 'networkidle' });
  await page.getByText('Pick the night.').waitFor();
  await step('01-nights');
  await page.getByText('Cats Can Dance Episode 5').click();
  await page.getByText('Start scanning').waitFor();
  await step('02-scan-idle');
  await page.getByText('Start scanning').click();
  await page.getByText('Let them in', { exact: true }).waitFor({ timeout: 10000 });
  await step('03-admit');
  console.log('after scan admit calls:', S.calls.filter((c) => c.startsWith('door_checkin')).length);
  await page.getByText('Let them in', { exact: true }).click();
  await page.waitForTimeout(4000);
  console.log('camera rescans ignored within 20s:', !(await page.getByText('Already in', { exact: true }).isVisible()));
  await page.getByPlaceholder('Ticket code').fill('A1B2C3D4E5');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await page.getByText('Already in', { exact: true }).waitFor({ timeout: 10000 });
  await step('04-already-camera');
  await page.getByText('Already in', { exact: true }).first().click();
  await page.getByText('Guests', { exact: true }).click();
  await page.getByPlaceholder('Search a name or code').fill('neha');
  await page.getByRole('button', { name: 'One more for Neha Iyer' }).click();
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByPlaceholder('Search a name or code').fill('');
  await page.getByRole('button', { name: 'Everyone' }).click();
  await step('05-guests');
  await page.getByText('Walk-in', { exact: true }).click();
  await page.getByPlaceholder('Name').fill('Kiran');
  await page.getByRole('button', { name: 'One more' }).click();
  await page.getByPlaceholder('Amount paid, ₹ (total)').fill('1000');
  await page.getByRole('button', { name: /^Add 2 people/ }).click();
  await step('06-walkin');
  // offline: check in Meera by code with no network, then come back
  await page.getByText('Scan', { exact: true }).click();
  await ctx.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await page.getByPlaceholder('Ticket code').fill('beef000022');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await page.getByText('Let them in', { exact: true }).waitFor();
  await page.getByText('Let them in', { exact: true }).click();
  await page.waitForTimeout(300);
  await step('07-offline-queued');
  const before = S.tickets.find((t) => t.code === 'BEEF000022').in_at;
  await page.getByPlaceholder('Ticket code').fill('DEAD000033');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await page.getByText('Refunded', { exact: true }).waitFor();
  await page.getByText('Refunded', { exact: true }).click();
  await ctx.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(2500);
  const after = S.tickets.find((t) => t.code === 'BEEF000022').in_at;
  console.log('offline sync: before', before, 'after', !!after);
  await page.getByPlaceholder('Ticket code').fill('ZZZZ999999');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await page.getByText('Not a ticket').waitFor();
  await step('08-not-found');
  await page.getByText('Not a ticket').click();
  await page.getByText('Count', { exact: true }).click();
  await step('09-count');
  console.log('header:', await page.locator('header').innerText());
  // v2: pass-out and back, ID check banner, UPI QR, setup, report, live
  await page.getByText('Scan', { exact: true }).click();
  await page.getByRole('button', { name: 'Out (pass-out)' }).click();
  await page.getByPlaceholder('Ticket code').fill('A1B2C3D4E5');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await page.getByText('Pass-out', { exact: true }).waitFor();
  await step('10-passout');
  await page.getByText('Pass-out', { exact: true }).click();
  await page.getByRole('button', { name: 'In', exact: true }).click();
  await page.getByPlaceholder('Ticket code').fill('A1B2C3D4E5');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await page.getByText('Welcome back', { exact: true }).waitFor();
  console.log('ID check banner on green:', await page.getByText('Check ID', { exact: true }).isVisible());
  await step('11-back-id');
  await page.getByText('Welcome back', { exact: true }).click();
  await page.waitForTimeout(1500);
  console.log('passout calls:', S.calls.filter((c) => c.startsWith('door_passout')).length, 'back:', !S.tickets[0].out_at);
  await page.getByText('Walk-in', { exact: true }).click();
  await page.getByPlaceholder('Amount paid, ₹ (total)').fill('600');
  await page.getByAltText('UPI QR for ₹600').waitFor();
  await step('12-upi-qr');
  // Outside tickets: a District code scans from the phone's list (party of 2 in on one scan), a BookMyShow link QR matches its code.
  await page.getByText('Scan', { exact: true }).click();
  await page.getByPlaceholder('Ticket code').fill('dst-12345');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await page.getByText('Let them in', { exact: true }).waitFor();
  console.log('outside ticket admit shows source:', await page.getByText('District · party of 2').isVisible());
  await step('12b-outside-admit');
  await page.getByText('Let them in', { exact: true }).click();
  await page.getByPlaceholder('Ticket code').fill('https://in.bookmyshow.com/t/BMS998877?ref=x');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await page.getByText('Let them in', { exact: true }).waitFor();
  await page.getByText('Let them in', { exact: true }).click();
  await page.waitForTimeout(1500);
  console.log('guest sets sent:', S.calls.filter((c) => c.startsWith('door_guest_set')).length, 'tara in:', S.guests[0].in_count, 'kabir in:', S.guests[1].in_count);
  await page.getByText('Guests', { exact: true }).click();
  await page.getByRole('button', { name: 'Everyone' }).click();
  await page.getByPlaceholder('Search a name or code').fill('kabir');
  console.log('guest-added row:', await page.getByText(/added by the guest/).isVisible(), 'ticket link:', await page.getByRole('button', { name: 'Ticket', exact: true }).isVisible());
  await step('12c-outside-guests');
  await page.goto('http://localhost:3322/door/episode-5/setup', { waitUntil: 'networkidle' });
  await page.getByText('Door rules').waitFor();
  await page.getByText('Tickets sold elsewhere').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'BookMyShow', exact: true }).click();
  await page.getByPlaceholder(/Booking ID, Name/).fill('Booking ID,Customer Name,Email,No. of Tickets\nBK1001,Zoya A,z@example.com,2\n"BK1002","Dev, R",d@example.com,1\nBK1003,Ira P,,3');
  await page.getByRole('button', { name: /^Import 3 from BookMyShow/ }).waitFor();
  await step('13a-import-preview');
  await page.getByRole('button', { name: /^Import 3 from BookMyShow/ }).click();
  await page.getByText(/3 added, 0 updated/).waitFor();
  console.log('imported rows:', S.guests.filter((g) => g.source === 'bookmyshow').length - 1, 'party read:', S.guests.find((g) => g.code === 'BK1003')?.party, 'quoted name:', S.guests.find((g) => g.code === 'BK1002')?.name);
  await step('13b-imported');
  await page.getByPlaceholder('Email', { exact: true }).fill('Venue.Door@example.com');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByText('venue.door@example.com').waitFor();
  await page.getByRole('button', { name: 'Make the link' }).click();
  await page.getByText('/door/live/').waitFor();
  await step('13-setup');
  await page.goto('http://localhost:3322/door/episode-5/report', { waitUntil: 'networkidle' });
  await page.getByText('Through the door', { exact: true }).waitFor();
  await step('14-report');
  const anon = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 });
  await anon.route('**/rest/v1/rpc/door_*', async (route) => route.fulfill({ json: rpc(route.request().url().split('/rpc/')[1].split('?')[0], JSON.parse(route.request().postData() || '{}')) }));
  const lp = await anon.newPage();
  await lp.goto('http://localhost:3322/door/live/' + 'k'.repeat(32), { waitUntil: 'networkidle' });
  await lp.getByText('LIVE COUNT', { exact: true }).waitFor();
  await lp.screenshot({ path: OUT + '15-live.png' }); console.log('shot 15-live');

  console.log('errors:', errs);
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
