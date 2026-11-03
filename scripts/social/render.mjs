// CCD social renderer v2: the CCD Social Kit.
// Turns post specs (JSON) into 1080x1350 JPEG slides in the CCD design language.
// Usage: node render.mjs posts.json [outDir]
// Post: { id, bucket, num, slides: [ { type, ...fields } ] }
//
// Design language (see ccd/social-design.md):
// - One world per bucket: Discover = the crate, Artist = liner notes, Label = centre label,
//   News = scene wire, Learn = the instrument, Nights = the ticket, Build = the build log.
// - Every slide: stamp header, the CCD marquee band (one continuous ribbon across the carousel),
//   and the pad bar (a step sequencer that lights up as you swipe).
// - Bowlby One display, Space Grotesk body, Space Mono labels. Ink borders, hard shadows, site stickers.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright'));
}

const here = path.dirname(fileURLToPath(import.meta.url));
const font = (p) => 'file://' + path.join(here, 'node_modules/@fontsource', p);
const A = (p) => 'file://' + path.join(here, 'assets', p);

// Site tokens
const INK = '#020617', CREAM = '#e7e5e4', PAPER = '#f5f3ee', RED = '#dc2626', ACID = '#b6ef36',
  BLUE = '#2563eb', ORANGE = '#f97316', PINK = '#fbcfe8', LIME = '#86efac', WHITE = '#ffffff';

// ---------- worlds ----------
const W = {
  discover: { label: 'DISCOVER', code: 'DSC', bg: ACID, fg: INK, head: INK, hs: null, hi: INK, hiFg: ACID,
    band: { bg: INK, fg: ACID, star: RED }, bandText: ['NEW MUSIC', 'FRIDAY FRESH', 'DIG DEEPER'], pad: INK, padOn: RED },
  artist: { label: 'ARTIST', code: 'ART', bg: INK, fg: CREAM, head: ACID, hs: RED, hi: RED, hiFg: CREAM,
    band: { bg: ACID, fg: INK, star: RED }, bandText: ['ARTIST', 'LINER NOTES', 'PRESS PLAY'], pad: CREAM, padOn: ACID },
  label: { label: 'LABEL', code: 'LBL', bg: BLUE, fg: CREAM, head: CREAM, hs: INK, hi: ACID, hiFg: INK,
    band: { bg: CREAM, fg: INK, star: BLUE }, bandText: ['LABELS WE LOVE', 'DIG THE CATALOGUE'], pad: CREAM, padOn: ACID },
  news: { label: 'SCENE WIRE', code: 'WIRE', bg: PAPER, fg: INK, head: INK, hs: null, hi: RED, hiFg: CREAM,
    band: { bg: RED, fg: CREAM, star: INK }, bandText: ['SCENE WIRE', 'WHAT HAPPENED THIS WEEK'], pad: INK, padOn: RED },
  learn: { label: 'CCD SCHOOL', code: 'SCH', bg: CREAM, fg: INK, head: INK, hs: null, hi: BLUE, hiFg: CREAM,
    band: { bg: BLUE, fg: CREAM, star: ACID }, bandText: ['CCD SCHOOL', 'MAKE', 'MIX', 'PLAY'], pad: INK, padOn: BLUE },
  nights: { label: 'CCD NIGHTS', code: 'EP', bg: INK, fg: CREAM, head: CREAM, hs: RED, hi: RED, hiFg: CREAM,
    band: { bg: RED, fg: CREAM, star: ACID }, bandText: ['CATS CAN DANCE', 'EPISODE 5', '25.11', 'THE HUMMING TREE'], pad: CREAM, padOn: RED },
  build: { label: 'BUILDING CCD', code: 'LOG', bg: CREAM, fg: INK, head: INK, hs: null, hi: ORANGE, hiFg: INK,
    band: { bg: ORANGE, fg: INK, star: CREAM }, bandText: ['BUILDING CCD', 'IN PUBLIC', 'COMING SOON'], pad: INK, padOn: ORANGE },
  product: { label: 'HOW TO', code: 'HOW', bg: PINK, fg: INK, head: INK, hs: null, hi: INK, hiFg: PINK,
    band: { bg: INK, fg: PINK, star: ACID }, bandText: ['HOW TO', 'CATS CAN DANCE'], pad: INK, padOn: RED },
};

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rich = (s = '') => esc(s).replace(/\*(.+?)\*/g, '<mark>$1</mark>').replace(/\n/g, '<br>');
const STAR = (fill) => `<svg viewBox="0 0 100 100"><path d="M50 2 L60 38 L98 40 L68 62 L80 98 L50 76 L20 98 L32 62 L2 40 L40 38 Z" fill="${fill}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></svg>`;
const star = (x, y, size, fill, rot = 0) => `<div class="deco" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;transform:rotate(${rot}deg)">${STAR(fill)}</div>`;
const sticker = (img, x, y, w, rot = 0, extra = '') => `<img class="sticker" src="${A(img)}" style="left:${x}px;top:${y}px;width:${w}px;transform:rotate(${rot}deg);${extra}">`;
const disc = (size, label, extra = '', text = 'CCD') => `<div class="disc" style="width:${size}px;height:${size}px;${extra}"><div class="disc-label" style="background:${label}"><span>${esc(text)}</span></div></div>`;
const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const barcode = (seed, w = 90, h = 220, color = INK) => {
  let y = 0, out = '', r = hash(seed);
  while (y < h) { r = (r * 1103515245 + 12345) >>> 0; const bh = 2 + (r % 4) * 2; if ((r >> 8) % 3) out += `<rect x="0" y="${y}" width="${w}" height="${bh}" fill="${color}"/>`; y += bh + 2 + ((r >> 4) % 3) * 2; }
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${out}</svg>`;
};

function css(w) {
  return `
@font-face{font-family:Bowlby;src:url(${font('bowlby-one/files/bowlby-one-latin-400-normal.woff2')})}
@font-face{font-family:Grotesk;font-weight:400;src:url(${font('space-grotesk/files/space-grotesk-latin-400-normal.woff2')})}
@font-face{font-family:Grotesk;font-weight:500;src:url(${font('space-grotesk/files/space-grotesk-latin-500-normal.woff2')})}
@font-face{font-family:Grotesk;font-weight:700;src:url(${font('space-grotesk/files/space-grotesk-latin-700-normal.woff2')})}
@font-face{font-family:Mono;font-weight:400;src:url(${font('space-mono/files/space-mono-latin-400-normal.woff2')})}
@font-face{font-family:Mono;font-weight:700;src:url(${font('space-mono/files/space-mono-latin-700-normal.woff2')})}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;overflow:hidden}
body{background:${w.bg};color:${w.fg};font-family:Grotesk,sans-serif;position:relative;
  background-image:radial-gradient(${w.fg}26 1.7px,transparent 1.8px);background-size:34px 34px;background-position:17px 17px}
