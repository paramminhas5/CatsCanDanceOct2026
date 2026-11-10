/** Styles for the v4 home. Scoped under .h4; the tiles reuse .k-tile from the kit, the ring reuses home2's .h2x. */
export const CSS = `
.h4{overflow-x:clip;padding-bottom:96px}
.h4-wrap{max-width:1360px;margin:0 auto;padding:0 24px;box-sizing:border-box}
.h4 h1,.h4 h2,.h4 h3{font-family:var(--k-display);font-weight:800;letter-spacing:-.025em;line-height:.95;margin:0}
.h4 h2{font-size:clamp(34px,4.2vw,56px);color:var(--k-tx);margin-top:8px}
.h4-eye{font-family:var(--k-mono);font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.h4-head{display:flex;justify-content:space-between;align-items:end;gap:16px 32px;flex-wrap:wrap;margin-bottom:28px}
.h4-head p{max-width:42ch;color:var(--k-t2);font-size:16px;line-height:1.5;margin:0}
.h4-key{display:inline-flex;align-items:center;min-height:52px;padding:0 24px;border-radius:999px;background:var(--on);color:var(--acc);font:700 16px var(--k-ui);text-decoration:none;transition:transform .2s}
.h4-key:hover{transform:translateY(-2px)}
.h4-ghost{display:inline-flex;align-items:center;min-height:52px;padding:0 20px;border-radius:999px;border:1.5px solid currentColor;color:inherit;font:600 15px var(--k-ui);text-decoration:none;opacity:.9}
.h4-head .h4-ghost{color:var(--k-tx);min-height:44px}

/* tiles */
.h4-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding-bottom:12px}
.h4-tiles .k-tile{position:relative;overflow:hidden}
.h4-tick{position:absolute;left:0;bottom:0;height:3px;width:100%;background:var(--on);opacity:.55;transform-origin:left;animation:h4tick 8s linear both}
@keyframes h4tick{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@media (max-width:760px){.h4-tiles{grid-template-columns:1fr 1fr}.h4-tiles .k-tile{min-height:50px}.h4-tiles .k-tile small{display:none}.h4-tiles .k-tile b{font-size:15px}}

/* stage */
.h4-stage{margin-top:16px;position:relative;display:grid;grid-template-columns:minmax(0,6fr) minmax(0,5fr);gap:32px;align-items:center;min-height:600px;padding:56px 56px 0;border-radius:32px;background:var(--acc);color:var(--on);overflow:hidden;animation:h4in .6s var(--k-ease) both}
.h4-stage::before{content:"";position:absolute;inset:0;background:radial-gradient(60% 80% at 85% 20%,rgba(255,255,255,.22),transparent 60%);pointer-events:none}
@keyframes h4in{from{opacity:0;transform:translateY(10px) scale(.99)}to{opacity:1;transform:none}}
.h4-copy{position:relative;display:flex;flex-direction:column;gap:20px;padding-bottom:56px}
.h4-copy .h4-eye{opacity:.75}
.h4-copy h1{font-size:clamp(42px,5.4vw,80px);color:var(--on)}
.h4-copy p{font-size:clamp(17px,1.5vw,20px);line-height:1.45;max-width:46ch;margin:0;opacity:.88}
.h4-btns{display:flex;gap:10px;flex-wrap:wrap}
.h4-glance{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin-top:8px;border-top:1.5px solid color-mix(in srgb,var(--on) 25%,transparent);padding-top:18px;max-width:560px}
.h4-glance span{display:flex;flex-direction:column;gap:4px;padding-right:12px}
.h4-glance b{font-family:var(--k-display);font-size:clamp(26px,2.6vw,38px);line-height:1}
.h4-glance em{font-style:normal;font-size:13px;opacity:.75}
.h4-phones{position:relative;height:100%;min-height:540px;align-self:end}
.h4-phone{position:absolute;bottom:-40px;width:250px;border-radius:38px;padding:9px;background:#0a0a0c;box-shadow:0 40px 80px -30px rgba(0,0,0,.55)}
.h4-phone img{display:block;width:100%;border-radius:30px;aspect-ratio:780/1688;object-fit:cover}
.h4-phone--front{right:8%;animation:h4up .8s .1s var(--k-ease) both}
.h4-phone--back{right:44%;bottom:-90px;transform:rotate(-7deg);opacity:.95;animation:h4up2 .8s var(--k-ease) both}
.h4-phones.solo .h4-phone--front{right:22%}
@keyframes h4up{from{transform:translateY(60px);opacity:0}to{transform:none;opacity:1}}
@keyframes h4up2{from{transform:translateY(80px) rotate(-7deg);opacity:0}to{transform:rotate(-7deg);opacity:.95}}
.h4-cat{position:absolute;right:-6px;top:22px;width:120px;filter:drop-shadow(0 12px 20px rgba(0,0,0,.25));animation:h4bob 1.6s ease-in-out infinite alternate}
@keyframes h4bob{from{transform:translateY(0) rotate(-3deg)}to{transform:translateY(-10px) rotate(3deg)}}
@media (max-width:980px){
  .h4-stage{grid-template-columns:1fr;padding:36px 24px 0;min-height:0;border-radius:24px}
  .h4-copy{padding-bottom:0}
  .h4-phones{min-height:360px;margin:0 -24px}
  .h4-phone{width:190px;border-radius:30px;padding:7px}.h4-phone img{border-radius:24px}
  .h4-phone--front{right:12%}.h4-phone--back{right:auto;left:10%}
  .h4-phones.solo .h4-phone--front{right:calc(50% - 95px)}
  .h4-cat{width:84px;top:0}
}
@media (max-width:480px){.h4-glance b{font-size:24px}.h4-phone{width:160px}.h4-phones{min-height:300px}}

/* week ring */
.h4-week{padding-top:80px}
.h4-ring.h2x{background:transparent;overflow:visible}
.h4-ring.h2x section{padding-top:0}

/* our next episode */
.h4-ep{margin-top:28px;display:grid;grid-template-columns:1fr auto;grid-template-areas:"eye go" "t go" "w go";gap:6px 24px;align-items:center;padding:26px 30px;border-radius:24px;background:var(--k-raised);color:var(--k-tx);text-decoration:none;border:1px solid var(--k-hair);transition:transform .2s}
.h4-ep:hover{transform:translateY(-2px)}
.h4-ep .h4-eye{grid-area:eye;color:#dc2626}
.h4-ep b{grid-area:t;font-family:var(--k-display);font-size:clamp(24px,2.6vw,34px);letter-spacing:-.02em}
.h4-ep>span:nth-of-type(2){grid-area:w;color:var(--k-t2)}
.h4-ep-go{grid-area:go;display:inline-flex;align-items:center;min-height:48px;padding:0 22px;border-radius:999px;background:#dc2626;color:#fff;font:700 15px var(--k-ui)}
@media (max-width:640px){.h4-ep{grid-template-columns:1fr;grid-template-areas:"eye" "t" "w" "go";padding:22px}.h4-ep-go{justify-self:start;margin-top:8px}}

/* feature bento */
.h4-feats{padding-top:96px;animation:h4in .5s var(--k-ease) both}
.h4-bento{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:minmax(250px,auto);gap:14px}
.h4-b{position:relative;display:flex;flex-direction:column;gap:8px;padding:22px;border-radius:24px;background:var(--k-raised);border:1px solid var(--k-hair);overflow:hidden;min-width:0;transition:transform .25s var(--k-ease),border-color .25s}
.h4-b:hover{transform:translateY(-3px);border-color:var(--k-hair2,rgba(255,255,255,.18))}
.h4-b h3{font-size:22px;line-height:1.05;color:var(--k-tx);letter-spacing:-.015em}
.h4-b p{font-size:14px;line-height:1.4;color:var(--k-t2);margin:0}
.h4-b.w2{grid-column:span 2}
.h4-b.h2{grid-row:span 2}
.h4-b.w2 h3{font-size:30px}
.h4-b.blue{background:#2563eb;border-color:#2563eb}.h4-b.blue h3,.h4-b.blue p{color:#fff}
.h4-b.lime{background:#b6ef36;border-color:#b6ef36}.h4-b.yellow{background:#ffe600;border-color:#ffe600}.h4-b.pink{background:#ff4d8d;border-color:#ff4d8d}.h4-b.cream{background:#f2efe7;border-color:#f2efe7}
.h4-b.lime h3,.h4-b.lime p,.h4-b.yellow h3,.h4-b.yellow p,.h4-b.pink h3,.h4-b.pink p,.h4-b.cream h3,.h4-b.cream p{color:#0a0a0c}
.h4-art{flex:1;display:flex;align-items:center;justify-content:center;min-height:120px;margin-bottom:8px;position:relative}
@media (max-width:1060px){.h4-bento{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.h4-bento{grid-template-columns:1fr;grid-auto-rows:auto}.h4-b.w2{grid-column:auto}.h4-b.h2{grid-row:auto}.h4-b.w2 h3{font-size:26px}}

.h4-ex{position:absolute;top:-6px;right:-6px;font:600 9px var(--k-mono);letter-spacing:.08em;text-transform:uppercase;padding:3px 6px;border-radius:6px;background:rgba(0,0,0,.55);color:#fff}
.h4-mono{font:500 12px var(--k-mono);color:var(--k-t2)}
.h4-row{display:flex;flex-direction:column;align-items:center;gap:12px}
.h4-faces{display:flex}
.h4-faces i{width:44px;height:44px;border-radius:50%;margin-left:-10px;border:3px solid var(--k-raised);display:grid;place-items:center;font:800 15px var(--k-ui);font-style:normal;color:#0a0a0c;animation:h4pop 2.4s var(--k-ease) infinite alternate}
.h4-faces i:first-child{margin-left:0;color:#fff}
@keyframes h4pop{0%,40%{transform:translateY(0)}60%,100%{transform:translateY(-6px)}}
.h4-card{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:16px;border-radius:16px;background:#0a0a0c;border:1px solid var(--k-hair)}
.h4-card b{font:600 13px var(--k-ui);color:var(--k-tx)}

/* fan of posters */
.h4-fan{position:relative;width:100%;height:100%;min-height:300px}
.h4-fan img{position:absolute;left:50%;top:50%;width:46%;max-width:230px;aspect-ratio:4/5;object-fit:cover;border-radius:14px;box-shadow:0 30px 50px -20px rgba(0,0,0,.6);transform:translate(-50%,-50%) translateX(calc(var(--i) * 62%)) rotate(calc(var(--i) * 8deg));animation:h4fan 3.6s var(--k-ease) infinite alternate}
.h4-fan img:nth-child(2){z-index:2}
@keyframes h4fan{from{transform:translate(-50%,-50%) translateX(calc(var(--i) * 40%)) rotate(calc(var(--i) * 4deg))}to{transform:translate(-50%,-50%) translateX(calc(var(--i) * 66%)) rotate(calc(var(--i) * 9deg))}}

.h4-toast{position:relative;display:flex;gap:12px;align-items:center;padding:14px 16px;border-radius:18px;background:#f2efe7;color:#0a0a0c;max-width:380px;box-shadow:0 20px 40px -20px rgba(0,0,0,.6);animation:h4drop 4s var(--k-ease) infinite}
.h4-toast>i{width:36px;height:36px;border-radius:10px;background:#2563eb url(/cats/dance.webp) center/70% no-repeat;flex-shrink:0}
.h4-toast b{display:block;font:700 14px var(--k-ui)}
.h4-toast em{display:block;font-style:normal;font-size:12px;opacity:.7}
.h4-toast.small{padding:10px 12px}.h4-toast.small b{font-size:13px}
@keyframes h4drop{0%{transform:translateY(-30px);opacity:0}12%,80%{transform:none;opacity:1}100%{transform:translateY(-10px);opacity:0}}

.h4-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center}
.h4-chips span{padding:8px 12px;border-radius:999px;background:#0a0a0c;border:1px solid var(--k-hair);color:var(--k-tx);font:600 12px var(--k-ui);animation:h4chip 3s var(--k-ease) infinite}
.h4-chips span:nth-child(2){animation-delay:.3s}.h4-chips span:nth-child(3){animation-delay:.6s}
.h4-chips .qr{width:46px;height:46px;padding:0;border-radius:8px;background:#f2efe7 repeating-conic-gradient(#0a0a0c 0 25%,transparent 0 50%) 0 0/12px 12px;border:4px solid #f2efe7}
@keyframes h4chip{0%,100%{transform:none}50%{transform:translateY(-4px)}}

.h4-pass{display:flex;align-items:center;gap:12px;font:700 14px var(--k-ui)}
.h4-pass .tk{padding:12px 14px;border-radius:12px;background:#2563eb;color:#fff;animation:h4slide 3s var(--k-ease) infinite}
.h4-pass .arrow{color:var(--k-t3);font-size:22px}
.h4-pass .to{padding:12px 14px;border-radius:12px;background:#0a0a0c;border:1px solid var(--k-hair);color:var(--k-tx)}
@keyframes h4slide{0%,20%{transform:none}50%,70%{transform:translateX(70px);opacity:0}71%{transform:none;opacity:0}100%{opacity:1}}

.h4-glance-mini{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%}
.h4-glance-mini span{display:flex;flex-direction:column;gap:4px;padding:12px 10px;border-radius:14px;background:#0a0a0c;border:1px solid var(--k-hair);animation:h4chip 3s var(--k-ease) infinite}
.h4-glance-mini span:nth-child(2){animation-delay:.4s}.h4-glance-mini span:nth-child(3){animation-delay:.8s}
.h4-glance-mini em{font:500 10px var(--k-mono);text-transform:uppercase;letter-spacing:.06em;color:var(--k-t3);font-style:normal}
.h4-glance-mini b{font:800 18px var(--k-display);color:var(--k-tx)}

.h4-stubs{position:relative;width:180px;height:140px}
.h4-stubs img{position:absolute;left:calc(var(--i) * 34px);top:calc(var(--i) * 8px);width:96px;aspect-ratio:4/5;object-fit:cover;border-radius:10px;border:3px solid #f2efe7;transform:rotate(calc(var(--i) * 6deg - 6deg));animation:h4stub 3.6s var(--k-ease) infinite}
.h4-stubs img:nth-child(3){animation-delay:.2s}
@keyframes h4stub{0%{transform:translateY(-40px) rotate(-6deg);opacity:0}20%,100%{opacity:1}}

/* artists */
.h4-covers{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%;max-width:440px}
.h4-covers img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;box-shadow:0 14px 30px -14px rgba(0,0,0,.5);animation:h4chip 3.4s var(--k-ease) infinite}
.h4-eras{display:flex;gap:4px;width:100%;height:56px}
.h4-eras i{border-radius:10px;transform-origin:left;animation:h4grow 3s var(--k-ease) infinite alternate}
.h4-eras i:nth-child(2){animation-delay:.3s}.h4-eras i:nth-child(3){animation-delay:.6s}
@keyframes h4grow{from{transform:scaleY(.5)}to{transform:none}}
.h4-mono-card{position:relative;display:flex;flex-direction:column;gap:6px;padding:16px 18px;border-radius:16px;background:#0a0a0c;border:1px solid var(--k-hair)}
.h4-mono-card em{font:500 10px var(--k-mono);text-transform:uppercase;letter-spacing:.06em;color:#b6ef36;font-style:normal}
.h4-mono-card b{font:700 15px var(--k-ui);color:var(--k-tx)}
.h4-sign{display:flex;gap:14px}
.h4-sign span{display:flex;flex-direction:column;gap:6px;padding:14px 18px;border-radius:14px;background:#0a0a0c;border:1px solid var(--k-hair);min-width:120px}
.h4-sign em{font:500 10px var(--k-mono);text-transform:uppercase;letter-spacing:.06em;color:var(--k-t3);font-style:normal}
.h4-sign .sig{font:italic 600 22px Georgia,serif;color:#b6ef36;clip-path:inset(0 100% 0 0);animation:h4write 3s var(--k-ease) infinite}
.h4-sign .sig2{animation-delay:.8s}
@keyframes h4write{0%{clip-path:inset(0 100% 0 0)}40%,100%{clip-path:inset(0 0 0 0)}}
.h4-note{position:relative;padding:16px 18px;border-radius:4px 18px 18px 18px;background:#f2efe7;color:#0a0a0c;font:600 15px var(--k-ui);max-width:240px;transform:rotate(-2deg);animation:h4chip 3s var(--k-ease) infinite}
.h4-minicard{display:flex;flex-direction:column;gap:6px;width:120px;padding:14px;border-radius:14px;background:#b6ef36;color:#0a0a0c;transform:rotate(4deg);animation:h4chip 3s var(--k-ease) infinite}
.h4-minicard b{font:800 16px var(--k-display)}
.h4-minicard i{height:10px;border-radius:4px;background:#0a0a0c;opacity:.8}
.h4-minicard i:nth-child(3){width:70%}.h4-minicard i:nth-child(4){width:45%}

/* host */
.h4-phone-xs{width:150px;border-radius:24px;padding:6px;background:#0a0a0c;transform:rotate(-4deg);box-shadow:0 30px 50px -20px rgba(0,0,0,.5);animation:h4chip 4s var(--k-ease) infinite}
.h4-phone-xs img{display:block;width:100%;border-radius:19px}
.h4-yn{display:flex;flex-direction:column;gap:8px;width:100%}
.h4-yn span{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:12px;background:#0a0a0c;border:1px solid var(--k-hair);font:600 13px var(--k-ui);color:var(--k-tx)}
.h4-yn b{padding:4px 10px;border-radius:999px;background:#b6ef36;color:#0a0a0c;font-size:12px;animation:h4chip 2.4s var(--k-ease) infinite}
.h4-door{display:flex;align-items:center;justify-content:space-between;width:100%;max-width:420px}
.h4-door .sig{position:relative;width:70px;height:56px}
.h4-door .sig i{position:absolute;inset:0;background:linear-gradient(to top,#0a0a0c 0 20%,transparent 20% 35%,#0a0a0c 35% 55%,transparent 55% 70%,rgba(10,10,12,.2) 70%);clip-path:polygon(0 100%,100% 0,100% 100%);opacity:.9}
.h4-door .sigt{position:absolute;left:30px;top:-4px;width:46px;height:5px;background:#dc2626;transform:rotate(-38deg)}
.h4-door .scan{width:96px;height:96px;border-radius:50%;background:#16a34a;color:#f2efe7;display:grid;place-items:center;font:800 48px var(--k-ui);animation:h4beat 1.4s var(--k-ease) infinite}
@keyframes h4beat{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(22,163,74,.5)}50%{transform:scale(1.06);box-shadow:0 0 0 18px rgba(22,163,74,0)}}
.h4-bars{display:flex;align-items:flex-end;gap:6px;width:100%;height:120px}
.h4-bars i{flex:1;border-radius:6px 6px 2px 2px;background:#ffe600;transform-origin:bottom;animation:h4bar 2.8s var(--k-ease) infinite alternate}
@keyframes h4bar{from{transform:scaleY(.2)}to{transform:none}}

/* school */
.h4-keys{display:flex;gap:6px;height:130px;width:100%;max-width:440px}
.h4-keys i{flex:1;border-radius:0 0 10px 10px;background:#f2efe7;box-shadow:inset 0 -8px 0 rgba(0,0,0,.12);animation:h4key 2.8s var(--k-ease) infinite}
@keyframes h4key{0%,8%{transform:translateY(6px);background:#0a0a0c}16%,100%{transform:none;background:#f2efe7}}
.h4-wave{display:flex;align-items:center;gap:3px;width:100%;height:110px}
.h4-wave i{flex:1;border-radius:3px;background:#ff4d8d;animation:h4bar 1.6s ease-in-out infinite alternate}

/* lane */
.h4-lane-sec{padding-top:96px}
.h4-lane-box{padding:44px;border-radius:32px;background:var(--k-raised);border:1px solid var(--k-hair)}
.h4-lane{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;padding-top:28px}
.h4-lane::before{content:"";position:absolute;left:4%;right:4%;top:8px;height:2px;background:repeating-linear-gradient(90deg,var(--k-t3) 0 6px,transparent 6px 12px)}
.h4-tok{position:absolute;top:1px;left:4%;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 0 0 6px rgba(255,255,255,.15),0 0 24px #fff;animation:h4tok 10s var(--k-ease) infinite}
@keyframes h4tok{0%,8%{left:8%}25%,33%{left:33%}50%,58%{left:58%}75%,92%{left:84%}100%{left:8%}}
.h4-stop{display:flex;flex-direction:column;gap:8px;min-width:0}
.h4-stop-shot{height:240px;border-radius:20px;overflow:hidden;background:#0a0a0c;border:2px solid transparent;transition:border-color .3s}
.h4-stop-shot img{width:100%;display:block}
.h4-stop b{font:800 20px var(--k-display);color:var(--k-tx);letter-spacing:-.01em;line-height:1.1}
.h4-stop>span:last-child{font-size:14px;color:var(--k-t2);line-height:1.4}
.h4-stop .h4-stop-shot{animation:h4lit 10s infinite}
.h4-stop.s2 .h4-stop-shot{animation-delay:2.5s}.h4-stop.s3 .h4-stop-shot{animation-delay:5s}.h4-stop.s4 .h4-stop-shot{animation-delay:7.5s}
@keyframes h4lit{0%,22%{border-color:var(--c);transform:translateY(-4px)}26%,100%{border-color:transparent;transform:none}}
@media (max-width:900px){.h4-lane{grid-template-columns:1fr 1fr}.h4-lane::before,.h4-tok{display:none}.h4-lane-box{padding:24px}}
@media (max-width:480px){.h4-lane{grid-template-columns:1fr}.h4-stop-shot{height:200px}}

/* the other apps */
.h4-others{padding-top:96px}
.h4-other-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.h4-other{appearance:none;border:0;cursor:pointer;font:inherit;text-align:left;position:relative;display:flex;flex-direction:column;justify-content:space-between;min-height:380px;padding:26px 26px 0;border-radius:28px;background:var(--c);color:var(--on);overflow:hidden;transition:transform .25s var(--k-ease)}
.h4-other:hover{transform:translateY(-4px)}
.h4-other-copy{display:flex;flex-direction:column;gap:10px;position:relative;z-index:1}
.h4-other-copy .h4-eye{opacity:.75}
.h4-other-copy b{font:800 clamp(24px,2.2vw,30px)/1 var(--k-display);letter-spacing:-.02em}
.h4-other-copy em{font-style:normal;font-weight:700;font-size:15px}
.h4-other-shot{display:block;align-self:flex-end;width:58%;margin-top:20px;margin-bottom:-60px;border-radius:26px 26px 0 0;padding:7px 7px 0;background:#0a0a0c;transform:rotate(4deg);transition:transform .35s var(--k-ease)}
.h4-other:hover .h4-other-shot{transform:rotate(0) translateY(-10px)}
.h4-other-shot img{display:block;width:100%;border-radius:20px 20px 0 0}
@media (max-width:900px){.h4-other-grid{grid-template-columns:1fr}.h4-other{min-height:300px}.h4-other-shot{width:44%}}
@media (prefers-reduced-motion:reduce){.h4 *{animation:none !important}}
`;
