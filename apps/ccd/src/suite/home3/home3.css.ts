/** Styles for the v3 home (canvas board Main). Scoped under .h3; the switch reuses .k-switch from the kit. */

// One keyframe set per number of story steps: each step is lit for 1/n of the loop.
const frames = [1, 2, 3, 4, 5].map((n) => {
  const on = (100 / n - 1).toFixed(2), off = (100 / n + 1).toFixed(2), bar = (100 / n).toFixed(2), bar2 = (100 / n + 0.1).toFixed(2);
  return n === 1 ? "" : `
@keyframes h3s${n}{0%,${on}%{opacity:1}${off}%,99%{opacity:0}100%{opacity:1}}
@keyframes h3h${n}{0%,${on}%{background:#1d1d22;transform:translateY(-4px)}${off}%,100%{background:var(--k-raised);transform:none}}
@keyframes h3b${n}{0%{transform:scaleX(0)}${bar}%{transform:scaleX(1)}${bar2}%,100%{transform:scaleX(0)}}
.h3-story.n${n} .h3-shot{animation:h3s${n} var(--dur) infinite}
.h3-story.n${n} .h3-step{animation:h3h${n} var(--dur) infinite}
.h3-story.n${n} .h3-bar{animation:h3b${n} var(--dur) linear infinite}`;
}).join("");

