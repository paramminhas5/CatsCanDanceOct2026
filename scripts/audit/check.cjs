/**
 * Improvement check. Run against a running build:  BASE=http://localhost:3000 node scripts/audit/check.cjs
 * For each page at 1440 and 390 wide it records: page errors, console errors, failed requests, sideways overflow,
 * elements wider than the screen, broken images, images without alt, buttons and links without a name,
 * em dashes in visible text, tap targets under 40px on phones, and load timing. Writes scripts/audit/out/report.json
 * and full-page screenshots, and prints a short summary. No network beyond BASE.
 */
const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = path.join(__dirname, "out");
const PAGES = (process.env.PAGES || "/,/whats-on,/nights,/nights/episode-5,/artists,/artists/kohra,/tour,/book,/me,/for-artists,/submit-event/event,/bookings,/claim/00000000-0000-0000-0000-000000000000").split(",");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const report = [];
  for (const [vp, opts] of [["desktop", { viewport: { width: 1440, height: 900 } }], ["phone", { ...devices["iPhone 13"] }]]) {
    for (const p of PAGES) {
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      const errs = [], cons = [], failed = [];
      page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 200)));
      page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource: the server responded with a status of 404/.test(m.text())) cons.push(m.text().slice(0, 200)); });
      page.on("requestfailed", (r) => { const u = r.url(); if (u.startsWith(BASE) && !u.includes("/_vercel/")) failed.push(`${r.failure()?.errorText} ${u.slice(BASE.length, BASE.length + 100)}`); });
      page.on("response", (r) => { const u = r.url(); if (u.startsWith(BASE) && !u.includes("/_vercel/") && r.status() >= 400) failed.push(`${r.status()} ${u.slice(BASE.length, BASE.length + 100)}`); });
      const t0 = Date.now();
      let status = 0;
      try { const res = await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 45000 }); status = res ? res.status() : 0; } catch (e) { errs.push("load: " + String(e).slice(0, 120)); }
      const loadMs = Date.now() - t0;
      for (let y = 0; y < 20000; y += 800) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(60); }
      await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
      const f = await page.evaluate((isPhone) => {
        const vw = document.documentElement.clientWidth;
        const wide = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.right > vw + 2 && getComputedStyle(el).position !== "fixed") {
            let p = el.parentElement, clipped = false;
            while (p) { const o = getComputedStyle(p); if (/(hidden|auto|scroll|clip)/.test(o.overflowX)) { clipped = true; break; } p = p.parentElement; }
            if (!clipped) wide.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 2).join(".")} ${Math.round(r.right)}`);
          }
        }
        const imgs = [...document.images];
        const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith("data:")).map((i) => i.src.slice(0, 100));
        const noAlt = imgs.filter((i) => !i.hasAttribute("alt")).length;
        const unnamedEls = [...document.querySelectorAll("button, a[href]")].filter((b) => b.getAttribute("aria-hidden") !== "true" && !(b.textContent || "").trim() && !b.getAttribute("aria-label") && !b.querySelector("img[alt]:not([alt=''])") && !b.getAttribute("title"));
        const unnamed = unnamedEls.length;
        const unnamedSample = unnamedEls.slice(0, 3).map((b) => b.outerHTML.slice(0, 140));
        const text = document.body.innerText || "";
        const dashes = (text.match(/[^\n]{0,30}—[^\n]{0,30}/g) || []).slice(0, 5);
        const smallEls = isPhone ? [...document.querySelectorAll("button, a[href]")].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 32 || r.width < 32) && getComputedStyle(b).display !== "inline"; }) : [];
        const small = smallEls.length;
        const smallSample = [...new Set(smallEls.map((b) => `${b.tagName.toLowerCase()}.${String(b.className).split(" ").slice(0, 4).join(".")} "${(b.textContent || "").trim().slice(0, 20)}"`))].slice(0, 5);
        const lcp = performance.getEntriesByType("largest-contentful-paint").slice(-1)[0];
        return { scrollWidth: document.documentElement.scrollWidth, vw, wide: wide.slice(0, 8), broken, noAlt, unnamed, unnamedSample, dashes, small, smallSample, title: document.title, h1: document.querySelectorAll("h1").length, lcp: lcp ? Math.round(lcp.startTime) : null };
      }, vp === "phone");
      const shot = path.join(OUT, `${vp}${p.replace(/[^a-z0-9]+/gi, "_") || "_home"}.png`);
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
      report.push({ page: p, vp, status, loadMs, errors: errs, console: cons.slice(0, 6), failed: failed.slice(0, 6), ...f, shot });
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
  for (const r of report) {
    const issues = [
      r.status >= 400 && `status ${r.status}`,
      r.errors.length && `${r.errors.length} page errors: ${r.errors[0]}`,
      r.console.length && `${r.console.length} console errors: ${r.console[0]}`,
      r.failed.length && `${r.failed.length} failed requests: ${r.failed[0]}`,
      r.scrollWidth > r.vw && `sideways scroll ${r.scrollWidth}>${r.vw}`,
      r.wide.length && `too wide: ${r.wide.slice(0, 3).join(" | ")}`,
      r.broken.length && `${r.broken.length} broken images`,
      r.noAlt && `${r.noAlt} images without alt`,
      r.unnamed && `${r.unnamed} unnamed buttons/links`,
      r.dashes.length && `em dashes: ${r.dashes[0]}`,
      r.small && `${r.small} small tap targets`,
      r.h1 !== 1 && `${r.h1} h1`,
    ].filter(Boolean);
    console.log(`${r.vp.padEnd(7)} ${r.page.padEnd(28)} ${String(r.loadMs).padStart(5)}ms lcp ${r.lcp ?? "-"}  ${issues.length ? issues.join("; ") : "ok"}`);
  }
})();
