/** Styles for the For pages, on top of the home's (.h2x). The page colour is --fc. */
export const CSS = `
.fp-key{display:inline-flex;align-items:center;height:56px;padding:0 26px;border-radius:28px;font-weight:600;font-size:16px;color:#0A0A0B;background:linear-gradient(180deg,color-mix(in srgb,var(--fc) 80%,#fff),var(--fc));box-shadow:inset 0 1.5px 0 rgba(255,255,255,.45),0 2px 0 color-mix(in srgb,var(--fc) 70%,#000),0 4px 0 color-mix(in srgb,var(--fc) 50%,#000),0 16px 30px -10px color-mix(in srgb,var(--fc) 60%,transparent);transition:transform .15s}
.fp-key:active{transform:translateY(3px)}
.fp-hero{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:48px;align-items:center;padding-top:clamp(48px,7vw,96px)!important}
.fp-hero h1{font-size:clamp(48px,7.4vw,112px);margin-top:18px}
.fp-hero p{font-size:clamp(17px,1.45vw,21px);color:var(--t2);max-width:620px;line-height:1.45;margin:24px 0 0}
.fp-phones{position:relative;height:clamp(380px,40vw,560px)}
.fp-ph{position:absolute;top:calc(var(--i)*28px);left:calc(var(--i)*26%);width:min(46%,250px);aspect-ratio:390/844;border-radius:34px;overflow:hidden;background:#111;box-shadow:0 0 0 7px #1b1c20,0 0 0 8px #2a2b30,0 40px 70px -30px #000;transform:rotate(calc((var(--i) - 1)*5deg));animation:fp-rise .7s cubic-bezier(.2,.9,.2,1) both;animation-delay:calc(var(--i)*90ms)}
.fp-ph:nth-child(2){z-index:2}
.fp-ph img,.fp-shot img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.fp-gets{display:flex;flex-direction:column;gap:clamp(40px,6vw,96px)}
.fp-get{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,360px);gap:clamp(28px,5vw,80px);align-items:center}
.fp-get.fp-flip{grid-template-columns:minmax(0,360px) minmax(0,1fr)}
.fp-get.fp-flip .fp-shot{order:-1}
.fp-app{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-mono),monospace;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--t2)}
.fp-app i{width:9px;height:9px;border-radius:50%;background:var(--ac);box-shadow:0 0 10px var(--ac)}
.fp-app em{font-style:normal;margin-left:6px;padding:2px 8px;border-radius:8px;background:rgba(255,255,255,.08);color:var(--tx)}
.fp-get h3{font-size:clamp(32px,3.6vw,52px);margin-top:14px}
.fp-get p{color:var(--t2);font-size:17px;line-height:1.5;margin:14px 0 0;max-width:560px}
.fp-get ul{list-style:none;padding:0;margin:20px 0 0;max-width:560px}
.fp-get li{padding:12px 0 12px 28px;border-top:1px solid var(--hair);position:relative;font-size:15px}
.fp-get li::before{content:"";position:absolute;left:4px;top:19px;width:10px;height:6px;border-left:2px solid var(--fc);border-bottom:2px solid var(--fc);transform:rotate(-45deg)}
.fp-shot{display:block;width:100%;max-width:360px;aspect-ratio:390/844;border-radius:40px;overflow:hidden;background:#111;box-shadow:0 0 0 8px #1b1c20,0 0 0 9px #2a2b30,0 50px 80px -40px #000;justify-self:center}
.fp-money{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.fp-money>div{padding:clamp(24px,3vw,40px);border-radius:28px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px var(--hair)}
.fp-money h2{font-size:clamp(32px,3.6vw,52px)}
.fp-money ul{list-style:none;padding:0;margin:20px 0 0}
.fp-money li{padding:12px 0;border-top:1px solid var(--hair);font-size:16px}
.fp-money dl{margin:20px 0 0}
.fp-money dl>div{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-top:1px solid var(--hair)}
.fp-money dt{font-size:16px}.fp-money dd{margin:0;font-weight:600;text-align:right;color:var(--fc)}
.fp-small{color:var(--t3);font-size:13px;line-height:1.5;margin:16px 0 0}
.fp-loop{display:flex;align-items:center;gap:clamp(20px,4vw,56px);padding:clamp(28px,4vw,56px);border-radius:32px;background:color-mix(in srgb,var(--fc) 14%,#0E0E10);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--fc) 30%,transparent)}
.fp-loop img{width:clamp(110px,14vw,180px);flex:none;animation:h2-bob 1.9s ease-in-out infinite}
.fp-loop h2{font-size:clamp(30px,3.4vw,48px)}
.fp-loop p{color:var(--t2);font-size:17px;line-height:1.5;margin:14px 0 0;max-width:680px}
.fp-faq{display:grid;grid-template-columns:1fr 1fr;gap:0 40px}
.fp-faq details{border-top:1px solid var(--hair);padding:18px 0}
.fp-faq summary{cursor:pointer;font-size:18px;font-weight:600;list-style:none}
.fp-faq summary::-webkit-details-marker{display:none}
.fp-faq summary::after{content:"+";float:right;color:var(--t3)}
.fp-faq details[open] summary::after{content:"–"}
.fp-faq p{color:var(--t2);font-size:15px;line-height:1.55;margin:10px 0 0}
.fp-end{text-align:center}
.fp-end h2{font-size:clamp(44px,6vw,88px)}
@keyframes fp-rise{from{opacity:.2;transform:translateY(30px) rotate(calc((var(--i) - 1)*5deg))}to{opacity:1}}
@media (max-width:860px){
  .fp-hero{grid-template-columns:1fr}
  .fp-phones{height:360px}
  .fp-get,.fp-get.fp-flip{grid-template-columns:1fr}
  .fp-get.fp-flip .fp-shot{order:0}
  .fp-shot{max-width:260px}
  .fp-money,.fp-faq{grid-template-columns:1fr}
  .fp-loop{flex-direction:column;align-items:flex-start}
}
@media (prefers-reduced-motion:reduce){.fp-ph,.fp-loop img{animation:none}}
`;
