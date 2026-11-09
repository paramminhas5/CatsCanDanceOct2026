/** Styles for the home (Home2, Carousel3D, AppStage). Responsive by layout, not by zoom, so nothing is cut. */
export const CSS = `
.h2x{--bg:#0A0A0B;--tx:#F2F0EB;--t2:rgba(242,240,235,.66);--t3:rgba(242,240,235,.42);--hair:rgba(255,255,255,.08);--hair2:rgba(255,255,255,.14);--blue:#2563EB;
  background:var(--bg);color:var(--tx);font-family:var(--font-outfit),Outfit,system-ui,sans-serif;overflow-x:clip}
.h2x h1,.h2x h2,.h2x h3{font-family:var(--font-bricolage),'Bricolage Grotesque',sans-serif;font-weight:700;letter-spacing:-.035em;line-height:.95;margin:0}
.h2x a{color:inherit;text-decoration:none}
.h2x section{padding:clamp(72px,10vw,140px) clamp(16px,4.5vw,64px) 0;max-width:1440px;margin:0 auto;box-sizing:border-box}
.h2-head{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px 32px;margin-bottom:clamp(24px,3vw,40px)}
.h2-head h2{font-size:clamp(40px,5.4vw,72px);flex:1 1 420px}
.h2-head p{color:var(--t2);font-size:clamp(16px,1.3vw,19px);max-width:520px;margin:0;line-height:1.45}
.h2-eye{font-family:var(--font-mono),'JetBrains Mono',monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--t3)}
.h2-btns{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.h2-key{display:inline-flex;align-items:center;height:56px;padding:0 26px;border-radius:28px;font-weight:600;font-size:16px;color:#fff;background:radial-gradient(80% 140% at 50% 0%,#5b8af5 0%,var(--blue) 55%);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.45),0 2px 0 #1d4ed8,0 4px 0 #1e3a8a,0 16px 30px -10px rgba(37,99,235,.6);transition:transform .15s}
.h2-key:active{transform:translateY(3px)}
.h2-key.lime{color:#0A0A0B;background:radial-gradient(80% 140% at 50% 0%,#d8ff7a 0%,#B6EF36 55%);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.5),0 2px 0 #8fc21f,0 4px 0 #6d9614,0 16px 30px -10px rgba(182,239,54,.5)}
.h2-ghost{display:inline-flex;align-items:center;height:56px;padding:0 24px;border-radius:28px;font-weight:600;font-size:16px;background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px var(--hair2)}

/* hero */
.h2-hero{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,.75fr);gap:40px;align-items:center;padding-top:clamp(48px,7vw,96px)!important}
.h2-hero h1{font-size:clamp(52px,8.2vw,124px);margin-top:18px}
.h2-hero h1 em{font-style:normal;color:var(--blue)}
.h2-hero p{font-size:clamp(17px,1.45vw,21px);color:var(--t2);max-width:640px;line-height:1.45;margin:26px 0 0}
.h2-hero-side{position:relative;display:flex;flex-direction:column;align-items:center;gap:24px}
.h2-cat{width:min(300px,70%);animation:h2-bob 1.9s ease-in-out infinite;filter:drop-shadow(0 30px 40px rgba(37,99,235,.35))}
.h2-read{display:grid;grid-template-columns:repeat(3,1fr);width:100%;max-width:420px;border-radius:20px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.03));box-shadow:inset 0 1px 0 rgba(255,255,255,.1),inset 0 0 0 1px var(--hair)}
.h2-read span{display:flex;flex-direction:column;gap:6px;padding:16px 18px;font-family:var(--font-mono),monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--t3)}
.h2-read span+span{border-left:1px solid var(--hair)}
.h2-read b{font-family:var(--font-bricolage),sans-serif;font-size:34px;letter-spacing:-.03em;color:var(--tx);font-weight:700}
@keyframes h2-bob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-14px) rotate(2deg)}}
@media (max-width:860px){.h2-hero{grid-template-columns:1fr}.h2-hero-side{flex-direction:row}.h2-cat{width:120px}}

/* 3D carousel */
.c3{position:relative;user-select:none}
.c3-stage{position:relative;perspective:1700px;perspective-origin:50% 42%;touch-action:pan-y;cursor:grab;overflow:visible}
.c3-stage:active{cursor:grabbing}
.c3-ring{position:absolute;left:50%;top:40px;width:var(--w);height:calc(var(--w) * 1.33);margin-left:calc(var(--w) / -2);transform-style:preserve-3d}
.c3-card{position:absolute;inset:0;transform-style:preserve-3d}
.c3-face{position:absolute;inset:0;padding:0;border:0;background:none;cursor:pointer;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.2,.8,.2,1);color:inherit;font:inherit;text-align:left}
.c3-card.front .c3-face{transform:translateZ(40px) scale(1.04)}
.c3-card.flip .c3-face{transform:translateZ(40px) rotateY(180deg) scale(1.04)}
.c3-front,.c3-back{position:absolute;inset:0;border-radius:18px;overflow:hidden;opacity:var(--o,1);transition:opacity .4s;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:0 30px 60px -24px #000,inset 0 0 0 1px rgba(255,255,255,.08)}
.c3-front{background:#16161A}
.c3-front img,.c3-made svg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.c3-front::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.18),transparent 32%),linear-gradient(180deg,transparent 70%,rgba(0,0,0,.5));pointer-events:none}
.c3-tag{position:absolute;z-index:2;left:12px;top:12px;height:26px;padding:0 10px;display:inline-flex;align-items:center;border-radius:13px;background:rgba(10,10,11,.6);backdrop-filter:blur(8px);font-size:12px;font-weight:700;color:#fff;text-transform:capitalize}
.c3-day{position:absolute;z-index:2;left:12px;bottom:12px;font-family:var(--font-mono),monospace;font-size:12px;letter-spacing:.06em;color:#fff;text-transform:uppercase;text-shadow:0 1px 6px rgba(0,0,0,.6)}
.c3-back{transform:rotateY(180deg);background:linear-gradient(160deg,#1d4ed8,#0b1b46);display:flex;flex-direction:column;gap:10px;padding:22px}
.c3-back b{font-family:var(--font-bricolage),sans-serif;font-size:30px;line-height:.95;letter-spacing:-.03em}
.c3-kick{font-family:var(--font-mono),monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.7)}
.c3-line{font-size:15px;font-weight:600}
.c3-where{font-size:14px;color:rgba(255,255,255,.75);margin-top:auto}
.c3-go{display:inline-flex;align-self:flex-start;height:40px;padding:0 18px;align-items:center;border-radius:20px;background:#fff;color:#0A0A0B;font-weight:700;font-size:14px}
.c3-floor{position:absolute;left:10%;right:10%;bottom:0;height:120px;background:radial-gradient(50% 60% at 50% 40%,rgba(37,99,235,.35),transparent 70%);filter:blur(10px);pointer-events:none}
.c3-bar{display:flex;align-items:center;gap:16px;max-width:760px;margin:10px auto 0;padding:12px 12px 12px 12px;border-radius:30px;background:rgba(22,22,26,.9);box-shadow:inset 0 0 0 1px var(--hair2)}
.c3-arrow{width:44px;height:44px;border-radius:22px;border:0;cursor:pointer;display:grid;place-items:center;background:rgba(255,255,255,.08);color:var(--tx);flex:none}
.c3-now{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.c3-now b{font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c3-now span:last-child{font-size:13px;color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c3-now .c3-kick{color:var(--t3)}
.c3-cta{height:44px;padding:0 20px;display:inline-flex;align-items:center;border-radius:22px;background:var(--blue);color:#fff!important;font-weight:700;font-size:14px;flex:none}
.c3-all{text-align:center;margin-top:16px}@media (max-width:640px){.c3-arrow{display:none}.c3-bar{margin:0 4px;padding-left:18px}.c3-now .c3-kick{display:none}}.c3-all a{font-weight:600;color:var(--t2)}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}

/* four apps */
.as-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.as-card{position:relative;display:flex;flex-direction:column;gap:6px;text-align:left;padding:18px 18px 20px;border-radius:20px;border:0;cursor:pointer;color:var(--tx);font:inherit;overflow:hidden;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px var(--hair);transition:background .3s,box-shadow .3s,transform .3s}
.as-card:hover{transform:translateY(-3px)}
.as-card.on{background:color-mix(in srgb,var(--c) 14%,#111113);box-shadow:inset 0 0 0 2px var(--c)}
.as-dot{width:8px;height:8px;border-radius:4px;background:var(--c);box-shadow:0 0 10px var(--c)}
.as-name{font-family:var(--font-mono),monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3)}
.as-card b{font-family:var(--font-bricolage),sans-serif;font-size:clamp(22px,2.2vw,30px);letter-spacing:-.03em;line-height:1}
.as-line{font-size:14px;color:var(--t2);line-height:1.35}
.as-run{position:absolute;left:0;bottom:0;height:3px;width:100%;background:var(--c);transform-origin:left;animation:as-run linear forwards}
@keyframes as-run{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.as-stage{margin-top:14px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(20px,4vw,64px);align-items:center;height:clamp(460px,calc(100svh - 250px),640px);scroll-margin-top:200px;padding:clamp(24px,4vw,56px);box-sizing:border-box;border-radius:28px;overflow:hidden;
  background:radial-gradient(70% 90% at 85% 15%,color-mix(in srgb,var(--ac) 55%,transparent),transparent 70%),color-mix(in srgb,var(--ac) 22%,#0d0d10);transition:background .6s}
.as-copy{animation:as-in .6s cubic-bezier(.2,.8,.2,1) both}
@keyframes as-in{from{opacity:.2;transform:translateY(14px)}}
.as-url{font-family:var(--font-mono),monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.7)}.as-url i{opacity:.4;font-style:normal}
.as-copy h3{font-size:clamp(52px,6.4vw,96px);margin-top:14px}
.as-copy p{font-size:clamp(16px,1.3vw,19px);line-height:1.45;color:rgba(255,255,255,.8);max-width:520px;margin:18px 0 0}
.as-btns{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
.as-key{display:inline-flex;align-items:center;height:52px;padding:0 24px;border-radius:26px;background:#F2F0EB;color:#0A0A0B!important;font-weight:700}
.as-ghost{display:inline-flex;align-items:center;height:52px;padding:0 20px;font-weight:600}
.as-facts{list-style:none;margin:26px 0 0;padding:0;max-width:420px}
.as-facts li{padding:11px 0;border-top:1px solid rgba(255,255,255,.14);font-size:15px;font-weight:500}
.as-demo{position:relative;height:100%;display:flex;align-items:center;justify-content:center;gap:28px}
.as-phone{position:relative;height:min(100%,600px);aspect-ratio:390/844;border-radius:42px;overflow:hidden;background:#000;box-shadow:0 0 0 10px #0b0b0d,0 0 0 11px rgba(255,255,255,.12),0 50px 80px -30px #000;transform:rotate(-2deg)}
.as-phone img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transform:scale(1.03);transition:opacity .55s,transform .8s cubic-bezier(.2,.8,.2,1)}
.as-phone img.on{opacity:1;transform:none}
.as-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;max-width:220px}
.as-steps button{display:flex;gap:10px;align-items:baseline;text-align:left;border:0;background:none;color:rgba(255,255,255,.5);font:inherit;font-size:15px;font-weight:600;cursor:pointer;padding:6px 0;transition:color .3s}
.as-steps button span{font-family:var(--font-mono),monospace;font-size:11px}
.as-steps button.on{color:#fff}.as-steps button.done{color:rgba(255,255,255,.75)}
.as-play{position:absolute;right:0;bottom:0;height:38px;padding:0 16px;border-radius:19px;border:0;cursor:pointer;background:rgba(0,0,0,.4);color:#fff;font:inherit;font-weight:600;font-size:13px}
@media (max-width:980px){.as-cards{grid-template-columns:repeat(2,1fr)}.as-stage{grid-template-columns:1fr;height:auto}.as-demo{height:560px}.as-steps{display:none}}
@media (max-width:560px){.as-demo{height:480px}}

/* story */
.h2-story-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(16px,2vw,28px)}
.h2-step{border-top:1px solid var(--hair2);padding-top:18px}
.h2-step-n{display:flex;align-items:center;gap:8px;font-family:var(--font-mono),monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3)}
.h2-step-n i{width:8px;height:8px;border-radius:4px}
.h2-step h3{font-size:clamp(24px,2.3vw,32px);margin-top:12px}
.h2-step p{color:var(--t2);font-size:15px;line-height:1.45;margin:10px 0 0;min-height:66px}
.h2-mini{margin-top:20px;aspect-ratio:390/600;border-radius:28px 28px 0 0;overflow:hidden;box-shadow:0 0 0 8px #0b0b0d,0 0 0 9px rgba(255,255,255,.1);transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.h2-mini img{width:100%;display:block}
.h2-step:hover .h2-mini{transform:translateY(-8px)}
@media (max-width:980px){.h2-story-grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:560px){.h2-story-grid{grid-template-columns:1fr}}

/* our nights */
.h2-ours{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(24px,4vw,64px);align-items:center}
.h2-ours h2{font-size:clamp(40px,5.4vw,72px)}
.h2-ours p{color:var(--t2);font-size:18px;line-height:1.45;margin:16px 0 0;max-width:440px}
.h2-ticket{position:relative;display:flex;flex-direction:column;gap:6px;margin-top:28px;max-width:420px;padding:22px 24px;border-radius:18px;background:#F2EFE7;color:#141414!important;transform:rotate(-1.5deg);box-shadow:0 30px 50px -24px #000;transition:transform .4s}
.h2-ticket:hover{transform:rotate(0) translateY(-4px)}
.h2-ticket::before,.h2-ticket::after{content:"";position:absolute;top:50%;width:24px;height:24px;margin-top:-12px;border-radius:12px;background:var(--bg)}
.h2-ticket::before{left:-12px}.h2-ticket::after{right:-12px}
.h2-ticket-k{font-family:var(--font-mono),monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(20,20,20,.6)}
.h2-ticket b{font-family:var(--font-bricolage),sans-serif;font-size:44px;letter-spacing:-.03em;line-height:.95}
.h2-ticket-go{align-self:flex-start;margin-top:10px;height:40px;padding:0 18px;display:inline-flex;align-items:center;border-radius:20px;background:var(--blue);color:#fff;font-weight:700;font-size:14px}
.h2-posters{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.h2-posters a{display:block;border-radius:12px;overflow:hidden;aspect-ratio:3/4;transform:rotate(var(--r));box-shadow:0 24px 40px -20px #000;transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.h2-posters a:hover{transform:rotate(0) scale(1.04);z-index:2}
.h2-posters img{width:100%;height:100%;object-fit:cover;display:block}
@media (max-width:860px){.h2-ours{grid-template-columns:1fr}}

/* artists */
.h2-artists{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(24px,4vw,64px);align-items:center}
.h2-artists h2{font-size:clamp(44px,6vw,88px);margin-top:14px}
.h2-artists p{color:var(--t2);font-size:clamp(16px,1.3vw,19px);line-height:1.45;margin:18px 0 0;max-width:520px}
.h2-faces{position:relative;display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(6,minmax(0,80px));gap:12px}
.h2-face{position:relative;border-radius:18px;overflow:hidden;background:#16161A}
.h2-face img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.h2-face:hover img{transform:scale(1.06)}
.h2-face span{position:absolute;left:12px;bottom:10px;right:12px;font-size:12px;color:rgba(255,255,255,.8);text-shadow:0 1px 8px rgba(0,0,0,.7)}
.h2-face span b{display:block;font-size:16px;color:#fff}
.h2-face.f0{grid-column:1/4;grid-row:1/5}.h2-face.f1{grid-column:4/7;grid-row:1/3}.h2-face.f2{grid-column:4/6;grid-row:3/5}.h2-face.f3{grid-column:1/3;grid-row:5/7}.h2-face.f4{grid-column:3/5;grid-row:5/7}
.h2-vinyl{grid-column:5/7;grid-row:5/7;align-self:center;justify-self:center;width:min(100%,170px);aspect-ratio:1;border-radius:50%;background:repeating-radial-gradient(circle,#111 0 2px,#1d1d1d 2px 3px);box-shadow:0 20px 40px -14px #000;display:grid;place-items:center;animation:h2-spin 3.2s linear infinite}
.h2-vinyl i{width:34%;height:34%;border-radius:50%;background:radial-gradient(circle,#0A0A0B 0 12%,var(--ac) 13%)}
@keyframes h2-spin{to{transform:rotate(360deg)}}
@media (max-width:860px){.h2-artists{grid-template-columns:1fr}.h2-faces{grid-template-rows:repeat(6,minmax(0,60px))}}

/* loops */
.h2-loop-row{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}
.h2-loop{display:flex;flex-direction:column;gap:8px;padding:14px 14px 18px;border-radius:22px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px var(--hair);transition:transform .35s,box-shadow .35s}
.h2-loop:hover{transform:translateY(-6px);box-shadow:inset 0 0 0 2px var(--c)}
.h2-loop-shot{aspect-ratio:1;border-radius:14px;overflow:hidden;background:#000}
.h2-loop-shot img{width:100%;display:block;transform:translateY(-6%);transition:transform 1.4s cubic-bezier(.2,.8,.2,1)}
.h2-loop:hover .h2-loop-shot img{transform:translateY(-34%)}
.h2-loop b{font-size:18px;margin-top:6px}
.h2-loop span{font-size:14px;color:var(--t2);line-height:1.4}
@media (max-width:1100px){.h2-loop-row{grid-template-columns:repeat(3,1fr)}}
@media (max-width:640px){.h2-loop-row{grid-template-columns:repeat(2,1fr)}}

/* work */
.h2-work{padding-bottom:clamp(72px,10vw,140px)!important}
.h2-work h2{font-size:clamp(40px,5.4vw,72px)}
.h2-doors{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:28px}
.h2-doors a{display:flex;flex-direction:column;gap:8px;padding:22px;border-radius:20px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px var(--hair);min-height:150px;transition:background .3s}
.h2-doors a:hover{background:rgba(255,255,255,.08)}
.h2-doors b{font-family:var(--font-bricolage),sans-serif;font-size:26px;letter-spacing:-.03em}
.h2-doors span{color:var(--t2);font-size:15px;line-height:1.4}
@media (max-width:860px){.h2-doors{grid-template-columns:1fr 1fr}}
@media (prefers-reduced-motion:reduce){.h2x *{animation:none!important;transition:none!important}}
`;
