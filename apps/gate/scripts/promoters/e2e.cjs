const { chromium, devices } = require('playwright');
// Run: node scripts/promoters/mock-supabase.cjs, then NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399 npm run build and next start -p 3322,
// then this file. Rebuild with the real URL afterwards.
const OUT = process.env.OUT || '/tmp/promo/';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 18000;
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', role: 'authenticated', exp, aud: 'authenticated', email: 'promo@example.com' })}.sig`;
const session = { access_token: jwt, refresh_token: 'r', expires_at: exp, expires_in: 18000, token_type: 'bearer', user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'promo@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const night = 'basement-club-' + new Date(Date.now() + 9 * 864e5).toISOString().slice(0, 10);
(async () => {
  const browser = await chromium.launch();
  const errs = [];
  const shot = async (page, name) => { await page.waitForTimeout(500); await page.screenshot({ path: OUT + name + '.png', fullPage: true }); console.log('shot', name); };
  for (const [vp, opts] of [['phone', { ...devices['iPhone 13'] }], ['desk', { viewport: { width: 1440, height: 900 } }]]) {
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript(([s]) => { localStorage.setItem('sb-localhost-auth-token', s); }, [JSON.stringify(session)]);
    const page = await ctx.newPage(); page.on('pageerror', (e) => errs.push(vp + ' ' + e.message));
    await page.goto('http://localhost:3322/promote', { waitUntil: 'networkidle' }); await page.getByText('Basement Club').first().waitFor(); await shot(page, vp + '-1-promote');
    await page.goto('http://localhost:3322/promote/basement-club', { waitUntil: 'networkidle' }); await page.getByText('Basement Sessions 04').waitFor(); await shot(page, vp + '-2-dashboard');
    if (vp === 'phone') {
      await page.getByRole('link', { name: 'New night' }).click(); await page.getByText('New night', { exact: true }).waitFor();
      await page.getByPlaceholder('e.g. Basement Sessions 04').fill('Basement Sessions 05');
      await page.locator('input[type=date]').fill(new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10));
      const ins = page.locator('form input:not([type=date]):not([type=checkbox])');
      await page.getByText('Venue', { exact: true }).locator('xpath=following-sibling::input').fill('Bar Wild');
      await page.getByText('City', { exact: true }).locator('xpath=following-sibling::input').fill('Bengaluru');
      await shot(page, vp + '-3-editor');
      await page.getByRole('button', { name: 'Save and send to CCD' }).click();
      await page.waitForURL('**/promote/basement-club'); await page.getByText('Basement Sessions 05').waitFor();
      console.log('night saved and submitted:', await page.getByText('With CCD').count() >= 1);
    }
    await page.goto('http://localhost:3322/nights/' + night, { waitUntil: 'networkidle' }); await page.getByText('Basement Club presents').waitFor(); await shot(page, vp + '-4-night');
    await page.goto('http://localhost:3322/promoters/basement-club', { waitUntil: 'networkidle' }); await page.getByText('House and disco in small rooms').first().waitFor(); await shot(page, vp + '-5-promoter');
    await page.goto('http://localhost:3322/whats-on', { waitUntil: 'networkidle' });
    console.log(vp, 'on whats-on:', await page.getByText('Basement Club on CCD').count());
    await ctx.close();
  }
  console.log('errors:', errs);
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
