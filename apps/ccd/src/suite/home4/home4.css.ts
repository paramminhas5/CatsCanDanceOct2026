/** Styles for the v4.1 home. Scoped under .h4; the tiles reuse .k-tile from the kit, the ring reuses home2's .h2x. */
export const CSS = `
.h4{overflow-x:clip;padding-bottom:120px}
.h4-wrap{max-width:1280px;margin:0 auto;padding:0 24px;box-sizing:border-box}
.h4 h1,.h4 h2,.h4 h3{font-family:var(--k-display);font-weight:800;letter-spacing:-.025em;line-height:.98;margin:0}
.h4 h2{font-size:clamp(30px,3.4vw,46px);color:var(--k-tx);margin-top:10px}
.h4-eye{font-family:var(--k-mono);font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.h4-sec{padding-top:112px}
.h4-head{display:flex;justify-content:space-between;align-items:end;gap:16px 32px;flex-wrap:wrap;margin-bottom:32px}
.h4-more{color:var(--k-t2);font:600 15px var(--k-ui);text-decoration:none;border-bottom:1px solid var(--k-hair);padding-bottom:4px;transition:color .2s,border-color .2s}
.h4-more:hover{color:var(--k-tx);border-color:var(--k-tx)}
.h4-key{display:inline-flex;align-items:center;min-height:52px;padding:0 26px;border-radius:999px;background:var(--on);color:var(--acc);font:700 16px var(--k-ui);text-decoration:none;transition:transform .2s}
.h4-key:hover{transform:translateY(-2px)}
.h4-ghost{display:inline-flex;align-items:center;min-height:52px;padding:0 22px;border-radius:999px;border:1.5px solid currentColor;color:inherit;font:600 15px var(--k-ui);text-decoration:none;opacity:.85;transition:opacity .2s}
.h4-ghost:hover{opacity:1}
.h4-fine{margin:0;color:var(--k-t3);font-size:13px;line-height:1.5}
.h4-body{animation:h4in .5s var(--k-ease) both}

/* tiles */
.h4-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding-bottom:12px}
.h4-tiles .k-tile{position:relative;overflow:hidden}
.h4-tick{position:absolute;left:0;bottom:0;height:3px;width:100%;background:var(--on);opacity:.55;transform-origin:left;animation:h4tick 8s linear both}
@keyframes h4tick{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@media (max-width:760px){.h4-tiles{grid-template-columns:1fr 1fr}.h4-tiles .k-tile{min-height:50px}.h4-tiles .k-tile small{display:none}.h4-tiles .k-tile b{font-size:15px}}

/* stage */
.h4-stage{margin-top:16px;position:relative;display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:24px;align-items:center;min-height:580px;padding:64px 64px 0;border-radius:32px;background:var(--acc);color:var(--on);overflow:hidden;animation:h4in .6s var(--k-ease) both}
.h4-stage::before{content:"";position:absolute;inset:0;background:radial-gradient(60% 80% at 85% 20%,rgba(255,255,255,.2),transparent 60%);pointer-events:none}
@keyframes h4in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.h4-copy{position:relative;z-index:2;display:flex;flex-direction:column;gap:22px;padding-bottom:64px;min-width:0}
.h4-copy .h4-eye{opacity:.7}
.h4-copy h1{font-size:clamp(40px,4.6vw,72px);color:var(--on);max-width:13ch}
.h4-copy p{font-size:clamp(17px,1.4vw,19px);line-height:1.5;max-width:44ch;margin:0;opacity:.85}
.h4-btns{display:flex;gap:10px;flex-wrap:wrap}
.h4-glance{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:6px;border-top:1px solid color-mix(in srgb,var(--on) 22%,transparent);padding-top:20px;max-width:520px}
.h4-glance span{display:flex;flex-direction:column;gap:6px;padding-right:12px}
.h4-glance b{font-family:var(--k-display);font-size:clamp(24px,2.3vw,34px);line-height:1}
.h4-glance em{font-style:normal;font-size:13px;opacity:.7}
.h4-phones{position:relative;z-index:1;height:100%;min-height:520px;align-self:end}
.h4-phone{position:absolute;bottom:-40px;width:min(240px,46%);border-radius:36px;padding:8px;background:#0a0a0c;box-shadow:0 40px 80px -30px rgba(0,0,0,.55)}
.h4-phone img{display:block;width:100%;border-radius:29px;aspect-ratio:780/1688;object-fit:cover}
.h4-phone--front{right:6%;animation:h4up .8s .1s var(--k-ease) both}
.h4-phone--back{right:46%;bottom:-90px;transform:rotate(-7deg);animation:h4up2 .8s var(--k-ease) both}
.h4-phones.solo .h4-phone--front{right:24%}
@keyframes h4up{from{transform:translateY(60px);opacity:0}to{transform:none;opacity:1}}
@keyframes h4up2{from{transform:translateY(80px) rotate(-7deg);opacity:0}to{transform:rotate(-7deg);opacity:1}}
.h4-cat{position:absolute;right:-4px;top:24px;width:108px;filter:drop-shadow(0 12px 20px rgba(0,0,0,.25));animation:h4bob 1.8s ease-in-out infinite alternate}
@keyframes h4bob{from{transform:translateY(0) rotate(-3deg)}to{transform:translateY(-10px) rotate(3deg)}}
@media (max-width:1100px){.h4-stage{padding:48px 40px 0}.h4-phone--back{display:none}.h4-phone--front{right:14%}}
@media (max-width:860px){
  .h4-stage{grid-template-columns:1fr;padding:36px 24px 0;min-height:0;border-radius:24px}
  .h4-copy{padding-bottom:0}
  .h4-copy h1{max-width:none}
  .h4-phones{min-height:340px}
  .h4-phone{width:190px;border-radius:30px;padding:7px}.h4-phone img{border-radius:24px}
  .h4-phone--front,.h4-phones.solo .h4-phone--front{right:calc(50% - 95px)}
  .h4-cat{width:80px;top:4px}
}
@media (max-width:480px){.h4-glance b{font-size:22px}.h4-phone{width:160px}.h4-phone--front,.h4-phones.solo .h4-phone--front{right:calc(50% - 80px)}.h4-phones{min-height:290px}.h4-sec{padding-top:80px}}

/* week ring */
.h4-ring.h2x{background:transparent;overflow:visible}
.h4-ring.h2x section{padding-top:0}

/* our next Episode */
.h4-ep{display:grid;grid-template-columns:200px 1fr;gap:36px;align-items:center;padding:20px;border-radius:28px;background:var(--k-raised);color:var(--k-tx);text-decoration:none;border:1px solid var(--k-hair);transition:transform .25s var(--k-ease),border-color .25s}
.h4-ep:hover{transform:translateY(-3px);border-color:#dc2626}
.h4-ep-poster{display:block;aspect-ratio:4/5;border-radius:16px;overflow:hidden;background:#0a0a0c}
.h4-ep-poster img,.h4-ep-poster svg{display:block;width:100%;height:100%;object-fit:cover}
.h4-ep-copy{display:flex;flex-direction:column;gap:10px;padding-right:16px}
.h4-ep-copy .h4-eye{color:#ff5a4f}
.h4-ep-copy b{font-family:var(--k-display);font-size:clamp(30px,3.4vw,48px);letter-spacing:-.025em;line-height:1}
.h4-ep-where{color:var(--k-t2);font-size:17px}
.h4-ep-line{color:var(--k-tx);font:600 15px var(--k-ui)}
.h4-ep-go{align-self:flex-start;margin-top:8px;display:inline-flex;align-items:center;min-height:48px;padding:0 24px;border-radius:999px;background:#dc2626;color:#fff;font:700 15px var(--k-ui)}
@media (max-width:640px){.h4-ep{grid-template-columns:120px 1fr;gap:18px;padding:14px}.h4-ep-copy b{font-size:26px}.h4-ep-where{font-size:15px}.h4-ep-copy{padding-right:0}}

/* features: one clean list, every row opens the real screen */
.h4-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:48px;border-top:1px solid var(--k-hair)}
.h4-list li{border-bottom:1px solid var(--k-hair)}
.h4-list a{display:grid;grid-template-columns:40px 1fr auto;grid-template-areas:"n t i" "n s i";gap:4px 12px;align-items:center;padding:24px 4px;color:var(--k-tx);text-decoration:none}
.h4-list em{grid-area:n;align-self:start;padding-top:4px;font:500 12px var(--k-mono);font-style:normal;color:var(--acc)}
.h4-list b{grid-area:t;font-family:var(--k-display);font-size:22px;letter-spacing:-.015em}
.h4-list span{grid-area:s;color:var(--k-t2);font-size:15px;line-height:1.45}
.h4-list i{grid-area:i;font-style:normal;font-size:20px;color:var(--k-t3);transition:transform .25s var(--k-ease),color .25s}
.h4-list a:hover i{transform:translateX(6px);color:var(--acc)}
.h4-list a:hover b{color:var(--acc)}
@media (max-width:760px){.h4-list{grid-template-columns:1fr}.h4-list a{padding:20px 0}}

/* artists */
.h4-people{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.h4-person{display:flex;flex-direction:column;gap:4px;color:var(--k-tx);text-decoration:none}
.h4-person-img{display:block;aspect-ratio:4/5;border-radius:20px;overflow:hidden;background:var(--k-raised);margin-bottom:12px}
.h4-person-img img{width:100%;height:100%;object-fit:cover;transition:transform .5s var(--k-ease)}
.h4-person:hover .h4-person-img img{transform:scale(1.04)}
.h4-person b{font-family:var(--k-display);font-size:22px;letter-spacing:-.015em}
.h4-person span{color:var(--k-t2);font-size:14px}
.h4-person em{font-style:normal;color:var(--k-t3);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.h4-records{margin-top:48px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.h4-records a{position:relative;display:block;aspect-ratio:1;border-radius:12px;overflow:hidden;background:var(--k-raised)}
.h4-records img{width:100%;height:100%;object-fit:cover;transition:transform .4s var(--k-ease)}
.h4-records span{position:absolute;inset:auto 0 0 0;padding:28px 10px 10px;background:linear-gradient(transparent,rgba(0,0,0,.85));color:rgba(255,255,255,.75);font-size:12px;line-height:1.3;opacity:0;transition:opacity .25s}
.h4-records span b{display:block;color:#fff;font:600 13px var(--k-ui);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.h4-records a:hover img{transform:scale(1.05)}.h4-records a:hover span{opacity:1}
@media (max-width:900px){.h4-people{grid-template-columns:repeat(2,minmax(0,1fr))}.h4-records{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (max-width:480px){.h4-records{grid-template-columns:repeat(3,minmax(0,1fr))}}

/* host: live invite */
.h4-try{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:24px;align-items:stretch}
.h4-form{display:flex;flex-direction:column;gap:14px;padding:32px;border-radius:28px;background:var(--k-raised);border:1px solid var(--k-hair)}
.h4-form label{display:flex;flex-direction:column;gap:8px}
.h4-form label span{font:500 12px var(--k-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--k-t3)}
.h4-form input{appearance:none;width:100%;box-sizing:border-box;min-height:52px;padding:0 16px;border-radius:14px;border:1px solid var(--k-hair);background:#0a0a0c;color:var(--k-tx);font:500 17px var(--k-ui);color-scheme:dark;transition:border-color .2s}
.h4-form input:focus{outline:none;border-color:var(--acc)}
.h4-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:14px;background:#0a0a0c;border:1px solid var(--k-hair)}
.h4-seg button{appearance:none;border:0;min-height:44px;border-radius:10px;background:transparent;color:var(--k-t2);font:600 15px var(--k-ui);cursor:pointer;transition:background .2s,color .2s}
.h4-seg button[aria-checked="true"]{background:var(--acc);color:var(--on)}
.h4-cta{margin-top:auto;display:inline-flex;justify-content:center;align-items:center;min-height:56px;border-radius:999px;background:var(--acc);color:var(--on);font:700 16px var(--k-ui);text-decoration:none;transition:transform .2s}
.h4-cta:hover{transform:translateY(-2px)}
.h4-invite{display:grid;place-items:center;padding:40px;border-radius:28px;background:radial-gradient(80% 80% at 50% 0%,color-mix(in srgb,var(--acc) 22%,transparent),transparent 70%),var(--k-raised);border:1px solid var(--k-hair)}
.h4-invite-card{width:min(340px,100%);border-radius:24px;overflow:hidden;background:#0a0a0c;box-shadow:0 40px 80px -30px rgba(0,0,0,.7);transform:rotate(-2deg);transition:transform .4s var(--k-ease)}
.h4-invite-card:hover{transform:rotate(0)}
.h4-invite-art{display:block;aspect-ratio:4/5}
.h4-invite-art svg{display:block;width:100%;height:100%}
.h4-invite-foot{display:grid;grid-template-columns:1fr auto;grid-template-areas:"t b" "w b";gap:2px 12px;align-items:center;padding:16px 18px}
.h4-invite-foot b{grid-area:t;font:700 16px var(--k-ui);color:var(--k-tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.h4-invite-foot span{grid-area:w;font-size:13px;color:var(--k-t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.h4-invite-foot em{grid-area:b;font-style:normal;padding:10px 16px;border-radius:999px;background:var(--acc);color:var(--on);font:700 13px var(--k-ui)}
@media (max-width:860px){.h4-try{grid-template-columns:1fr}.h4-invite{order:-1;padding:28px}.h4-form{padding:22px}}

/* school: beat maker */
.h4-beat{padding:32px;border-radius:28px;background:var(--k-raised);border:1px solid var(--k-hair);display:flex;flex-direction:column;gap:24px}
.h4-beat-top{display:flex;align-items:center;gap:16px}
.h4-play{appearance:none;border:0;cursor:pointer;min-width:112px;min-height:52px;padding:0 24px;border-radius:999px;background:var(--acc);color:var(--on);font:700 16px var(--k-ui);transition:transform .2s}
.h4-play:hover{transform:translateY(-2px)}
.h4-beat-meta{font:500 13px var(--k-mono);color:var(--k-t3);letter-spacing:.04em}
.h4-clear{margin-left:auto;appearance:none;background:none;border:1px solid var(--k-hair);color:var(--k-t2);min-height:40px;padding:0 16px;border-radius:999px;font:600 14px var(--k-ui);cursor:pointer}
.h4-grid{display:flex;flex-direction:column;gap:8px}
.h4-gridrow{display:grid;grid-template-columns:64px repeat(16,minmax(0,1fr));gap:6px;align-items:center}
.h4-rowname{font:500 12px var(--k-mono);color:var(--k-t2);text-transform:uppercase;letter-spacing:.06em}
.h4-gridrow button{appearance:none;border:0;cursor:pointer;aspect-ratio:1;border-radius:10px;background:#1d1d22;box-shadow:inset 0 -3px 0 rgba(0,0,0,.35);transition:background .12s,transform .12s}
.h4-gridrow button.bar{background:#26262c}
.h4-gridrow button[aria-pressed="true"]{background:var(--acc);box-shadow:0 0 18px -4px var(--acc),inset 0 -3px 0 rgba(0,0,0,.2)}
.h4-gridrow button.now{transform:scale(.9);outline:2px solid rgba(255,255,255,.55);outline-offset:1px}
@media (max-width:760px){.h4-beat{padding:18px}.h4-gridrow{grid-template-columns:44px repeat(16,minmax(0,1fr));gap:3px}.h4-gridrow button{border-radius:5px}.h4-rowname{font-size:10px}}

/* the other apps */
.h4-other-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.h4-other{appearance:none;border:0;cursor:pointer;text-align:left;font:inherit;display:flex;flex-direction:column;gap:12px;min-height:220px;padding:28px;border-radius:28px;background:var(--c);color:var(--on);transition:transform .25s var(--k-ease)}
.h4-other:hover{transform:translateY(-4px)}
.h4-other .h4-eye{opacity:.7}
.h4-other b{font-family:var(--k-display);font-size:clamp(22px,2vw,28px);letter-spacing:-.02em;line-height:1.05}
.h4-other em{margin-top:auto;font-style:normal;font:700 15px var(--k-ui)}
@media (max-width:860px){.h4-other-grid{grid-template-columns:1fr}.h4-other{min-height:0}}
`;