body.grid{background-image:linear-gradient(${BLUE}22 2px,transparent 2px),linear-gradient(90deg,${BLUE}22 2px,transparent 2px);background-size:54px 54px;background-position:-2px -2px}
.noise{position:absolute;inset:0;opacity:.07;mix-blend-mode:multiply;pointer-events:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>")}
.top{position:absolute;left:56px;right:56px;top:52px;height:70px;display:flex;justify-content:space-between;align-items:center;z-index:5}
.stamp{background:${w.hi};color:${w.hiFg};border:5px solid ${INK};font:700 28px/1 Mono,monospace;letter-spacing:.1em;padding:14px 20px 12px;box-shadow:7px 7px 0 ${INK};transform:rotate(-2deg)}
.code{font:700 26px/1 Mono,monospace;letter-spacing:.08em;color:${w.fg};border:4px solid ${w.fg};padding:10px 14px}
.body{position:absolute;left:56px;right:56px;top:156px;height:874px;display:flex;flex-direction:column;justify-content:center;z-index:3}
.band{position:absolute;top:1062px;height:78px;background:${w.band.bg};border-top:5px solid ${INK};border-bottom:5px solid ${INK};display:flex;align-items:center;white-space:nowrap;z-index:4;overflow:hidden}
.band span{font:400 40px/1 Bowlby,sans-serif;color:${w.band.fg};text-transform:uppercase;display:inline-flex;align-items:center;gap:26px;margin-right:26px}
.band i{font-style:normal;color:${w.band.star};font-size:38px}
.foot{position:absolute;left:56px;right:56px;top:1172px;height:120px;display:flex;justify-content:space-between;align-items:center;z-index:5}
.brand{display:flex;align-items:center;gap:18px}
.brand img{width:84px;height:84px;border-radius:50%;background:${CREAM};border:4px solid ${INK};box-shadow:5px 5px 0 ${INK}}
.brand b{display:block;font:400 34px/1 Bowlby;color:${w.fg};letter-spacing:.01em}
.brand small{display:block;font:700 22px/1 Mono;color:${w.fg};opacity:.85;margin-top:8px;letter-spacing:.04em}
.pads{display:flex;gap:10px;align-items:center}
.pad{width:38px;height:38px;border:4px solid ${w.pad};}
.pad.on{background:${w.pad}}
.pad.now{background:${w.padOn};border-color:${INK};box-shadow:5px 5px 0 ${INK};transform:translate(-2px,-2px)}
.swipe{font:700 24px/1 Mono;letter-spacing:.06em;margin-right:14px;color:${w.fg}}
h1,h2{font-family:Bowlby,Impact,sans-serif;font-weight:400;text-transform:uppercase;letter-spacing:-.005em;color:${w.head};
  ${w.hs ? `text-shadow:7px 7px 0 ${w.hs};` : ''}}
h1{font-size:148px;line-height:.92}
h2{font-size:88px;line-height:.95}
mark{display:inline-block;background:${w.hi};color:${w.hiFg};padding:.07em .16em 0;line-height:.94;margin:.05em 0;transform:rotate(-2deg);border:5px solid ${INK};box-shadow:9px 9px 0 ${INK};text-shadow:none}
.kicker{font:700 28px/1.2 Mono,monospace;letter-spacing:.08em;text-transform:uppercase;margin-bottom:26px;color:${w.fg}}
.sub{font:500 42px/1.22 Grotesk;margin-top:34px;max-width:900px;color:${w.fg}}
.lead{font:500 40px/1.3 Grotesk;margin-top:28px;color:${w.fg}}
.deco{position:absolute;z-index:2;filter:drop-shadow(7px 7px 0 ${INK})}
.deco svg{width:100%;height:100%}
.sticker{position:absolute;z-index:6;filter:drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff) drop-shadow(9px 9px 0 ${INK})}
.card{background:${PAPER};color:${INK};border:5px solid ${INK};box-shadow:14px 14px 0 ${INK};padding:40px 44px;position:relative}
.card h2{color:${INK};text-shadow:none}
.card .kicker{color:${INK}}
.tape{position:absolute;width:170px;height:46px;background:${ACID}cc;border:2px solid ${INK}33;top:-24px;z-index:4}
.disc{border-radius:50%;border:5px solid ${INK};box-shadow:12px 12px 0 ${INK};position:absolute;
  background:conic-gradient(from 30deg,#ffffff00 0 40deg,#ffffff22 60deg,#ffffff00 80deg 220deg,#ffffff18 240deg,#ffffff00 260deg),
  repeating-radial-gradient(circle at center,#0d0d12 0 3px,#1d1e26 3px 5px);display:flex;align-items:center;justify-content:center}
.disc-label{width:36%;height:36%;border-radius:50%;border:4px solid ${INK};display:flex;align-items:center;justify-content:center;position:relative}
.disc-label::after{content:'';position:absolute;width:12%;height:12%;border-radius:50%;background:${INK}}
.disc-label span{font:400 22px/1 Bowlby;color:${INK};transform:translateY(-120%)}
.chips{display:flex;gap:14px;flex-wrap:wrap;margin-top:30px}
.chip{border:4px solid ${INK};background:${CREAM};color:${INK};font:700 28px/1 Grotesk;padding:12px 18px;box-shadow:5px 5px 0 ${INK}}
.btn{display:inline-block;background:${w.hi};color:${w.hiFg};border:5px solid ${INK};box-shadow:9px 9px 0 ${INK};font:400 38px/1 Bowlby;padding:24px 34px;text-transform:uppercase}
.src{font:400 22px/1.35 Mono,monospace;opacity:.7;margin-top:22px}
`;
}

// ---------- pieces ----------
function band(w, i, n, text) {
  const words = text || w.bandText;
  const unit = words.map((t) => `<span>${esc(t)}<i>★</i></span>`).join('');
  // One long ribbon laid across all slides; each slide shows its own window, so it flows on swipe.
  return `<div class="band" style="left:${-i * 1080}px;width:${n * 1080 + 200}px">${unit.repeat(Math.ceil((n * 1080) / 500) + 2)}</div>`;
}
function pads(w, i, n) {
  if (n <= 1) return '<span class="swipe">CATSCANDANCE.COM</span>';
  return `<div class="pads">${i === 0 ? '<span class="swipe">SWIPE</span>' : ''}${Array.from({ length: n }, (_, k) =>
    `<div class="pad ${k < i ? 'on' : ''} ${k === i ? 'now' : ''}"></div>`).join('')}</div>`;
}

// ---------- slide types ----------
const T = {
  // Generic cover; worlds add their own props.
  cover(s, w, c) {
    const props = (PROPS[c.bucket] || (() => ''))(s, w, c);
    return { body: `<div style="max-width:${s.wide ? 968 : 640}px">${s.kicker ? `<div class="kicker">${esc(s.kicker)}</div>` : ''}<h1>${rich(s.title)}</h1>${s.sub ? `<div class="sub" style="max-width:${s.wide ? 900 : 620}px">${rich(s.sub)}</div>` : ''}</div>`, over: props };
  },
  text(s, w) {
    return { body: `<div>${s.kicker ? `<div class="kicker">${esc(s.kicker)}</div>` : ''}<h2>${rich(s.heading)}</h2>${(s.paras || []).map((p) => `<p class="lead">${rich(p)}</p>`).join('')}</div>`,
      over: star(900, 190, 110, w.hi === INK ? RED : w.hi, 14) };
  },
  cta(s, w) {
    return { body: `<div style="max-width:760px"><h1 style="font-size:132px">${rich(s.heading)}</h1>${s.body ? `<div class="sub" style="max-width:700px">${rich(s.body)}</div>` : ''}${s.action ? `<div style="margin-top:50px"><span class="btn">${esc(s.action)}</span></div>` : ''}</div>`,
      over: sticker(s.cat || 'cat-cap.png', 760, 560, 270, 6) + star(860, 200, 120, ACID, -12) };
  },
  // DISCOVER: a record sleeve with the disc sliding out.
  sleeve(s, w, c) {
    const cols = [BLUE, RED, INK, ORANGE, '#7c3aed'];
    const col = s.color || cols[(Number(s.n) - 1) % cols.length];
    const discCol = [ACID, CREAM, ACID, PINK, ACID][(Number(s.n) - 1) % 5];
    const sz = 540;
    return { body: `
<div style="position:relative;height:${sz + 20}px">
  ${disc(sz - 30, discCol, `left:${sz - 250}px;top:15px`, 'CCD')}
  <div style="position:absolute;left:0;top:0;width:${sz}px;height:${sz}px;background:${col};border:5px solid ${INK};box-shadow:14px 14px 0 ${INK};padding:34px;display:flex;flex-direction:column;justify-content:space-between;transform:rotate(-1.5deg);
     background-image:radial-gradient(#ffffff22 2px,transparent 2.2px);background-size:26px 26px">
    <div style="display:flex;justify-content:space-between;font:700 24px/1 Mono;color:${CREAM};letter-spacing:.08em"><span>NO. ${String(s.n).padStart(2, '0')}</span><span>${esc(s.format || '')}</span></div>
    <div id="fitname" style="font:400 92px/.9 Bowlby;color:${CREAM};text-transform:uppercase;text-shadow:6px 6px 0 ${INK};white-space:normal;word-break:keep-all;overflow-wrap:normal">${esc(s.artist)}</div>
    <div style="background:${CREAM};color:${INK};border:4px solid ${INK};font:700 30px/1.15 Mono;padding:12px 16px;align-self:flex-start;max-width:100%">${esc(s.title)}</div>
  </div>
</div>
<div class="card" style="margin-top:40px;padding:30px 36px">
  <div style="display:flex;gap:26px;font:700 24px/1.3 Mono;letter-spacing:.04em;text-transform:uppercase;flex-wrap:wrap">
    <span>${esc(s.label || '')}</span><span>/</span><span>${esc(s.date || '')}</span><span>/</span><span>${esc(s.origin || '')}</span></div>
  <p style="font:500 32px/1.3 Grotesk;margin-top:18px">${rich(s.sound)}</p>
  <p style="font:700 30px/1.3 Grotesk;margin-top:12px">${rich(s.why)}</p>
</div>`, fit: '#fitname' };
  },
  // ARTIST cover
  artist(s, w) {
    const photo = s.photo ? `<div style="position:absolute;right:56px;top:190px;width:400px;height:500px;border:6px solid ${INK};box-shadow:14px 14px 0 ${ACID};transform:rotate(3deg);background:url('${s.photo}') center/cover;z-index:2"></div><div class="tape" style="right:180px;top:170px;transform:rotate(-6deg);z-index:7"></div>` : '';
    return { body: `<div style="max-width:${s.photo ? 560 : 968}px">${s.kicker ? `<div class="kicker">${esc(s.kicker)}</div>` : ''}<h1 style="font-size:${s.photo ? 120 : 170}px">${rich(s.name)}</h1>
      ${s.line ? `<div class="sub" style="font:700 30px/1.35 Mono;letter-spacing:.02em">${esc(s.line)}</div>` : ''}
      ${s.tags ? `<div class="chips">${s.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}</div>`,
      over: photo + (s.photo ? '' : disc(560, ACID, 'right:-200px;top:560px;z-index:1', 'PLAY')) + star(830, 170, 120, RED, 10) };
  },
  // Liner notes: facts as a tracklist on paper.
  liner(s, w) {
    return { body: `<div class="card" style="padding:44px 48px">
      <div class="tape" style="left:60px;transform:rotate(-4deg)"></div><div class="tape" style="right:60px;transform:rotate(5deg);background:${PINK}cc"></div>
      <div class="kicker">${esc(s.kicker || 'Liner notes')}</div><h2 style="font-size:${s.hsize || 76}px">${rich(s.heading)}</h2>
      <div style="margin-top:24px">${s.rows.map((r) => `<div style="display:grid;grid-template-columns:150px 1fr;gap:20px;border-top:3px solid ${INK};padding:18px 0;align-items:baseline">
        <span style="font:700 26px/1.2 Mono;letter-spacing:.06em">${esc(r[0])}</span><span style="font:500 34px/1.28 Grotesk">${rich(r[1])}</span></div>`).join('')}</div>
      ${s.source ? `<div class="src">Source: ${esc(s.source)}</div>` : ''}</div>` };
  },
  // LABEL: the centre label of a record.
  record(s, w) {
    const R = 300;
    const svg = `<svg viewBox="0 0 700 700" width="700" height="700"><defs><path id="arc" d="M350,350 m-${R - 40},0 a${R - 40},${R - 40} 0 1,1 ${2 * (R - 40)},0"/><path id="arc2" d="M350,350 m-${R - 40},0 a${R - 40},${R - 40} 0 0,0 ${2 * (R - 40)},0"/></defs>
      <circle cx="350" cy="350" r="${R}" fill="${s.color || ACID}" stroke="${INK}" stroke-width="8"/>
      <circle cx="350" cy="350" r="${R - 80}" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="6 10"/>
      <text style="font:400 46px Bowlby;letter-spacing:4px" fill="${INK}"><textPath href="#arc" startOffset="50%" text-anchor="middle">${esc(s.name.toUpperCase())}</textPath></text>
      <text style="font:700 26px Mono;letter-spacing:5px" fill="${INK}"><textPath href="#arc2" startOffset="50%" text-anchor="middle">${esc(s.ring || '')}</textPath></text>
      <circle cx="350" cy="350" r="22" fill="${INK}"/>
      <text x="350" y="300" text-anchor="middle" style="font:700 30px Mono;letter-spacing:3px" fill="${INK}">${esc(s.est || '')}</text>
      <text x="350" y="430" text-anchor="middle" style="font:700 30px Mono;letter-spacing:3px" fill="${INK}">${esc(s.city || '')}</text></svg>`;
    return { body: `<div style="align-self:flex-start;margin-top:-10px"><div class="kicker">${esc(s.kicker || 'Label we love')}</div></div>`, bodyStyle: 'justify-content:flex-start',
      over: `<div style="position:absolute;left:80px;top:250px;width:920px;height:920px;z-index:2">${disc(920, 'transparent', 'left:0;top:0')}<div style="position:absolute;left:110px;top:110px">${svg}</div></div>` + star(880, 170, 120, ACID, 12) };
  },
  // NEWS
  masthead(s, w) {
    return { body: `<div><div style="border-top:8px solid ${INK};border-bottom:3px solid ${INK};padding:16px 0 10px;display:flex;justify-content:space-between;font:700 24px/1 Mono;letter-spacing:.06em"><span>${esc(s.issue || '')}</span><span>${esc(s.date || '')}</span></div>
      <h1 style="font-size:176px;margin-top:20px;max-width:700px">Scene<br><mark>wire</mark></h1>
      <div style="margin-top:36px">${(s.items || []).map((t, k) => `<div style="display:flex;gap:22px;align-items:baseline;border-top:3px solid ${INK};padding:16px 0">
        <span style="font:400 44px/1 Bowlby;color:${RED}">${k + 1}</span><span style="font:700 32px/1.25 Grotesk">${esc(t)}</span></div>`).join('')}</div></div>`,
      over: sticker('boombox.png', 790, 360, 210, 8) };
  },
  news(s, w) {
    return { body: `<div class="card">
      <div style="position:absolute;right:-26px;top:-34px;background:${RED};color:${CREAM};border:5px solid ${INK};box-shadow:7px 7px 0 ${INK};font:700 26px/1 Mono;letter-spacing:.06em;padding:14px 18px;transform:rotate(4deg)">${esc(s.date || '')}</div>
      <div class="kicker" style="color:${RED}">${esc(s.tag || '')}</div><h2 style="font-size:${s.hsize || 80}px">${rich(s.headline)}</h2>
      <p style="font:500 36px/1.32 Grotesk;margin-top:26px">${rich(s.body)}</p>${s.source ? `<div class="src">Source: ${esc(s.source)}</div>` : ''}</div>` };
  },
  // LEARN: the instrument.
  step(s, w, c) {
    const lit = Math.max(1, Math.round(((c.i) / Math.max(1, c.n - 1)) * 16));
    const seq = Array.from({ length: 16 }, (_, k) => `<div style="flex:1;height:34px;border:3px solid #000;border-radius:6px;background:${k < lit ? (k % 4 === 0 ? ACID : '#3f6212') : '#1f2937'};box-shadow:${k < lit && k % 4 === 0 ? `0 0 14px ${ACID}` : 'none'}"></div>`).join('');
    return { body: `<div>
      <h2 style="font-size:${s.hsize || 84}px">${rich(s.heading)}</h2>${s.body ? `<p class="lead" style="font-size:37px">${rich(s.body)}</p>` : ''}
      <div style="margin-top:34px;background:#0b1220;border:5px solid ${INK};border-radius:26px;box-shadow:14px 14px 0 ${INK};padding:26px 30px 28px;position:relative">
        ${['left:14px;top:14px', 'right:14px;top:14px', 'left:14px;bottom:14px', 'right:14px;bottom:14px'].map((p) => `<div style="position:absolute;${p};width:16px;height:16px;border-radius:50%;background:#64748b;border:2px solid #000"></div>`).join('')}
        <div style="display:flex;justify-content:space-between;align-items:center;background:#0f1d07;border:4px solid #000;border-radius:10px;padding:14px 20px;font:700 26px/1 Mono;color:${ACID};letter-spacing:.08em;text-shadow:0 0 10px ${ACID}88">
          <span>STEP ${esc(s.n)}${s.of ? '/' + esc(s.of) : ''}</span><span>${esc(s.lcd || '')}</span></div>
        ${s.diagram ? `<div style="margin-top:20px;border:4px solid #000;border-radius:10px;overflow:hidden">${s.diagram.replace('<svg ', '<svg style="display:block;width:100%;height:auto" ')}</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:20px">${seq}</div>
      </div></div>` };
  },
  // NIGHTS: the ticket.
  ticket(s, w) {
    return { body: `<div style="position:relative;display:flex;height:640px;filter:drop-shadow(14px 14px 0 ${INK})">
      <div style="flex:1;background:${CREAM};border:5px solid ${INK};border-right:none;padding:40px 44px;display:flex;flex-direction:column;justify-content:space-between;color:${INK};
        -webkit-mask:radial-gradient(circle 34px at 100% 0,#0000 98%,#000) top/100% 51% no-repeat,radial-gradient(circle 34px at 100% 100%,#0000 98%,#000) bottom/100% 51% no-repeat">
        <div style="display:flex;justify-content:space-between;font:700 26px/1 Mono;letter-spacing:.08em"><span>CATS CAN DANCE</span><span>${esc(s.series || 'EPISODE')}</span></div>
        <div><div style="font:400 300px/.8 Bowlby;color:${RED};text-shadow:9px 9px 0 ${INK}">${esc(s.big)}</div></div>
        <div><div style="font:400 64px/1 Bowlby;text-transform:uppercase">${rich(s.line1 || '')}</div><div style="font:700 32px/1.3 Mono;margin-top:14px">${esc(s.line2 || '')}</div></div>
      </div>
      <div style="width:250px;background:${ACID};border:5px solid ${INK};border-left:6px dashed ${INK};display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:30px 10px;
        -webkit-mask:radial-gradient(circle 34px at 0 0,#0000 98%,#000) top/100% 51% no-repeat,radial-gradient(circle 34px at 0 100%,#0000 98%,#000) bottom/100% 51% no-repeat">
        <div style="writing-mode:vertical-rl;transform:rotate(180deg);font:400 42px/1 Bowlby;max-height:330px;color:${INK};letter-spacing:.02em">${esc(s.stub || 'ADMIT ONE CAT')}</div>
        <div>${barcode(s.big + (s.line2 || ''), 110, 200)}</div>
      </div></div>${s.sub ? `<div class="sub" style="margin-top:44px">${rich(s.sub)}</div>` : ''}`,
      over: sticker('disco-ball.png', 760, 110, 170, 0, 'filter:drop-shadow(8px 8px 0 #000)') };
  },
  // BUILD: terminal log.
  log(s, w) {
    return { body: `<div>${s.kicker ? `<div class="kicker">${esc(s.kicker)}</div>` : ''}<h2>${rich(s.heading)}</h2>
      <div style="margin-top:36px;background:${INK};border:5px solid ${INK};box-shadow:14px 14px 0 ${ORANGE};padding:0 0 30px;position:relative">
        <div class="tape" style="left:50%;margin-left:-85px;background:${ORANGE}cc"></div>
        <div style="display:flex;gap:10px;padding:16px 20px;border-bottom:3px solid #1e293b">${[RED, ORANGE, ACID].map((col) => `<span style="width:20px;height:20px;border-radius:50%;background:${col}"></span>`).join('')}<span style="font:700 20px/20px Mono;color:#64748b;margin-left:12px">ccd/build.log</span></div>
        ${s.lines.map((l) => `<div style="font:700 30px/1.4 Mono;color:${ACID};padding:8px 30px 0"><span style="color:${ORANGE}">&gt;</span> ${esc(l)}</div>`).join('')}
        <div style="margin:10px 30px 0;width:18px;height:34px;background:${ACID}"></div>
      </div></div>` };
  },
};

// Cover props per world.
const PROPS = {
  discover: (s) => {
    const sl = (x, y, r, col, dc) => `<div style="position:absolute;left:${x}px;top:${y}px;transform:rotate(${r}deg);width:300px;height:300px;z-index:2">
      ${disc(270, dc, 'left:120px;top:15px', 'CCD')}<div style="position:absolute;inset:0;background:${col};border:5px solid ${INK};box-shadow:10px 10px 0 ${INK};background-image:radial-gradient(#ffffff22 2px,transparent 2.2px);background-size:22px 22px"></div></div>`;
    return sl(640, 560, -8, BLUE, CREAM) + sl(600, 760, 6, RED, ACID) + sticker(s.cat || 'cat-raver.png', 760, 160, 250, 8) + star(560, 210, 90, RED, -10);
  },
  learn: (s) => sticker(s.cat || 'cat-dj-hero.png', 650, 560, 380, 4) + `<div style="position:absolute;left:600px;top:940px;width:420px;height:70px;background:#0b1220;border:5px solid ${INK};border-radius:16px;box-shadow:10px 10px 0 ${INK};z-index:5;display:flex;gap:8px;padding:14px">${Array.from({ length: 8 }, (_, k) => `<div style="flex:1;border-radius:4px;background:${k % 4 === 0 ? ACID : '#3f6212'}"></div>`).join('')}</div>` + star(860, 190, 100, BLUE, 12),
  artist: () => star(860, 180, 120, RED, 12),
  nights: (s) => sticker(s.cat || 'cat-dancer.png', 690, 600, 340, 6) + sticker('disco-ball.png', 790, 120, 170, 0),
  build: (s) => sticker(s.cat || 'cat-streetwear.png', 690, 580, 330, 5) + `<div class="tape" style="left:600px;top:540px;width:240px;background:${ORANGE}cc;transform:rotate(-8deg);z-index:7"></div>`,
  news: () => sticker('boombox.png', 760, 600, 260, 6),
  label: () => '',
  product: (s) => sticker(s.cat || 'cat-headphones.png', 720, 600, 300, 6),
};

function page(post, s, i, n) {
  const w = { ...W[post.bucket] };
  const c = { i, n, bucket: post.bucket, post };
  const r = T[s.type](s, w, c);
  const grid = post.bucket === 'build' ? 'grid' : '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css(w)}${s.css || ''}</style></head>
<body class="${grid}"><div class="noise"></div>
<div class="top"><span class="stamp">${esc(post.label || w.label)}</span><span class="code">${esc(post.num || '')}</span></div>
<div class="body" id="fit" style="${r.bodyStyle || ''}">${r.body}</div>
${r.over || ''}
${band(w, i, n, post.band)}
<div class="foot"><div class="brand"><img src="${A('ccd-logo-round.png')}"><div><b>CATS CAN DANCE</b><small>@CATSCAN.DANCE</small></div></div>${pads(w, i, n)}</div>
<script>
(function(){
  function shrink(box, el, min){ if(!el) return; let s=parseFloat(getComputedStyle(el).fontSize), k=0;
    while((box.scrollHeight>box.clientHeight+2 || el.scrollWidth>el.clientWidth+2) && s>min && k<90){ s-=3; el.style.fontSize=s+'px'; k++; } }
  const b=document.getElementById('fit'); shrink(b, b.querySelector('h1,h2'), 44);
  ${r.fit ? `const f=document.querySelector('${r.fit}'); if(f){ let s=parseFloat(getComputedStyle(f).fontSize),k=0; while((f.scrollHeight>300||f.scrollWidth>f.clientWidth+2)&&s>40&&k<60){s-=3;f.style.fontSize=s+'px';k++;} }` : ''}
})();
</script></body></html>`;
}

export async function render(posts, outDir) {
  const browser = await chromium.launch();
  const pg = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const results = {};
  for (const post of posts) {
    const dir = path.join(outDir, post.id);
    fs.mkdirSync(dir, { recursive: true });
    results[post.id] = [];
    for (let i = 0; i < post.slides.length; i++) {
      const f = path.join(dir, `${String(i + 1).padStart(2, '0')}.html`);
      fs.writeFileSync(f, page(post, post.slides[i], i, post.slides.length));
      await pg.goto('file://' + f);
      await pg.evaluate(() => document.fonts.ready);
      await pg.waitForTimeout(60);
      const out = f.replace(/\.html$/, '.jpg');
      await pg.screenshot({ path: out, type: 'jpeg', quality: 92 });
      fs.unlinkSync(f);
      results[post.id].push(out);
    }
  }
  await browser.close();
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const posts = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  render(Array.isArray(posts) ? posts : [posts], process.argv[3] || path.join(here, 'out')).then((r) => console.log(JSON.stringify(r, null, 1)));
}
