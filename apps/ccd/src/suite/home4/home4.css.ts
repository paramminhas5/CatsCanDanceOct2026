/** Styles for the v4.1 home. Scoped under .h4; the tiles reuse .k-tile from the kit, the ring reuses home2's .h2x. */
export const CSS = `
.h4{overflow-x:clip;padding-bottom:72px}
.h4-wrap{max-width:1360px;margin:0 auto;padding:0 24px;box-sizing:border-box}
.h4 h1,.h4 h2,.h4 h3{font-family:var(--k-display);font-weight:800;letter-spacing:-.025em;line-height:.98;margin:0}
.h4 h2{font-size:clamp(24px,2.4vw,34px);color:var(--k-tx);margin-top:6px}
.h4-eye{font-family:var(--k-mono);font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.h4-sec{padding-top:56px}
.h4-head{display:flex;justify-content:space-between;align-items:end;gap:16px 32px;flex-wrap:wrap;margin-bottom:18px}
.h4-more{color:var(--k-t2);font:600 15px var(--k-ui);text-decoration:none;border-bottom:1px solid var(--k-hair);padding-bottom:4px;transition:color .2s,border-color .2s}
.h4-more:hover{color:var(--k-tx);border-color:var(--k-tx)}
.h4-key{display:inline-flex;align-items:center;min-height:46px;padding:0 22px;border-radius:999px;background:var(--on);color:var(--acc);font:700 16px var(--k-ui);text-decoration:none;transition:transform .2s}
.h4-key:hover{transform:translateY(-2px)}
.h4-ghost{display:inline-flex;align-items:center;min-height:46px;padding:0 20px;border-radius:999px;border:1.5px solid currentColor;color:inherit;font:600 15px var(--k-ui);text-decoration:none;opacity:.85;transition:opacity .2s}
.h4-ghost:hover{opacity:1}
.h4-fine{margin:0;color:var(--k-t3);font-size:13px;line-height:1.5}
.h4-body{animation:h4in .3s var(--k-ease) both}

/* tiles */
.h4-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding-bottom:12px}
.h4-tiles .k-tile{position:relative;overflow:hidden}
.h4-tick{position:absolute;left:0;bottom:0;height:3px;width:100%;background:var(--on);opacity:.55;transform-origin:left;animation:h4tick 8s linear both}
@keyframes h4tick{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@media (max-width:760px){.h4-tiles{grid-template-columns:1fr 1fr}.h4-tiles .k-tile{min-height:50px}.h4-tiles .k-tile small{display:none}.h4-tiles .k-tile b{font-size:15px}}

/* stage: four layers stacked in one grid cell, cross-faded */
.h4-stage{margin-top:16px;position:relative;display:grid;border-radius:32px;background:var(--acc);overflow:hidden;transition:background .45s var(--k-ease);isolation:isolate}
.h4-stage::before{content:"";position:absolute;inset:0;background:radial-gradient(60% 80% at 85% 20%,rgba(255,255,255,.22),transparent 60%);pointer-events:none;z-index:0}
.h4-layer{grid-area:1/1;position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:24px;align-items:center;min-height:400px;padding:40px 48px 0;color:var(--on);opacity:0;visibility:hidden;transition:opacity .28s var(--k-ease),visibility 0s .28s}
.h4-layer.on{opacity:1;visibility:visible;transition:opacity .28s var(--k-ease),visibility 0s}
@keyframes h4in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.h4-copy{position:relative;z-index:2;display:flex;flex-direction:column;gap:16px;padding-bottom:40px;min-width:0}
.h4-layer .h4-copy>*{transform:translateY(10px);transition:transform .45s var(--k-ease)}
.h4-layer.on .h4-copy>*{transform:none}
.h4-copy .h4-eye{opacity:.7}
.h4-copy h1{font-size:clamp(34px,3.4vw,54px);color:var(--on);max-width:15ch}
.h4-copy p{font-size:clamp(15px,1.15vw,17px);line-height:1.5;max-width:44ch;margin:0;opacity:.85}
.h4-btns{display:flex;gap:10px;flex-wrap:wrap}
.h4-glance{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:6px;border-top:1px solid color-mix(in srgb,var(--on) 22%,transparent);padding-top:14px;max-width:480px}
.h4-glance span{display:flex;flex-direction:column;gap:6px;padding-right:12px}
.h4-glance b{font-family:var(--k-display);font-size:clamp(20px,1.8vw,26px);line-height:1}
.h4-glance em{font-style:normal;font-size:13px;opacity:.7}
.h4-phones{position:relative;z-index:1;height:100%;min-height:380px;align-self:end}
.h4-phone{position:absolute;z-index:2;bottom:-60px;width:min(196px,40%);border-radius:36px;padding:8px;background:#0a0a0c;box-shadow:0 40px 80px -30px rgba(0,0,0,.55);transition:transform .55s var(--k-ease)}
.h4-phone img{display:block;width:100%;border-radius:29px;aspect-ratio:780/1688;object-fit:cover}
.h4-phone--front{right:6%;transform:translateY(40px)}
.h4-phone--front.solo{right:24%}
.h4-phone--back{right:46%;bottom:-90px;transform:translateY(60px) rotate(-7deg)}
.h4-layer.on .h4-phone--front{transform:none}
.h4-layer.on .h4-phone--back{transform:rotate(-7deg)}
.h4-cat{position:absolute;z-index:3;right:-4px;top:12px;width:88px;filter:drop-shadow(0 12px 20px rgba(0,0,0,.25));animation:h4bob 1.8s ease-in-out infinite alternate}
@keyframes h4bob{from{transform:translateY(0) rotate(-3deg)}to{transform:translateY(-10px) rotate(3deg)}}

.h4:not(.ready) .h4-stage,.h4:not(.ready) .h4-layer,.h4:not(.ready) .h4-layer *{transition:none!important}

/* the moving piece behind the screens */
.fx{position:absolute;inset:0;z-index:1;pointer-events:none}
.fx-posters img{position:absolute;top:14%;left:50%;width:42%;aspect-ratio:4/5;object-fit:cover;border-radius:14px;box-shadow:0 30px 50px -20px rgba(0,0,0,.5);opacity:.9;transform:translateX(calc(-50% + (var(--i) - 1) * 70%)) rotate(calc((var(--i) - 1) * 9deg));animation:fxdrift 5s ease-in-out infinite alternate;animation-delay:calc(var(--i) * -1.4s)}
@keyframes fxdrift{from{translate:0 0}to{translate:0 -18px}}
.fx-record .fx-disc{position:absolute;top:4%;right:16%;width:70%;max-width:330px;aspect-ratio:1;border-radius:50%;background:repeating-radial-gradient(circle,#111 0 2px,#1b1b1f 2px 4px);box-shadow:0 40px 70px -30px rgba(0,0,0,.6);animation:fxspin 6s linear infinite;display:grid;place-items:center}
.fx-record .fx-disc img{width:36%;aspect-ratio:1;border-radius:50%;object-fit:cover;box-shadow:0 0 0 6px #0a0a0c}
@keyframes fxspin{to{transform:rotate(360deg)}}
.fx-invite .fx-card{position:absolute;top:10%;left:2%;width:46%;max-width:230px;aspect-ratio:4/5;border-radius:20px;padding:18px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;color:#0a0a0b;box-shadow:0 30px 60px -20px rgba(0,0,0,.5);transform:rotate(-10deg);animation:fxfloat 4s ease-in-out infinite alternate}
.fx-invite .fx-card b{font-family:var(--k-display);font-size:26px;line-height:.95;letter-spacing:-.02em}
.fx-invite .fx-card em{align-self:flex-start;font-style:normal;font:700 13px var(--k-ui);padding:8px 14px;border-radius:999px;background:#0a0a0b;color:#fff}
@keyframes fxfloat{from{translate:0 0}to{translate:0 -16px}}
.fx-invite i{position:absolute;top:-6%;left:calc(var(--i) * 7%);width:10px;height:16px;border-radius:3px;background:hsl(calc(var(--i) * 47) 95% 60%);opacity:.9;animation:fxconf 3.6s linear infinite;animation-delay:calc(var(--i) * -.27s)}
@keyframes fxconf{from{transform:translateY(0) rotate(0)}to{transform:translateY(620px) rotate(540deg)}}
.fx-pads{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;position:absolute;inset:auto auto 18% 0;width:48%;max-width:250px}
.fx-pads i{aspect-ratio:1;border-radius:12px;background:rgba(0,0,0,.18);box-shadow:inset 0 -3px 0 rgba(0,0,0,.2);animation:fxpad 1.97s steps(1) infinite;animation-delay:calc(var(--i) * .123s)}
@keyframes fxpad{0%,12%{background:#0a0a0c;box-shadow:0 0 18px rgba(255,255,255,.5)}13%,100%{background:rgba(0,0,0,.18)}}
@media (prefers-reduced-motion:reduce){.fx *,.h4-cat{animation:none!important}}

@media (max-width:1100px){.h4-layer{padding:48px 40px 0}.h4-phone--back{display:none}.h4-phone--front{right:14%}}
@media (max-width:860px){
  .h4-stage{border-radius:24px}
  .h4-layer{grid-template-columns:1fr;padding:36px 24px 0;min-height:0}
  .h4-copy{padding-bottom:0}
  .h4-copy h1{max-width:none}
  .h4-phones{min-height:340px}
  .h4-phone{width:190px;border-radius:30px;padding:7px}.h4-phone img{border-radius:24px}
  .h4-phone--front,.h4-phone--front.solo{right:calc(50% - 95px)}
  .h4-cat{width:80px;top:4px}
}
@media (max-width:480px){.h4-glance b{font-size:22px}.h4-phone{width:160px}.h4-phone--front,.h4-phone--front.solo{right:calc(50% - 80px)}.h4-phones{min-height:290px}.h4-sec{padding-top:80px}}

/* week ring */
.h4-ring.h2x{background:transparent;overflow:visible}
.h4-ring.h2x section{padding-top:0}

/* our next Episode */
.h4-ep{display:grid;grid-template-columns:120px 1fr;gap:24px;align-items:center;padding:14px;border-radius:28px;background:var(--k-raised);color:var(--k-tx);text-decoration:none;border:1px solid var(--k-hair);transition:transform .25s var(--k-ease),border-color .25s}
.h4-ep:hover{transform:translateY(-3px);border-color:#2563eb}
.h4-ep-poster{display:block;aspect-ratio:4/5;border-radius:16px;overflow:hidden;background:#0a0a0c}
.h4-ep-poster img,.h4-ep-poster svg{display:block;width:100%;height:100%;object-fit:cover}
.h4-ep-copy{display:flex;flex-direction:column;gap:6px;padding-right:16px}
.h4-ep-copy .h4-eye{color:#6b9bff}
.h4-ep-copy b{font-family:var(--k-display);font-size:clamp(24px,2.4vw,34px);letter-spacing:-.025em;line-height:1}
.h4-ep-where{color:var(--k-t2);font-size:17px}
.h4-ep-line{color:var(--k-tx);font:600 15px var(--k-ui)}
.h4-ep-go{align-self:flex-start;margin-top:6px;display:inline-flex;align-items:center;min-height:40px;padding:0 24px;border-radius:999px;background:#2563eb;color:#fff;font:700 15px var(--k-ui)}
@media (max-width:640px){.h4-ep{grid-template-columns:120px 1fr;gap:18px;padding:14px}.h4-ep-copy b{font-size:26px}.h4-ep-where{font-size:15px}.h4-ep-copy{padding-right:0}}

/* features: cards, each with the real screen */
.h4-feats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.h4-feats.four{grid-template-columns:repeat(4,minmax(0,1fr))}
.h4-feat{position:relative;display:flex;flex-direction:column;border-radius:24px;background:var(--k-raised);border:1px solid var(--k-hair);color:var(--k-tx);text-decoration:none;overflow:hidden;transition:transform .3s var(--k-ease),border-color .3s}
.h4-feat:hover{transform:translateY(-4px);border-color:color-mix(in srgb,var(--acc) 60%,transparent)}
.h4-feat-pic{position:relative;display:block;height:150px;overflow:hidden;background:radial-gradient(80% 90% at 50% 100%,color-mix(in srgb,var(--acc) 30%,transparent),transparent 70%)}
.h4-feat-pic img{position:absolute;left:50%;top:20px;width:52%;border-radius:22px;border:6px solid #0a0a0c;box-shadow:0 30px 50px -20px rgba(0,0,0,.6);transform:translateX(-50%);transition:transform .5s var(--k-ease)}
.h4-feat:hover .h4-feat-pic img{transform:translateX(-50%) translateY(-10px)}
.h4-feat-t{display:flex;flex-direction:column;gap:4px;padding:14px 16px 18px;border-top:1px solid var(--k-hair)}
.h4-feat-t b{font-family:var(--k-display);font-size:17px;letter-spacing:-.015em}
.h4-feat-t span{color:var(--k-t2);font-size:13px;line-height:1.45}
.h4-feat>i{position:absolute;right:14px;top:14px;font-style:normal;color:var(--k-t3);transition:transform .25s,color .25s}
.h4-feat:hover>i{transform:translateX(5px);color:var(--acc)}
.art{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.art-wave{gap:3px;padding:40px 28px}
.art-wave i{flex:1;border-radius:3px;background:var(--acc);animation:artw 1.2s ease-in-out infinite alternate}
@keyframes artw{from{transform:scaleY(.35)}to{transform:scaleY(1)}}
.art-pads{display:grid;grid-template-columns:repeat(4,44px);gap:8px;align-content:center;justify-content:center}
.art-pads i{width:44px;height:44px;border-radius:10px;background:#1d1d22;animation:artp 2.4s steps(1) infinite}
@keyframes artp{0%,15%{background:var(--acc);box-shadow:0 0 16px -2px var(--acc)}16%,100%{background:#1d1d22}}
.art-live{gap:12px;font:600 14px var(--k-ui);color:var(--k-t2)}
.art-live b{padding:12px 14px;border-radius:12px;background:#0a0a0c;border:1px solid var(--k-hair);color:var(--k-tx)}
@media (max-width:1200px){.h4-feats{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:760px){.h4-feats,.h4-feats.four{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:600px){.h4-feats,.h4-feats.four{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -24px;padding:0 24px 8px}.h4-feat{flex:0 0 78%;scroll-snap-align:start}}

/* journey: the app's steps in the order of the night */
.h4-jr{position:relative}
.h4-jr ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--n),minmax(150px,1fr));gap:12px;overflow-x:auto;scrollbar-width:none}
.h4-jr ol::-webkit-scrollbar{display:none}
.h4-jr-line{position:absolute;left:0;right:0;top:41px;height:2px;background:var(--k-hair);pointer-events:none}
.h4-jr-line i{position:absolute;inset:0;background:var(--acc);transform:scaleX(0);transform-origin:left;transition:transform 1.4s var(--k-ease)}
.h4-jr.seen .h4-jr-line i{transform:scaleX(1)}
.h4-jr li{opacity:0;transform:translateY(12px);transition:opacity .5s var(--k-ease),transform .5s var(--k-ease);transition-delay:calc(var(--i) * .15s)}
.h4-jr.seen li{opacity:1;transform:none}
.h4-jr a{display:flex;flex-direction:column;gap:6px;color:var(--k-tx);text-decoration:none;min-width:0}
.h4-jr-when{display:flex;align-items:baseline;gap:8px;height:22px;font:600 12px var(--k-mono);letter-spacing:.04em;text-transform:uppercase;color:var(--k-t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.h4-jr-when em{font-style:normal;color:var(--acc)}
.h4-jr-dot{position:relative;z-index:1;width:14px;height:14px;margin:4px 0 10px;border-radius:50%;background:var(--k-bg,#0a0a0b);border:2px solid var(--acc);box-shadow:0 0 0 4px var(--k-bg,#0a0a0b);transition:background .3s}
.h4-jr.seen .h4-jr-dot{background:var(--acc);transition-delay:calc(var(--i) * .15s + .3s)}
.h4-jr-pic{position:relative;display:block;height:200px;border-radius:18px;overflow:hidden;background:radial-gradient(80% 90% at 50% 100%,color-mix(in srgb,var(--acc) 26%,transparent),transparent 70%),var(--k-raised);border:1px solid var(--k-hair);transition:transform .3s var(--k-ease),border-color .3s}
.h4-jr-pic img{position:absolute;left:50%;top:16px;width:64%;border-radius:18px;border:5px solid #0a0a0c;box-shadow:0 24px 40px -18px rgba(0,0,0,.6);transform:translateX(-50%);transition:transform .45s var(--k-ease)}
.h4-jr a:hover .h4-jr-pic{border-color:color-mix(in srgb,var(--acc) 60%,transparent);transform:translateY(-3px)}
.h4-jr a:hover .h4-jr-pic img{transform:translateX(-50%) translateY(-8px)}
.h4-jr b{margin-top:8px;font-family:var(--k-display);font-size:18px;letter-spacing:-.015em}
.h4-jr-line2{color:var(--k-t2);font-size:13px;line-height:1.45}
.art-club{gap:10px}
.art-club img{width:90px;animation:h4bob 1.4s ease-in-out infinite alternate}
.art-club i{position:absolute;bottom:0;width:30%;height:70%;background:conic-gradient(from 200deg at 50% 100%,transparent 0 40%,color-mix(in srgb,var(--acc) 45%,transparent) 50%,transparent 60% 100%);transform-origin:50% 100%;animation:artbeam 3s ease-in-out infinite alternate}
.art-club i:nth-of-type(1){left:5%;animation-delay:-.6s}.art-club i:nth-of-type(2){left:35%}.art-club i:nth-of-type(3){left:65%;animation-delay:-1.2s}
@keyframes artbeam{from{transform:rotate(-18deg)}to{transform:rotate(18deg)}}
@media (max-width:760px){.h4-jr ol{grid-template-columns:repeat(var(--n),68%);scroll-snap-type:x mandatory}.h4-jr li{scroll-snap-align:start}.h4-jr-line{right:auto;width:calc(var(--n) * 70%)}}
@media (prefers-reduced-motion:reduce){.h4-jr li,.h4-jr-line i{transition:none;opacity:1;transform:none}}

/* artists: play here, then dig in */
.h4-people{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.h4-person{position:relative;display:flex;flex-direction:column;gap:4px}
.h4-person-img{display:block;aspect-ratio:1;border-radius:20px;overflow:hidden;background:var(--k-raised);margin-bottom:12px}
.h4-person-img img{width:100%;height:100%;object-fit:cover;transition:transform .5s var(--k-ease)}
.h4-person:hover .h4-person-img img{transform:scale(1.04)}
.h4-pbtn{position:absolute;right:12px;top:calc(100% - 118px);width:52px;height:52px;border-radius:50%;border:0;cursor:pointer;display:grid;place-items:center;background:var(--acc);color:#0a0a0c;box-shadow:0 12px 30px -8px rgba(0,0,0,.6);transition:transform .2s}
.h4-pbtn:hover{transform:scale(1.08)}
.h4-person-t{display:flex;flex-direction:column;gap:3px;color:var(--k-tx);text-decoration:none}
.h4-person-t b{font-family:var(--k-display);font-size:22px;letter-spacing:-.015em}
.h4-person-t span{color:var(--k-t2);font-size:14px}
.h4-person-t em{font-style:normal;color:var(--k-t3);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.h4-records{margin-top:28px;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:16px 12px}
.h4-rec{display:flex;flex-direction:column;gap:8px;min-width:0}
.h4-rec button{position:relative;display:block;padding:0;border:0;cursor:pointer;aspect-ratio:1;border-radius:12px;overflow:hidden;background:var(--k-raised)}
.h4-rec img{width:100%;height:100%;object-fit:cover;transition:transform .4s var(--k-ease)}
.h4-rec button:hover img{transform:scale(1.05)}
.h4-rec-pl{position:absolute;right:8px;bottom:8px;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--acc);color:#0a0a0c;opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s}
.h4-rec button:hover .h4-rec-pl,.h4-rec.on .h4-rec-pl{opacity:1;transform:none}
.h4-rec.on button{box-shadow:0 0 0 2px var(--acc)}
.h4-rec a{display:flex;flex-direction:column;color:var(--k-t2);font-size:12px;text-decoration:none;min-width:0}
.h4-rec a b{color:var(--k-tx);font:600 13px var(--k-ui);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.eq{display:flex;gap:2px;align-items:flex-end;height:14px}
.eq i{width:3px;background:currentColor;border-radius:1px;animation:eqb .8s ease-in-out infinite alternate}
.eq i:nth-child(2){animation-delay:.2s}.eq i:nth-child(3){animation-delay:.4s}
@keyframes eqb{from{height:3px}to{height:14px}}
.h4-dock{position:fixed;left:0;right:0;margin:0 auto;bottom:20px;z-index:60;display:flex;align-items:center;gap:14px;width:min(560px,calc(100vw - 32px));box-sizing:border-box;padding:10px 12px 10px 10px;border-radius:999px;background:rgba(20,20,22,.92);backdrop-filter:blur(14px);border:1px solid var(--k-hair);box-shadow:0 20px 50px -20px rgba(0,0,0,.8);animation:h4in .3s var(--k-ease) both}
.h4-dock img{width:44px;height:44px;border-radius:50%;object-fit:cover}
.h4-dock img.spin{animation:fxspin 3s linear infinite}
.h4-dock-t{position:relative;flex:1;min-width:0;display:flex;flex-direction:column}
.h4-dock-t b{font:700 14px var(--k-ui);color:var(--k-tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.h4-dock-t span{font-size:12px;color:var(--k-t2)}
.h4-dock-t i{position:absolute;left:0;right:0;bottom:-6px;height:2px;background:var(--acc);transform-origin:left}
.h4-dock-go{color:var(--k-tx);font:600 13px var(--k-ui);text-decoration:none;white-space:nowrap}
.h4-dock button{width:38px;height:38px;border-radius:50%;border:0;background:var(--acc);color:#0a0a0c;cursor:pointer;font-size:12px}
@media (max-width:900px){.h4-people{grid-template-columns:repeat(2,minmax(0,1fr))}.h4-records{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (max-width:480px){.h4-records{grid-template-columns:repeat(3,minmax(0,1fr))}.h4-dock-go{display:none}}

/* host: make the invite, send the RSVP */
.h4-try{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:24px;align-items:stretch}
.h4-form{display:flex;flex-direction:column;gap:12px;padding:22px;border-radius:28px;background:var(--k-raised);border:1px solid var(--k-hair)}
.h4-form label{display:flex;flex-direction:column;gap:8px}
.h4-form label span,.h4-lbl{font:500 12px var(--k-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--k-t3)}
.h4-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.h4-form input{appearance:none;width:100%;box-sizing:border-box;min-height:44px;padding:0 14px;border-radius:12px;border:1px solid var(--k-hair);background:#0a0a0c;color:var(--k-tx);font:500 15px var(--k-ui);color-scheme:dark;transition:border-color .2s}
.h4-form input:focus{outline:none;border-color:var(--acc)}
.h4-chips{display:flex;flex-wrap:wrap;gap:8px}
.h4-chips button{appearance:none;border:1px solid var(--k-hair);background:#0a0a0c;color:var(--k-t2);min-height:40px;padding:0 16px;border-radius:999px;font:600 14px var(--k-ui);cursor:pointer;transition:background .15s,color .15s}
.h4-chips button[aria-checked="true"]{background:var(--k-tx);color:#0a0a0c;border-color:var(--k-tx)}
.h4-looks{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:8px}
.h4-looks button{appearance:none;border:0;cursor:pointer;aspect-ratio:1;border-radius:14px;display:flex;align-items:flex-end;padding:8px;box-sizing:border-box;transition:transform .2s,box-shadow .2s}
.h4-looks button b{font:800 11px var(--k-ui);letter-spacing:-.01em}
.h4-looks button:hover{transform:translateY(-2px)}
.h4-looks button[aria-checked="true"]{transform:translateY(-4px);box-shadow:0 0 0 2px #0a0a0c,0 0 0 4px var(--k-tx)}
.h4-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:14px;background:#0a0a0c;border:1px solid var(--k-hair)}
.h4-seg button{appearance:none;border:0;min-height:44px;border-radius:10px;background:transparent;color:var(--k-t2);font:600 15px var(--k-ui);cursor:pointer;transition:background .2s,color .2s}
.h4-seg button[aria-checked="true"]{background:var(--acc);color:var(--on)}
.h4-cta{appearance:none;border:0;cursor:pointer;margin-top:4px;display:inline-flex;justify-content:center;align-items:center;min-height:48px;border-radius:999px;background:var(--acc);color:var(--on);font:700 16px var(--k-ui);transition:transform .2s}
.h4-cta:hover{transform:translateY(-2px)}
.h4-invite{position:relative;display:grid;place-items:center;padding:28px;border-radius:28px;background:var(--k-raised);border:1px solid var(--k-hair);overflow:hidden}
.h4-invite-glow{position:absolute;inset:20%;filter:blur(70px);opacity:.45;transition:background .4s}
.h4-invite-card{position:relative;width:min(290px,100%);aspect-ratio:4/5;box-sizing:border-box;border-radius:26px;padding:24px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 40px 80px -30px rgba(0,0,0,.7);transform:rotate(-2deg);transition:transform .4s var(--k-ease),background .4s}
.h4-invite-card:hover{transform:rotate(0) scale(1.02)}
.h4-inv-top{display:flex;justify-content:space-between;align-items:center;font:600 12px var(--k-mono);letter-spacing:.08em;text-transform:uppercase;opacity:.8}
.h4-inv-top img{width:28px;height:28px}
.h4-inv-name{margin-top:auto;font-family:var(--k-display);font-size:clamp(32px,3.4vw,44px);line-height:.95;letter-spacing:-.025em;word-break:break-word;position:relative;z-index:1}
.h4-inv-meta{margin-top:12px;font:600 14px var(--k-ui);line-height:1.4;opacity:.85;position:relative;z-index:1}
.h4-inv-cat{position:absolute;right:-8px;top:46px;width:120px;animation:h4bob 1.8s ease-in-out infinite alternate}
.h4-inv-btns{display:flex;gap:8px;margin-top:18px;position:relative;z-index:1}
.h4-inv-btns em{font-style:normal;padding:10px 18px;border-radius:999px;font:700 14px var(--k-ui)}
.h4-inv-btns em.ghost{background:transparent!important;border:1.5px solid currentColor;color:inherit}
@media (max-width:860px){.h4-try{grid-template-columns:1fr}.h4-invite{order:-1;padding:28px}.h4-form{padding:22px}}

/* school: beat maker */
.h4-beat{padding:22px;border-radius:28px;background:var(--k-raised);border:1px solid var(--k-hair);display:flex;flex-direction:column;gap:24px}
.h4-beat-top{display:flex;align-items:center;gap:16px}
.h4-play{appearance:none;border:0;cursor:pointer;min-width:112px;min-height:52px;padding:0 24px;border-radius:999px;background:var(--acc);color:var(--on);font:700 16px var(--k-ui);transition:transform .2s}
.h4-play:hover{transform:translateY(-2px)}
.h4-beat-meta{font:500 13px var(--k-mono);color:var(--k-t3);letter-spacing:.04em}
.h4-clear{margin-left:auto;appearance:none;background:none;border:1px solid var(--k-hair);color:var(--k-t2);min-height:40px;padding:0 16px;border-radius:999px;font:600 14px var(--k-ui);cursor:pointer}
.h4-grid{display:flex;flex-direction:column;gap:8px}
.h4-gridrow{display:grid;grid-template-columns:64px repeat(16,minmax(0,1fr));gap:6px;align-items:center}
.h4-rowname{font:500 12px var(--k-mono);color:var(--k-t2);text-transform:uppercase;letter-spacing:.06em}
.h4-gridrow button{appearance:none;border:0;cursor:pointer;height:34px;border-radius:10px;background:#1d1d22;box-shadow:inset 0 -3px 0 rgba(0,0,0,.35);transition:background .12s,transform .12s}
.h4-gridrow button.bar{background:#26262c}
.h4-gridrow button[aria-pressed="true"]{background:var(--acc);box-shadow:0 0 18px -4px var(--acc),inset 0 -3px 0 rgba(0,0,0,.2)}
.h4-gridrow button.now{transform:scale(.9);outline:2px solid rgba(255,255,255,.55);outline-offset:1px}
@media (max-width:760px){.h4-beat{padding:18px}.h4-gridrow{grid-template-columns:44px repeat(16,minmax(0,1fr));gap:3px}.h4-gridrow button{border-radius:5px}.h4-rowname{font-size:10px}}

/* the other apps */
.h4-other-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.h4-other{position:relative;appearance:none;border:0;cursor:pointer;text-align:left;font:inherit;display:flex;min-height:150px;padding:22px;border-radius:28px;background:var(--c);color:var(--on);overflow:hidden;transition:transform .25s var(--k-ease)}
.h4-other:hover{transform:translateY(-4px)}
.h4-other-copy{position:relative;z-index:1;display:flex;flex-direction:column;gap:12px;max-width:72%}
.h4-other .h4-eye{opacity:.7}
.h4-other b{font-family:var(--k-display);font-size:clamp(18px,1.5vw,22px);letter-spacing:-.02em;line-height:1.05}
.h4-other em{margin-top:auto;font-style:normal;font:700 15px var(--k-ui)}
.h4-other-cat{position:absolute;right:-6px;bottom:-8px;width:84px;transition:transform .35s var(--k-ease)}
.h4-other:hover .h4-other-cat{transform:translateY(-8px) rotate(-6deg)}
@media (max-width:860px){.h4-other-grid{grid-template-columns:1fr}.h4-other{min-height:0}}

/* ── Phone first (Param, 13 Nov 2026: "it needs to be mobile first, different views for desktop and mobile") ── */
.h4-tabbar{display:none}
@media (max-width:760px){
  .h4-nav{position:relative}
  .h4-nav .h4-tiles{display:none}
  .h4-tabbar{position:fixed;left:0;right:0;bottom:0;z-index:70;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:8px 10px calc(8px + env(safe-area-inset-bottom));background:rgba(10,10,11,.92);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-top:1px solid var(--k-hair)}
  .h4-tabbar button{appearance:none;border:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-height:52px;border-radius:14px;background:transparent;color:var(--k-t2);font:600 12px var(--k-ui);transition:background .2s,color .2s}
  .h4-tabbar button i{width:9px;height:9px;border-radius:50%;background:var(--c)}
  .h4-tabbar button[aria-pressed="true"]{background:var(--c);color:var(--on)}
  .h4-tabbar button[aria-pressed="true"] i{background:var(--on)}
  .k-root{padding-bottom:calc(76px + env(safe-area-inset-bottom))}
  .h4-dock{bottom:calc(84px + env(safe-area-inset-bottom))}
  .h4-more-apps{display:none}
  .h4-wrap{padding:0 16px}
  .h4-sec{padding-top:44px}
  .h4 h2{font-size:24px}
  .h4-head{margin-bottom:14px}
  .h4-stage{margin-top:8px;border-radius:22px}
  .h4-layer{padding:24px 20px 0;gap:8px}
  .h4-copy{gap:12px}
  .h4-copy h1{font-size:31px;line-height:1}
  .h4-copy p{font-size:15px}
  .h4-btns{flex-wrap:nowrap}
  .h4-btns a{flex:1;justify-content:center;min-height:44px;padding:0 12px;font-size:14px;white-space:nowrap}
  .h4-glance{padding-top:12px;margin-top:2px}
  .h4-glance b{font-size:20px}
  .h4-glance em{font-size:11px}
  .h4-phones{min-height:230px}
  .h4-phone{width:142px;border-radius:24px;padding:6px;bottom:-70px}.h4-phone img{border-radius:19px}
  .h4-phone--front,.h4-phone--front.solo{right:calc(50% - 71px)}
  .h4-cat{width:62px;top:0;right:2px}
  .fx-posters img{width:36%;top:8%}
  .fx-record .fx-disc{width:62%;right:19%;top:2%}
  .fx-invite .fx-card{width:40%;top:6%}
  .fx-invite .fx-card b{font-size:18px}
  .fx-pads{width:40%;bottom:24%;gap:6px}
  .h4-ep{grid-template-columns:88px 1fr;gap:14px;padding:12px;border-radius:20px}
  .h4-ep-copy b{font-size:22px}
  .h4-ep-copy .h4-eye{font-size:10px}
  .h4-ep-where{font-size:14px}
  .h4-ep-go{min-height:38px;padding:0 16px;font-size:14px}
  .h4-people{gap:10px}
  .h4-person-t b{font-size:17px}
  .h4-pbtn{width:44px;height:44px;top:calc(100% - 100px);right:8px}
  .h4-records{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:10px;margin:22px -16px 0;padding:0 16px 6px;scrollbar-width:none}
  .h4-records::-webkit-scrollbar{display:none}
  .h4-rec{flex:0 0 38%;scroll-snap-align:start}
  .h4-rec-pl{opacity:1;transform:none;width:34px;height:34px}
  .h4-jr ol{grid-template-columns:repeat(var(--n),74%);margin:0 -16px;padding:0 16px 6px;scroll-padding:16px}
  .h4-jr-line{display:none}
  .h4-jr li{position:relative}
  .h4-jr li::before{content:"";position:absolute;left:0;right:-10px;top:39px;height:2px;background:var(--acc);opacity:.55}
  .h4-jr-pic{height:230px}
  .h4-jr-pic img{width:58%}
  .h4-form{padding:16px;border-radius:20px}
  .h4-invite{padding:22px;border-radius:20px}
  .h4-invite-card{width:min(250px,100%)}
  .h4-looks{gap:6px}
  .h4-beat{padding:14px;border-radius:20px;gap:14px}
  .h4-gridrow button{height:26px}
}
/* How it goes, phone: one pinned panel, numbered steps, a Next button, less scrolling per step */
.h4-jrs{display:none}
html{scroll-behavior:smooth}
#how{scroll-margin-top:90px}
@media (max-width:760px){
  .h4-jr-desk{display:none}
  .h4-jrs{display:block;position:relative;height:calc(var(--n) * 30svh + 100svh)}
  .h4-jrs-pin{position:sticky;top:0;height:calc(100svh - 76px - env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px;padding:16px 0 12px;box-sizing:border-box}
  .h4-jrs-top{display:flex;flex-direction:column;gap:4px}
  .h4-jrs-h{font-family:var(--k-display);font-size:22px;letter-spacing:-.02em;line-height:1.05}
  .h4-jrs-steps{position:relative;list-style:none;margin:2px 0 0;padding:0;display:flex;justify-content:space-between}
  .h4-jrs-track{position:absolute;left:16px;right:16px;top:50%;height:2px;margin-top:-1px;background:var(--k-hair)}
  .h4-jrs-track i{position:absolute;inset:0;background:var(--acc);transform:scaleX(var(--p));transform-origin:left;transition:transform .4s var(--k-ease)}
  .h4-jrs-steps li{position:relative;z-index:1}
  .h4-jrs-steps button{appearance:none;cursor:pointer;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font:700 13px var(--k-ui);color:var(--k-t2);background:#0a0a0b;border:2px solid var(--k-hair);transition:background .25s,color .25s,border-color .25s,transform .25s}
  .h4-jrs-steps .done button{background:var(--acc);border-color:var(--acc);color:var(--on)}
  .h4-jrs-steps .on button{background:#0a0a0b;border-color:var(--acc);color:var(--k-tx);transform:scale(1.15);box-shadow:0 0 0 5px color-mix(in srgb,var(--acc) 22%,transparent)}
  .h4-jrs-stage{position:relative;flex:1;min-height:0;border-radius:22px;overflow:hidden;background:radial-gradient(80% 70% at 50% 100%,color-mix(in srgb,var(--acc) 32%,transparent),transparent 70%),var(--k-raised);border:1px solid var(--k-hair)}
  .h4-jrs-pic{position:absolute;inset:0;display:flex;justify-content:center;opacity:0;transform:translateX(60%) rotate(6deg);transition:opacity .35s var(--k-ease),transform .5s var(--k-ease)}
  .h4-jrs-pic.gone{transform:translateX(-60%) rotate(-6deg)}
  .h4-jrs-pic.on{opacity:1;transform:none}
  .h4-jrs-pic img{height:calc(100% - 22px);margin-top:22px;width:auto;max-width:76%;object-fit:cover;object-position:top;border-radius:22px 22px 0 0;border:6px solid #0a0a0c;border-bottom:0;box-shadow:0 30px 50px -20px rgba(0,0,0,.6)}
  .h4-jrs-when{position:absolute;left:12px;top:12px;padding:6px 10px;border-radius:999px;background:rgba(10,10,11,.8);backdrop-filter:blur(8px);font:600 11px var(--k-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--acc);animation:jrsin .35s var(--k-ease) both}
  .h4-jrs-copy{display:flex;flex-direction:column;gap:10px}
  .h4-jrs-txt{display:flex;flex-direction:column;gap:3px;min-height:64px;animation:jrsin .35s var(--k-ease) both}
  @keyframes jrsin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  .h4-jrs-txt b{font-family:var(--k-display);font-size:24px;letter-spacing:-.02em;line-height:1.05}
  .h4-jrs-txt span{color:var(--k-t2);font-size:14px;line-height:1.4}
  .h4-jrs-acts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .h4-jrs-open{display:flex;align-items:center;justify-content:center;gap:8px;min-height:52px;border-radius:16px;background:var(--acc);color:var(--on);font:700 16px var(--k-ui);text-decoration:none}
  .h4-jrs-next{appearance:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;min-height:52px;border-radius:16px;background:transparent;border:1.5px solid var(--k-hair2,rgba(255,255,255,.22));color:var(--k-tx);font:700 16px var(--k-ui);white-space:nowrap}
  .h4-jrs-next svg{flex:none;animation:jrsnudge 1.4s ease-in-out infinite}
  @keyframes jrsnudge{0%,100%{transform:translateY(-1px)}50%{transform:translateY(2px)}}
}

/* The closer: one thing to pass on, at the end of every app */
.h4-close{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:40px 44px;border-radius:28px;background:var(--c);color:var(--on)}
.h4-close::before{content:"";position:absolute;inset:0;background:radial-gradient(60% 90% at 90% 10%,rgba(255,255,255,.25),transparent 60%);pointer-events:none}
.h4-close-copy{position:relative;z-index:1;display:flex;flex-direction:column;gap:12px;max-width:620px}
.h4-close .h4-eye{opacity:.75}
.h4 .h4-close h2{color:var(--on);font-size:clamp(28px,3vw,42px);margin:0}
.h4-close p{margin:0;font-size:16px;line-height:1.5;opacity:.85;max-width:48ch}
.h4-close-acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}
.h4-close-main{appearance:none;border:0;cursor:pointer;display:inline-flex;align-items:center;gap:10px;min-height:50px;padding:0 22px;border-radius:999px;background:var(--on);color:var(--c);font:700 15px var(--k-ui);transition:transform .2s}
.h4-close-main:hover{transform:translateY(-2px)}
.h4-close-ghost{appearance:none;cursor:pointer;min-height:50px;padding:0 20px;border-radius:999px;background:transparent;border:1.5px solid currentColor;color:inherit;font:600 15px var(--k-ui);opacity:.9}
.h4-close-link{color:inherit;font:700 15px var(--k-ui);text-decoration:none;opacity:.9}
.h4-close-note{font-size:13px;opacity:.7}
.h4-close-cat{position:relative;z-index:1;width:170px;flex:none;animation:h4bob 1.8s ease-in-out infinite alternate}
@media (max-width:760px){
  .h4-close{flex-direction:column;align-items:flex-start;padding:24px 20px 0;border-radius:22px;gap:6px}
  .h4 .h4-close h2{font-size:26px}
  .h4-close p{font-size:14px}
  .h4-close-acts{width:100%}
  .h4-close-main{flex:1 1 100%;justify-content:center;min-height:48px;white-space:nowrap}
  .h4-close-ghost{flex:1 1 100%;min-height:44px}
  .h4-close-cat{width:110px;align-self:flex-end;margin-top:-30px}
}

`;
