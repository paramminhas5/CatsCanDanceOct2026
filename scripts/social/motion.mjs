// CCD motion renderer: records an HTML page's CSS/Web animations frame by frame into an MP4.
// The page must use CSS animations or the Web Animations API; every frame we pause all animations
// and seek them to the exact time, so output is frame-accurate and repeatable.
// Usage: node motion.mjs page.html out.mp4 [seconds=7.74] [w=1080] [h=1920] [fps=30] [audio.(mp3|wav)]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(execFileSync('npm', ['root', '-g']).toString().trim() + '/playwright'));
}

export async function record(htmlPath, outPath, { seconds = 7.74, w = 1080, h = 1920, fps = 30, audio = null } = {}) {
  const frames = Math.round(seconds * fps);
  const dir = fs.mkdtempSync('/tmp/ccd-frames-');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(htmlPath));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  for (let f = 0; f < frames; f++) {
    const t = (f / fps) * 1000;
    await page.evaluate((t) => {
      for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; }
      window.__t && window.__t(t);
    }, t);
    await page.screenshot({ path: path.join(dir, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
  }
  await browser.close();
  const args = ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%05d.jpg')];
  if (audio) args.push('-i', audio, '-shortest', '-c:a', 'aac', '-b:a', '192k');
  args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outPath);
  execFileSync('ffmpeg', args);
  fs.rmSync(dir, { recursive: true, force: true });
  return outPath;
}

if (process.argv[1] && process.argv[1].endsWith('motion.mjs')) {
  const [, , html, out, s, w, h, fps, audio] = process.argv;
  record(html, out, { seconds: Number(s || 7.74), w: Number(w || 1080), h: Number(h || 1920), fps: Number(fps || 30), audio: audio || null })
    .then((p) => console.log(p));
}