export const CSS = `
.h3{--w:1360px;overflow-x:clip}
.h3-ring.h2x{background:transparent;overflow:visible}
.h3 section{max-width:var(--w);margin:0 auto;padding-left:24px;padding-right:24px}
.h3 h1,.h3 h2{font-family:var(--k-display);font-weight:800;letter-spacing:-.025em;line-height:.95;margin:0;color:var(--k-tx)}
.h3-eye{font-family:var(--k-mono);font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.h3-switch{margin:0 auto}
.h3-switch button{appearance:none;border:0;cursor:pointer;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border-radius:999px;background:transparent;color:var(--k-t2);font:600 15px var(--k-ui);white-space:nowrap;transition:background .25s,color .25s}
.h3-switch button:hover{color:var(--k-tx);background:rgba(255,255,255,.06)}
.h3-switch button i{width:9px;height:9px;border-radius:50%;background:var(--c)}
.h3-switch button small{font:500 10px var(--k-mono);letter-spacing:.08em;text-transform:uppercase;opacity:.6}
.h3-s{display:none}
@media (max-width:560px){.h3-v{display:none}.h3-s{display:inline}.h3-switch button i{display:none}}
.h3-switch button[aria-pressed=true]{background:var(--c);color:var(--on)}
.h3-switch button[aria-pressed=true] i{background:var(--on)}
@media (max-width:1000px){.h3-switch{overflow-x:auto;max-width:100%;order:3;flex-basis:100%;scrollbar-width:none}.h3-switch button small{display:none}.h3-switch button{flex:1;padding:0 10px;font-size:14px}.k-nav__row:has(.h3-switch){flex-wrap:wrap;height:auto;padding-top:10px;padding-bottom:10px;row-gap:10px}.h3-acct{margin-left:auto}}

.h3-hero{padding-top:64px;padding-bottom:24px;animation:h3in .5s var(--k-ease) both}
@keyframes h3in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.h3-hero--go{display:flex;flex-direction:column;gap:8px}
.h3-hero--go{padding-top:40px}
.h3-hero--go .h3-copy{max-width:1120px;gap:18px}
.h3-hero--go .h3-copy h1{font-size:clamp(44px,6vw,84px)}
.h3-hero--go .h3-copy p{max-width:62ch}
.h3-split{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:48px;align-items:center}
@media (max-width:900px){.h3-split{grid-template-columns:1fr}}
.h3-copy{display:flex;flex-direction:column;gap:22px}
.h3-copy h1{font-size:clamp(48px,7vw,88px)}
.h3-copy p{margin:0;font-size:20px;line-height:1.5;color:var(--k-t2);max-width:34ch}
.h3-btns{display:flex;gap:12px;flex-wrap:wrap}
.h3-key,.h3-ghost{display:inline-flex;align-items:center;min-height:52px;padding:0 24px;border-radius:999px;font:600 16px var(--k-ui);text-decoration:none}
.h3-key{background:var(--acc);color:var(--acc-on)}
.h3-ghost{background:var(--k-raised);color:var(--k-tx)}
.h3-ring{margin-top:8px}

.h3-wall{position:relative;height:560px;overflow:hidden;border-radius:28px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;-webkit-mask-image:linear-gradient(transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(transparent,#000 12%,#000 88%,transparent)}
.h3-col{display:flex;flex-direction:column;gap:14px;animation:h3up 40s linear infinite}
.h3-col.rev{animation-direction:reverse;animation-duration:52s}
.h3-col a{position:relative;display:block;border-radius:12px;overflow:hidden}
.h3-col img{display:block;width:100%;aspect-ratio:1;object-fit:cover;background:var(--k-raised)}
.h3-col span{position:absolute;left:8px;bottom:8px;padding:4px 8px;border-radius:999px;background:rgba(0,0,0,.6);font-size:12px;font-weight:600;color:#fff}
@keyframes h3up{to{transform:translateY(-50%)}}

.h3-pop{position:relative;height:600px;display:flex;justify-content:center;align-items:center}
.h3-chip{position:absolute;display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:16px;background:var(--k-paper);color:var(--k-ink);font:600 15px var(--k-ui);box-shadow:0 20px 40px rgba(0,0,0,.4);opacity:0;animation:h3pop 8s infinite}
.h3-chip i{width:12px;height:12px;border-radius:50%}
@keyframes h3pop{0%{opacity:0;transform:translateY(14px) scale(.96)}8%,85%{opacity:1;transform:none}95%,100%{opacity:0;transform:translateY(-8px)}}
.h3-ex{position:absolute;right:0;bottom:0;font:500 11px var(--k-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--k-example)}

.h3-learn{display:flex;flex-direction:column;gap:20px;align-items:center}
.h3-keys{display:flex;gap:6px;width:100%;max-width:620px}
.h3-keys span{flex:1;height:200px;background:var(--k-paper);border-radius:0 0 10px 10px;animation:h3key 3.2s infinite}
@keyframes h3key{0%,8%{background:#ff4d8d;transform:translateY(4px)}14%,100%{background:var(--k-paper);transform:none}}

.h3-phone{position:relative;width:300px;height:620px;border-radius:44px;background:#111;padding:10px;box-shadow:0 40px 90px rgba(0,0,0,.6),inset 0 0 0 1px rgba(255,255,255,.12);flex-shrink:0}
.h3-phone>div{position:relative;width:100%;height:100%;border-radius:34px;overflow:hidden;background:#000}
.h3-phone img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top}
.h3-phone--s{width:250px;height:520px}

.h3-tick{overflow:hidden;border-top:1px solid var(--k-hair);border-bottom:1px solid var(--k-hair);padding:16px 0;font:500 13px var(--k-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--k-t2)}
.h3-tick>div{display:flex;width:max-content;animation:h3tick 70s linear infinite}
.h3-tick span{display:flex;gap:40px;padding-right:40px;white-space:nowrap}
.h3-tick b{color:#2563eb;margin-right:8px}
.h3-tick em{font-style:normal}
@keyframes h3tick{to{transform:translateX(-50%)}}

.h3-story{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:64px;align-items:center;padding-top:120px;padding-bottom:120px}
@media (max-width:900px){.h3-story{grid-template-columns:1fr;gap:40px}.h3-story .h3-phone{justify-self:center}.h3-steps{grid-template-columns:1fr 1fr !important}}
.h3-story-copy{display:flex;flex-direction:column;gap:32px}
.h3-story h2{font-size:clamp(40px,5vw,64px)}
.h3-steps{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.h3-step{position:relative;display:flex;flex-direction:column;gap:8px;padding:22px 22px 26px;border-radius:20px;background:var(--k-raised);overflow:hidden}
.h3-step b{font-family:var(--k-display);font-size:24px;font-weight:800;letter-spacing:-.02em;color:var(--k-tx)}
.h3-step>span:not(.h3-n){color:var(--k-t2);line-height:1.45}
.h3-n{font:500 12px var(--k-mono);color:var(--acc)}
.h3-bar{position:absolute;left:0;bottom:0;height:4px;width:100%;transform-origin:left;transform:scaleX(0);background:var(--acc)}
.h3-story.one .h3-steps{grid-template-columns:1fr !important;max-width:520px}
${frames}
@media (prefers-reduced-motion:reduce){.h3 *{animation:none !important}.h3-shot:not(:first-child){opacity:0}}

.h3-ep{padding-bottom:40px}
.h3-ep-card{display:grid;gap:6px;padding:28px 32px;border-radius:28px;background:var(--k-paper);color:var(--k-ink);text-decoration:none;position:relative}
.h3-ep-card b{font-family:var(--k-display);font-size:clamp(32px,4vw,52px);font-weight:800;letter-spacing:-.02em;line-height:1}
.h3-ep-card .h3-eye{color:#5d5a52}
.h3-ep-go{justify-self:start;margin-top:10px;padding:12px 20px;border-radius:999px;background:var(--k-ink);color:var(--k-paper);font-weight:600}

.h3-suite{padding-top:40px;padding-bottom:120px}
.h3-suite>*{background:var(--k-raised)}
.h3-suite-head{display:flex;flex-wrap:wrap;gap:24px;justify-content:space-between;align-items:end;padding:56px 56px 0;border-radius:32px 32px 0 0}
.h3-suite-head h2{font-size:clamp(36px,4.4vw,56px);max-width:16ch}
.h3-suite-head p{margin:0;max-width:44ch;color:var(--k-t2);font-size:18px;line-height:1.5}
.h3-wire{display:flex;align-items:center;padding:40px 56px}
.h3-wire b{width:16px;height:16px;border-radius:50%;box-shadow:0 0 0 6px rgba(255,255,255,.04);flex-shrink:0}
.h3-wire i{flex:1;height:2px;background:linear-gradient(90deg,rgba(255,255,255,.08),rgba(255,255,255,.3),rgba(255,255,255,.08));background-size:200% 100%;animation:h3wire 3s linear infinite}
@keyframes h3wire{to{background-position:-200% 0}}
.h3-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;padding:0 56px 56px;border-radius:0 0 32px 32px}
@media (max-width:900px){.h3-cards{grid-template-columns:1fr 1fr;padding:0 20px 20px}.h3-suite-head{padding:28px 20px 0}.h3-wire{padding:28px 20px}}
.h3-card{appearance:none;border:0;cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:10px;padding:28px;border-radius:24px;background:var(--k-base);color:var(--k-tx);font:inherit;transition:transform .2s,box-shadow .2s}
.h3-card:hover{transform:translateY(-4px)}
.h3-card[aria-pressed=true]{box-shadow:inset 0 0 0 2px var(--c)}
.h3-card b{font-family:var(--k-display);font-size:30px;font-weight:800;letter-spacing:-.02em}
.h3-card>span:last-child{color:var(--k-t2);line-height:1.45}

.h3-week{padding-bottom:120px;display:flex;flex-direction:column;gap:28px}
.h3-week-head{display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap}
.h3-week-head h2{font-size:clamp(36px,4.4vw,56px)}
.h3-week-head a{color:var(--k-tx);font-weight:600}
.h3-nights{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
@media (max-width:1000px){.h3-nights{grid-template-columns:repeat(2,minmax(0,1fr))}}
.h3-night{display:flex;flex-direction:column;gap:8px;color:var(--k-tx);text-decoration:none}
.h3-night img,.h3-made{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:14px;overflow:hidden;background:var(--k-raised)}
.h3-made svg{width:100%;height:100%}
.h3-night b{font-size:17px;line-height:1.2}
.h3-night>span:last-child{color:var(--k-t3);font-size:14px}
`;
