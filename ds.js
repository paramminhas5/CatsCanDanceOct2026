/* Opus, the CCD design system: core and signature behaviours.
   Every component is wired by a data-c attribute, so the lab and the pages share one implementation.
   Needs tokens.css and ds.css. object.js adds the WebGL object, ds-product.js the product pieces. */
(()=>{
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const ms=n=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n));
const D=window.CCDDATA||{};
const CCD=window.CCD=window.CCD||{};
CCD.$=$;CCD.$$=$$;CCD.RM=RM;CCD.ms=ms;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));CCD.esc=esc;
const EY2='<span class="eyes"><i class="eye"></i><i class="eye"></i></span>',EY1='<span class="eyes xs"><i class="eye"></i><i class="eye"></i></span>';CCD.EY2=EY2;CCD.EY1=EY1;
const vib=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};

/* ================= EYES ================= */
const ptr=CCD.ptr={x:innerWidth*.6,y:innerHeight*.3,touch:false,t:0,tap:0};
addEventListener('pointermove',e=>{ptr.x=e.clientX;ptr.y=e.clientY;ptr.touch=e.pointerType==='touch';ptr.t=performance.now()},{passive:true});
addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'){ptr.x=e.clientX;ptr.y=e.clientY;ptr.tap=performance.now()}},{passive:true});
const EYESEL='.eyes, .b1 > .eye, .btn.one > .eye, .seeall > .eye, .chip > .eye, .vinyl, .eyeb';
const vis=new Set(),st=new WeakMap();
const io=new IntersectionObserver(es=>es.forEach(en=>en.isIntersecting?vis.add(en.target):vis.delete(en.target)));
function collect(root=document){$$(EYESEL,root).forEach((el,i)=>{if(el._eye)return;el._eye=1;io.observe(el);const d=(-(Math.random()*6)).toFixed(2)+'s';el.style.setProperty('--bd',d);$$('.eye',el).forEach(x=>x.style.setProperty('--bd',d))})}
function tick(now){const idle=now-ptr.t>2500||ptr.touch;const L=CCD.laser&&CCD.laser.on?CCD.laser.pos:null;
  vis.forEach(el=>{const r=el.getBoundingClientRect();if(!r.width)return;let s=st.get(el);if(!s){s={x:0,y:0,ph:Math.random()*6};st.set(el,s)}
    const host=el.closest('.btn,.seeall,.mood,.chip')||el;
    if(host.classList.contains('is-disabled'))return;
    let tx,ty,k1=.18;const cx=r.left+r.width/2,cy=r.top+r.height/2;
    const look=(x,y,full)=>{const dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy)||1,m=full?1:Math.min(1,d/220);tx=dx/d*m;ty=dy/d*m};
    if(host.classList.contains('is-loading')){if(RM){tx=0;ty=0}else{tx=Math.sin(now/240+s.ph);ty=Math.sin(now/120+s.ph)*.7;k1=.35}}
    else if(L){look(L.x,L.y,true);k1=.4}
    else if(host.classList.contains('is-focus')||host.matches(':focus-visible')){tx=0;ty=0}
    else if(host.classList.contains('is-empty')){tx=0;ty=1}
    else if(host.classList.contains('seeall')&&(host.matches(':hover')||host.classList.contains('is-hover'))){tx=1;ty=0}
    else if(ptr.tap&&now-ptr.tap<1800)look(ptr.x,ptr.y,true);
    else if(idle&&!RM){const k=r.left*.01;tx=Math.sin(now/1700+k)*.8;ty=Math.cos(now/2300+k)*.5}
    else look(ptr.x,ptr.y);
    s.x+=(tx-s.x)*k1;s.y+=(ty-s.y)*k1;el.style.setProperty('--px',s.x.toFixed(3));el.style.setProperty('--py',s.y.toFixed(3))});
  requestAnimationFrame(tick)}
requestAnimationFrame(tick);
function pounce(el){if(!el||RM)return;el.classList.remove('pn');void el.offsetWidth;el.classList.add('pn');setTimeout(()=>el.classList.remove('pn'),ms('--d-move')+40)}
function nearest(){let best=null,bd=1e9;const P=CCD.laser&&CCD.laser.on?CCD.laser.pos:ptr;vis.forEach(el=>{if(!(el.classList.contains('eyes')||el.classList.contains('vinyl')))return;if(el.closest('.is-disabled,.is-loading,.is-done,.is-error,.st,.mood'))return;const r=el.getBoundingClientRect();const d=Math.hypot(P.x-r.left-r.width/2,P.y-r.top-r.height/2);if(d<bd){bd=d;best=el}});return best}
(function sched(){const on=CCD.laser&&CCD.laser.on;setTimeout(()=>{pounce(nearest());sched()},on?1000+Math.random()*1000:6000+Math.random()*4000)})();
CCD.eyes={collect,pounce};

/* ================= BUTTON STATES (shared by every eye button) ================= */
function peek(b){const e=$('.eye',b);if(!e)return;e.classList.remove('peek');void e.offsetWidth;e.classList.add('peek');setTimeout(()=>e.classList.remove('peek'),ms('--d-scene')+40)}
CCD.peek=peek;
function reasonFor(b){const id=b.getAttribute('aria-describedby');return id?document.getElementById(id):null}
function reach(b){peek(b);const m=reasonFor(b);if(m&&b.dataset.why){m.textContent=b.dataset.why;clearTimeout(m._t);m._t=setTimeout(()=>m.textContent='',2600)}}
document.addEventListener('pointerover',e=>{const b=e.target.closest('.btn.is-disabled');if(b&&!b.contains(e.relatedTarget))reach(b)});
document.addEventListener('focusin',e=>{const b=e.target.closest('.btn.is-disabled');if(b)reach(b)});
document.addEventListener('click',e=>{const b=e.target.closest('.btn.is-disabled,[aria-disabled=true]');if(b){e.preventDefault();e.stopPropagation();reach(b)}},true);
CCD.setLabel=(b,t)=>{const l=$('.lab',b);if(!l)return;l.style.opacity=0;setTimeout(()=>{l.textContent=t;l.style.opacity=1},ms('--d-quick'))};
CCD.done=(b,label)=>{b.classList.remove('is-loading');b.classList.add('is-done','is-blink');if(label)CCD.setLabel(b,label);setTimeout(()=>b.classList.remove('is-blink'),ms('--d-scene'))};
CCD.fail=(b,label)=>{b.classList.remove('is-loading');b.classList.add('is-error');b.classList.remove('is-hiss');void b.offsetWidth;b.classList.add('is-hiss');if(label)CCD.setLabel(b,label)};
CCD.work=(b,label,ms_,ok=true,doneLabel)=>new Promise(res=>{b.classList.add('is-loading');b.setAttribute('aria-busy','true');if(label)CCD.setLabel(b,label);setTimeout(()=>{b.removeAttribute('aria-busy');ok?CCD.done(b,doneLabel):CCD.fail(b,doneLabel);res()},ms_||1100)});

/* ================= INIT REGISTRY ================= */
const R={};CCD.def=(name,fn)=>{R[name]=fn};
CCD.init=(root=document)=>{$$('[data-c]',root).forEach(el=>{if(el._c)return;const f=R[el.dataset.c];if(f){el._c=1;try{f(el)}catch(err){console.error('init',el.dataset.c,err)}}});collect(root)};

/* ================= CORE ================= */
/* header backing */
CCD.def('bar',el=>{const f=()=>el.classList.toggle('scrolled',scrollY>4);addEventListener('scroll',f,{passive:true});f()});
/* chips: single (data-single) or multi */
CCD.def('chips',el=>{$$('.chip',el).forEach(c=>{if(!$('.eye',c))c.insertAdjacentHTML('afterbegin',EY1)});el.addEventListener('click',e=>{const c=e.target.closest('.chip');if(!c||c.classList.contains('is-disabled'))return;if(el.hasAttribute('data-single'))$$('.chip',el).forEach(x=>x.setAttribute('aria-pressed',x===c));else{c.setAttribute('aria-pressed',c.getAttribute('aria-pressed')!=='true');const all=$('.chip[data-v=all]',el);if(all){if(c===all)$$('.chip',el).forEach(x=>x.setAttribute('aria-pressed',x===all));else{all.setAttribute('aria-pressed','false');if(!$('.chip[aria-pressed=true]',el))all.setAttribute('aria-pressed','true')}}}el.dispatchEvent(new CustomEvent('ccd:chips',{bubbles:true,detail:$$('.chip[aria-pressed=true]',el).map(x=>x.dataset.v)}))})});
/* tabs: arrows move, the line follows */
CCD.def('tabs',el=>{const tabs=$$('[role=tab]',el),line=$('.tabline',el);
  const sel=(t,f)=>{tabs.forEach(x=>{const on=x===t;x.setAttribute('aria-selected',on);x.tabIndex=on?0:-1;const p=x.getAttribute('aria-controls');if(p){const P=document.getElementById(p);if(P)P.hidden=!on}});if(f)t.focus();if(line){line.style.setProperty('--lx',t.offsetLeft+'px');line.style.setProperty('--lw',t.offsetWidth+'px');line.classList.remove('swish');void line.offsetWidth;line.classList.add('swish')}el.dispatchEvent(new CustomEvent('ccd:tab',{bubbles:true,detail:t.dataset.v}))};
  el.addEventListener('click',e=>{const t=e.target.closest('[role=tab]');if(t)sel(t)});
  el.addEventListener('keydown',e=>{const i=tabs.indexOf(document.activeElement);if(i<0)return;const d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(d){e.preventDefault();sel(tabs[(i+d+tabs.length)%tabs.length],1)}});
  const first=tabs.find(t=>t.getAttribute('aria-selected')==='true')||tabs[0];requestAnimationFrame(()=>sel(first));addEventListener('resize',()=>{const t=tabs.find(x=>x.getAttribute('aria-selected')==='true');if(t&&line){line.style.setProperty('--lx',t.offsetLeft+'px');line.style.setProperty('--lw',t.offsetWidth+'px')}})});
/* field with a tail: curled is checking, up is good, flick is no */
const RULES={handle:v=>/^@?[a-z0-9_.]{3,30}$/i.test(v),email:v=>/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v),code:v=>/^[a-z0-9]{4,8}$/i.test(v),name:v=>v.trim().length>1,any:v=>v.length>0};
CCD.def('tail',el=>{const inp=$('input,textarea',el),msg=$('.fmsg',el),rule=RULES[el.dataset.rule||'any'];let t;
  inp.addEventListener('input',()=>{clearTimeout(t);el.classList.remove('is-good','is-no');if(!inp.value){el.classList.remove('is-checking');return}el.classList.add('is-checking');t=setTimeout(()=>{el.classList.remove('is-checking');const ok=rule(inp.value);el.classList.add(ok?'is-good':'is-no');inp.setAttribute('aria-invalid',!ok);if(msg)msg.textContent=ok?(el.dataset.ok||''):(el.dataset.no||'That doesn\'t look right')},600)})});
/* sheet and menu */
let lastFocus=null;
function openSheet(id){const s=document.getElementById(id);if(!s)return;lastFocus=document.activeElement;s.classList.add('on');s.setAttribute('aria-hidden','false');const sc=$('.scrim[data-for="'+id+'"]')||$('.scrim');sc&&sc.classList.add('on');const f=$('button,a,input',s);f&&setTimeout(()=>f.focus(),60)}
function closeSheets(){$$('.sheet.on').forEach(s=>{s.classList.remove('on');s.setAttribute('aria-hidden','true')});$$('.scrim.on').forEach(s=>s.classList.remove('on'));lastFocus&&lastFocus.focus&&lastFocus.focus()}
CCD.openSheet=openSheet;CCD.closeSheets=closeSheets;
document.addEventListener('click',e=>{const o=e.target.closest('[data-open]');if(o){e.preventDefault();openSheet(o.dataset.open)}if(e.target.closest('.scrim,[data-close]'))closeSheets()});
addEventListener('keydown',e=>{if(e.key==='Escape'){closeSheets();if(CCD.laser&&CCD.laser.on)CCD.laser.set(false)}});
/* prompt: offered once after a little scrolling */
CCD.def('prompt',el=>{let shown=false;const f=()=>{if(shown)return;if(scrollY>innerHeight*.33){shown=true;el.classList.add('on');setTimeout(()=>el.classList.remove('on'),9000)}};addEventListener('scroll',f,{passive:true});
  el.addEventListener('click',e=>{if(e.target.closest('[data-dismiss]'))el.classList.remove('on');const p=e.target.closest('[data-play]');if(p){el.classList.remove('on');document.dispatchEvent(new CustomEvent('ccd:sound'))}});
  if(el.hasAttribute('data-demo'))el.addEventListener('ccd:show',()=>{el.classList.add('on')})});

/* ================= LASER AND ITS CAT =================
   Turn the laser on and the Cats Can Dance cat comes for the dot: it dances in, stalks, flips onto the dot when you stop,
   then stands on it with its arms crossed. Every pair of eyes on the page watches the dot. The dot leaves a short red trail. */
const L=CCD.laser={on:false,pos:{x:-99,y:-99},entry:'edge'};
let dot,cat,trail,tctx,pts=[],catState='off',catX=0,catY=0,face=1,lastMove=0;
const ROOT=()=>{const s=document.querySelector('script[src$="ds.js"]');return s?s.getAttribute('src').replace(/ds\.js$/,''):''};
function mkLaser(){if(dot)return;const r=ROOT();dot=document.createElement('div');dot.className='ldot';dot.setAttribute('aria-hidden','true');document.body.appendChild(dot);
  cat=document.createElement('div');cat.className='lcat';cat.setAttribute('aria-hidden','true');
  cat.innerHTML=`<img class="c-walk" src="${r}assets/img/cat_dance.png" alt=""><img class="c-jump" src="${r}assets/img/cat_hand.png" alt=""><img class="c-sit" src="${r}assets/img/cat_cap.png" alt=""><span class="c-bub">Got it</span>`;document.body.appendChild(cat);
  trail=document.createElement('canvas');trail.className='ltrail';trail.setAttribute('aria-hidden','true');document.body.appendChild(trail);tctx=trail.getContext('2d')}
function chirp(up){const c=AC;if(!c)return;const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(up?520:900,t);o.frequency.exponentialRampToValueAtTime(up?1300:420,t+.16);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.18,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.22);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.25)}
L.set=on=>{mkLaser();L.on=on;document.body.classList.toggle('laser-on',on);$$('[data-laser]').forEach(b=>b.setAttribute('aria-pressed',on));
  if(on){A.ctx();L.pos={x:ptr.x,y:ptr.y};lastMove=performance.now();dot.classList.add('on');if(catState==='off'||catState==='leave')setTimeout(enter,RM?0:450)}else{dot.classList.remove('on','caught');pts=[];if(catState!=='off')leave()}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-laser]');if(b){e.stopPropagation();L.set(!L.on)}});
addEventListener('pointermove',e=>{if(!L.on||catState==='caught')return;L.pos={x:e.clientX,y:e.clientY};lastMove=performance.now();pts.push({x:e.clientX,y:e.clientY,t:lastMove})},{passive:true});
function startPoint(){const W=innerWidth,H=innerHeight,p=L.pos;const hdr=$('.nav-top');
  if(L.entry==='header'&&hdr){const r=hdr.getBoundingClientRect();return{x:Math.min(W-80,Math.max(80,p.x)),y:r.bottom}}
  if(L.entry==='object'){const o=$('.story-obj,.obj-stage');if(o){const r=o.getBoundingClientRect();if(r.bottom>0&&r.top<H)return{x:r.left+r.width/2,y:r.top+r.height/2}}}
  const d=[[p.x,'l'],[W-p.x,'r'],[H-p.y,'b']].sort((a,b)=>a[0]-b[0])[0][1];
  return d==='l'?{x:-160,y:Math.min(H-90,Math.max(160,p.y))}:d==='r'?{x:W+160,y:Math.min(H-90,Math.max(160,p.y))}:{x:Math.min(W-90,Math.max(90,p.x)),y:H+160}}
const setPose=p=>{cat.dataset.pose=p};
function enter(){if(!L.on)return;const s=startPoint();catX=s.x;catY=s.y;catState='enter';cat.className='lcat on';setPose('walk');chirp(true);if(RM){catState='sit';catX=L.pos.x;catY=L.pos.y;setPose('sit');place()}}
function leave(){catState='leave';cat.classList.remove('caught');setPose('walk')}
function place(rot=0){const s=cat.offsetWidth/2;cat.style.transform=`translate(${catX-s}px,${catY-s*1.6}px) scaleX(${face}) rotate(${rot}deg)`}
function catTick(now){
  if(trail){const W=innerWidth,H=innerHeight;if(trail.width!==W||trail.height!==H){trail.width=W;trail.height=H}tctx.clearRect(0,0,W,H);pts=pts.filter(p=>now-p.t<380);
    if(L.on&&pts.length>1){tctx.lineCap='round';for(let i=1;i<pts.length;i++){const a=1-(now-pts[i].t)/380;tctx.strokeStyle=`rgba(255,68,56,${a*.7})`;tctx.lineWidth=2+a*6;tctx.beginPath();tctx.moveTo(pts[i-1].x,pts[i-1].y);tctx.lineTo(pts[i].x,pts[i].y);tctx.stroke()}}}
  if(cat&&catState!=='off'){const p=L.pos;const dx=p.x-catX,dy=p.y-catY,d=Math.hypot(dx,dy);
    if(catState==='enter'||catState==='stalk'){face=dx>=0?1:-1;const want=catState==='enter'?150:120;if(d>want){const sp=catState==='enter'?9:Math.min(9,2+d/40);catX+=dx/d*sp;catY+=dy/d*sp;cat.classList.add('moving')}else{catState='stalk';cat.classList.remove('moving')}
      if(catState==='stalk'&&now-lastMove>650&&d<260){catState='pounce';setPose('jump');chirp(false);const sx=catX,sy=catY,t0=now,tx=p.x,ty=p.y;const T=ms('--d-move')*1.4;
        const jump=t=>{const k=Math.min(1,(t-t0)/T);catX=sx+(tx-sx)*k;catY=sy+(ty-sy)*k-Math.sin(k*Math.PI)*110;place(face*k*360);if(k<1)requestAnimationFrame(jump);else caught()};requestAnimationFrame(jump)}}
    else if(catState==='leave'){face=catX<innerWidth/2?-1:1;catX+=face*10;cat.classList.add('moving');if(catX<-260||catX>innerWidth+260){catState='off';cat.className='lcat'}}
    if(catState!=='pounce')place()}
  if(dot&&L.on&&catState!=='caught')dot.style.transform=`translate(${L.pos.x}px,${L.pos.y}px)`;
  requestAnimationFrame(catTick)}
function caught(){catState='caught';setPose('sit');cat.classList.add('caught');cat.classList.remove('moving');dot.classList.add('caught');vib(30);place();
  if(CCD.pageTrack&&CCD.pageTrack.on)CCD.pageTrack.drop&&CCD.pageTrack.drop();CCD.fx&&CCD.fx.burst(L.pos.x,L.pos.y);
  setTimeout(()=>{L.set(false)},2600)}
requestAnimationFrame(catTick);
CCD.def('laser-entry',el=>{el.addEventListener('click',e=>{const b=e.target.closest('[data-entry]');if(!b)return;L.entry=b.dataset.entry;$$('[data-entry]',el).forEach(x=>x.setAttribute('aria-pressed',x===b));if(!L.on)L.set(true)})});

/* ================= AUDIO: one shared engine ================= */
let AC=null;const A=CCD.audio={};
A.ctx=()=>{if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC};
function noiseBuf(c,len){const b=c.createBuffer(1,len*c.sampleRate,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b}
A.voice=(c,dest,name,t,opt={})=>{const g=c.createGain();g.connect(dest);
  if(name==='kick'){const o=c.createOscillator();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(.95,t);g.gain.exponentialRampToValueAtTime(.001,t+.42);o.connect(g);o.start(t);o.stop(t+.45)}
  else if(name==='clap'||name==='hat'){const n=c.createBufferSource();n.buffer=A._nb||(A._nb=noiseBuf(c,.5));const f=c.createBiquadFilter();f.type=name==='hat'?'highpass':'bandpass';f.frequency.value=name==='hat'?7000:1400;n.connect(f);f.connect(g);const L=name==='hat'?.05:.2;g.gain.setValueAtTime(name==='hat'?.28:.5,t);g.gain.exponentialRampToValueAtTime(.001,t+L);n.start(t);n.stop(t+L+.02)}
  else if(name==='bass'){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=opt.f||55;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=opt.cut||420;o.connect(f);f.connect(g);g.gain.setValueAtTime(.32,t);g.gain.exponentialRampToValueAtTime(.001,t+.24);o.start(t);o.stop(t+.26)}};
/* a two-bar loop rendered once, used by the scratch record and the page soundtrack */
A.loop=async()=>{if(A._loop)return A._loop;const c=A.ctx();if(!c)return null;const bpm=122,step=60/bpm/4,len=step*32;const oc=new OfflineAudioContext(2,Math.ceil(len*c.sampleRate),c.sampleRate);const m=oc.createGain();m.gain.value=.8;m.connect(oc.destination);
  for(let i=0;i<32;i++){const t=i*step;if(i%4===0)A.voice(oc,m,'kick',t);if(i%8===4)A.voice(oc,m,'clap',t);if(i%2===1)A.voice(oc,m,'hat',t);if([2,6,10,14,18,22,27,30].includes(i))A.voice(oc,m,'bass',t,{f:[55,55,65.4,49][Math.floor(i/8)]})}
  A._loop=await oc.startRendering();return A._loop};

/* ================= DEEZER: real 30 second previews, fetched when you press play =================
   The API is read with JSONP (it has no CORS), the previews themselves allow any origin, so they decode into the deck and scratch.
   Where the network is closed (the claude.ai preview), every caller falls back to a loop we make. */
const DZ=CCD.dz={c:{}};
/* on our own site the server route reads Deezer (it works from any country); elsewhere we try Deezer directly */
DZ.api=/^https?:/.test(location.protocol)&&!/claude|usercontent|localhost:8765/.test(location.host)?'/api/':null;
const jsonp=path=>new Promise((res,rej)=>{const cb='dz'+Math.random().toString(36).slice(2);const sc=document.createElement('script');let to;const clean=()=>{clearTimeout(to);try{delete window[cb]}catch(_){window[cb]=undefined}sc.remove()};
  to=setTimeout(()=>{clean();rej('timeout')},5000);window[cb]=d=>{clean();d&&!d.error?res(d):rej('error')};sc.onerror=()=>{clean();rej('blocked')};
  sc.src='https://api.deezer.com/'+path+(path.includes('?')?'&':'?')+'output=jsonp&callback='+cb;document.head.appendChild(sc)});
DZ.jsonp=path=>DZ.c[path]||(DZ.c[path]=(async()=>{if(DZ.api){try{const r=await fetch(DZ.api+'dz?p='+encodeURIComponent(path));const j=await r.json();if(j&&!j.error)return j}catch(e){}}return jsonp(path)})().catch(e=>{delete DZ.c[path];throw e}));
const norm=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');CCD.norm=norm;
DZ.album=id=>DZ.jsonp('album/'+id);
DZ.cover=(id,s='medium')=>DZ.api?`${DZ.api}cover?id=${id}&s=${s}`:`https://api.deezer.com/album/${id}/image?size=${s}`;
DZ.findArtist=async name=>{const s_=await DZ.jsonp('search/artist?q='+encodeURIComponent(name)+'&limit=5');return (s_.data||[]).find(x=>norm(x.name)===norm(name))||null};
DZ.artistTop=async name=>{const ar=await DZ.findArtist(name);if(!ar)throw 'none';const t=await DZ.jsonp('artist/'+ar.id+'/top?limit=10');return{artist:ar,tracks:t.data||[]}};
DZ.buf=async url=>{const c=A.ctx();const src=DZ.api?DZ.api+'pv?u='+encodeURIComponent(url):url;const r=await fetch(src);if(!r.ok)throw 'http';return await c.decodeAudioData(await r.arrayBuffer())};

/* ================= DECK: one engine for every record you can play and scratch =================
   Tap to play or stop. Drag round the record to scratch, forwards and backwards. Drop an audio file on it to scratch that. */
const GENRE_BPM=g=>{g=(g||[]).join(' ').toLowerCase();return /drum|dnb|jungle/.test(g)?172:/techno/.test(g)?128:/bass|dubstep|grime/.test(g)?140:/hip|rap|drill/.test(g)?92:/ambient|experimental|downtempo|live/.test(g)?104:/house|disco|garage/.test(g)?122:120};
const hashS=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};
A.loops={};
A.artistLoop=async a=>{const id=a&&a.id||'ccd';if(A.loops[id])return A.loops[id];const c=A.ctx();if(!c)return null;
  const bpm=GENRE_BPM(a&&a.g),step=60/bpm/4,len=step*32;const oc=new OfflineAudioContext(2,Math.ceil(len*c.sampleRate),c.sampleRate);const m=oc.createGain();m.gain.value=.8;m.connect(oc.destination);
  let h=hashS(id);const rnd=()=>{h=Math.imul(h^(h>>>13),1274126177)>>>0;return (h&1023)/1023};const scale=[0,3,5,7,10,12];const root=[41.2,43.65,46.25,49,55][Math.floor(rnd()*5)];
  const hip=bpm<100;const notes=Array.from({length:8},()=>scale[Math.floor(rnd()*scale.length)]);const lead=Array.from({length:32},(_,i)=>rnd()>.78?scale[Math.floor(rnd()*scale.length)]+12:null);
  for(let i=0;i<32;i++){const t=i*step;if(hip?[0,7,10,16,23,26].includes(i):i%4===0)A.voice(oc,m,'kick',t);if(i%8===4)A.voice(oc,m,'clap',t);if(hip?i%2===0:i%2===1)A.voice(oc,m,'hat',t);
    if(rnd()>.55&&i%2===0)A.voice(oc,m,'bass',t,{f:root*Math.pow(2,notes[i>>2]/12),cut:300+rnd()*700});
    if(lead[i]!=null){const o=oc.createOscillator(),g=oc.createGain(),f=oc.createBiquadFilter();o.type='triangle';o.frequency.value=root*4*Math.pow(2,lead[i]/12);f.type='lowpass';f.frequency.value=2400;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+.25);o.connect(f);f.connect(g);g.connect(m);o.start(t);o.stop(t+.3)}}
  A.loops[id]=await oc.startRendering();A.loops[id].bpm=bpm;return A.loops[id]};
CCD.decks=new Set();
CCD.deck=(el,rec,opt={})=>{let buf=null,playing=false,src=null,startAt=0,offset=0,ang=0,drag=null,rev=null,g=null;const REV=1.8;const D_={el};
  const getBuf=async()=>{if(buf)return buf;buf=await (opt.load?opt.load():A.loop());rev=null;return buf};
  const pos=()=>playing&&AC&&buf?(offset+(AC.currentTime-startAt))%buf.duration:offset;
  const stopSrc=()=>{if(src){try{src.stop()}catch(e){}src=null}};
  async function play(){const c=A.ctx();if(!c)return;await getBuf();CCD.decks.forEach(d=>d!==D_&&d.stop());if(CCD.pageTrack&&CCD.pageTrack.on)CCD.pageTrack.stop();
    stopSrc();src=c.createBufferSource();src.buffer=buf;src.loop=true;g=c.createGain();g.gain.value=.9;src.connect(g);g.connect(c.destination);offset=offset%buf.duration;startAt=c.currentTime;src.start(0,offset);playing=true;CCD.decks.add(D_);el.classList.add('playing');opt.onPlay&&opt.onPlay(true)}
  function stop(){if(!playing)return;offset=pos();stopSrc();playing=false;el.classList.remove('playing');opt.onPlay&&opt.onPlay(false)}
  D_.stop=stop;D_.toggle=()=>playing?stop():play();D_.setBuffer=(b,auto=true)=>{stop();buf=b;rev=null;offset=0;if(auto)play()};D_.isPlaying=()=>playing;D_.play=play;D_.reset=()=>{stop();buf=null;rev=null;offset=0};
  function grain(at,rate){const c=AC;if(!c||!buf)return;let b=buf,o=at;if(rate<0){if(!rev){rev=c.createBuffer(buf.numberOfChannels,buf.length,buf.sampleRate);for(let ch=0;ch<buf.numberOfChannels;ch++){const s=buf.getChannelData(ch),d=rev.getChannelData(ch);for(let i=0;i<s.length;i++)d[i]=s[s.length-1-i]}}b=rev;o=buf.duration-at}
    const gg=c.createGain(),s=c.createBufferSource();s.buffer=b;s.playbackRate.value=Math.min(3,Math.max(.25,Math.abs(rate)));gg.gain.setValueAtTime(.9,c.currentTime);gg.gain.linearRampToValueAtTime(0,c.currentTime+.075);s.connect(gg);gg.connect(c.destination);s.start(0,Math.max(0,o%b.duration),.085)}
  const center=()=>{const r=rec.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2]};
  $$('img',rec).forEach(i=>{i.draggable=false});rec.addEventListener('contextmenu',e=>e.preventDefault());rec.addEventListener('dragstart',e=>e.preventDefault());
  rec.addEventListener('pointerdown',async e=>{e.preventDefault();A.ctx();const[cx,cy]=center();drag={x:e.clientX,y:e.clientY,a:Math.atan2(e.clientY-cy,e.clientX-cx),t:performance.now(),was:playing,moved:false};try{rec.setPointerCapture(e.pointerId)}catch(_){}el.classList.add('pressing');getBuf()});
  rec.addEventListener('pointermove',e=>{if(!drag)return;if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6){drag.moved=true;if(playing){offset=pos();stopSrc();playing=false;drag.was=true}el.classList.add('scratching')}
    if(!drag.moved)return;const[cx,cy]=center();let a=Math.atan2(e.clientY-cy,e.clientX-cx),da=a-drag.a;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;drag.a=a;ang+=da;const now=performance.now(),dt=Math.max(8,now-drag.t);drag.t=now;
    if(buf){const ds=da/(2*Math.PI)*REV;offset=((offset+ds)%buf.duration+buf.duration)%buf.duration;if(Math.abs(da)>.004)grain(offset,ds/(dt/1000))}rec.style.setProperty('--ang',ang+'rad')});
  const up=()=>{if(!drag)return;const d=drag;drag=null;el.classList.remove('pressing','scratching');if(!d.moved){D_.toggle();vib(10)}else if(d.was)play()};
  ['pointerup','pointercancel'].forEach(k=>rec.addEventListener(k,up));
  rec.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();D_.toggle()}const d=e.key==='ArrowRight'?.3:e.key==='ArrowLeft'?-.3:0;if(d&&buf){ang+=d;offset=((offset+d/(2*Math.PI)*REV)%buf.duration+buf.duration)%buf.duration;grain(offset,d>0?1:-1);rec.style.setProperty('--ang',ang+'rad')}});
  rec.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drop')});rec.addEventListener('dragleave',()=>el.classList.remove('drop'));
  rec.addEventListener('drop',async e=>{e.preventDefault();el.classList.remove('drop');const f=e.dataTransfer.files[0];if(!f)return;const c=A.ctx();try{const b=await c.decodeAudioData(await f.arrayBuffer());opt.onFile&&opt.onFile(f.name);D_.setBuffer(b)}catch(err){opt.onFile&&opt.onFile(null)}});
  (function spin(){if(playing&&!drag&&buf){ang=pos()/REV*2*Math.PI;rec.style.setProperty('--ang',ang+'rad');el.style.setProperty('--prog',(pos()/buf.duration).toFixed(3))}requestAnimationFrame(spin)})();
  return D_};

/* ================= SCRATCH RECORD ================= */
CCD.def('scratch',el=>{const btn=$('[data-play]',el);const d=CCD.deck(el,$('.rec',el),{onPlay:on=>{if(btn){btn.setAttribute('aria-pressed',on);CCD.setLabel(btn,on?'Stop':'Play')}}});btn&&btn.addEventListener('click',()=>d.toggle())});

/* ================= ARTIST VINYL: tap to play, drag to scratch, and what's on it ================= */
CCD.def('vinyl',el=>{const a=(D.artists||[]).find(x=>x.id===el.dataset.a)||{id:el.dataset.a,n:el.dataset.n||'',g:[]};const info=el.parentElement.querySelector('.vinfo')||(el.closest('[data-vhost]')&&el.closest('[data-vhost]').querySelector('.vinfo'));let file=null,real=null;
  const lat=a.latest&&a.latest[0];const bc=`https://bandcamp.com/search?q=${encodeURIComponent(a.n+(lat?' '+lat[0]:''))}`;
  const show=on=>{if(!info)return;info.classList.toggle('on',on);if(!on){info.innerHTML=`<span class="lbl">Tap to play · drag to scratch</span>`;return}
    const bpm=(A.loops[a.id]&&A.loops[a.id].bpm)||GENRE_BPM(a.g);
    const line=file?'Your file':real?esc(real.al):(lat?esc(lat[0])+' · '+lat[1]:esc((a.g||[]).slice(0,2).join(' · ')));
    info.innerHTML=`<div class="vnow"><span class="veq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div><span class="lbl">On the record</span><b>${esc(file||(real?real.t:a.n))}</b><span class="t-data faint">${line}</span></div></div>`+
      `<a class="seeall" href="${real?real.link:bc}" target="_blank" rel="noopener">${EY1}<span class="lab">${real?'Open in Deezer':(lat?'Get it on Bandcamp':'Their music on Bandcamp')}</span></a>`+
      (file||real?'':`<p class="t-small faint">Their preview could not load here, so our loop at ${bpm} BPM stands in.</p>`);collect(info)};
  CCD.deck(el,el,{load:async()=>{el.classList.add('loading');try{const r=await DZ.artistTop(a.n);const t=r.tracks.find(x=>x.preview);if(!t)throw 0;const b=await DZ.buf(t.preview);real={t:t.title,al:t.album&&t.album.title||'',link:t.link};return b}catch(e){real=null;return A.artistLoop(a)}finally{el.classList.remove('loading')}},onPlay:show,onFile:n=>{file=n||null}});show(false)});

/* ================= NEEDLE DROP: eras as bands on the record ================= */
CCD.def('needle',el=>{const bands=$$('.nband',el),arm=$('.narm',el),rec=$('.nrec',el),sleeves=$$('[data-era]',el.closest('[data-eras]')||el),out=$$('[data-era-panel]',el.closest('[data-eras]')||el);const n=bands.length;let cur=n-1,drag=false;
  const pick=(i,from)=>{cur=Math.max(0,Math.min(n-1,i));bands.forEach((b,k)=>b.classList.toggle('on',k===cur));el.style.setProperty('--arm',(cur+.5)/n);sleeves.forEach(s=>s.setAttribute('aria-pressed',+s.dataset.era===cur));out.forEach(p=>p.hidden=+p.dataset.eraPanel!==cur);if(from!=='key')arm.setAttribute('aria-valuenow',cur);arm.setAttribute('aria-valuetext',bands[cur].dataset.label||'')};
  const fromE=e=>{const r=rec.getBoundingClientRect();const d=Math.hypot(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2)/(r.width/2);return Math.floor((1-Math.min(.98,Math.max(.36,d)))/.62*n)};
  rec.addEventListener('click',e=>pick(fromE(e)));
  arm.addEventListener('pointerdown',e=>{drag=true;arm.setPointerCapture(e.pointerId);el.classList.add('drag')});arm.addEventListener('pointermove',e=>{if(!drag)return;const r=rec.getBoundingClientRect();const p=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));pick(Math.floor(p*n))});['pointerup','pointercancel'].forEach(k=>arm.addEventListener(k,()=>{drag=false;el.classList.remove('drag')}));
  arm.addEventListener('keydown',e=>{const d=e.key==='ArrowRight'||e.key==='ArrowUp'?1:e.key==='ArrowLeft'||e.key==='ArrowDown'?-1:0;if(d){e.preventDefault();pick(cur+d,'key')}});
  sleeves.forEach(s=>s.addEventListener('click',()=>pick(+s.dataset.era)));pick(cur)});


/* ================= STORY: the home page is one night, top to bottom =================
   Each .chapter says where the object sits (data-at x,y,size as parts of the screen; data-mat on phones),
   what it is (data-form), which room you're in (data-w), the time (data-t, data-n) and how much of the track plays (data-lv).
   The page is one track: a live five-part sequencer. More parts come in as the night goes on, the coin pulses on the kick,
   the dial filters it, and the School instrument on the page edits the same pattern. */
const PAGE_ROWS=['kick','hat','clap','bass','lead'];
const PAGE_PAT={kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],hat:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,1],clap:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],bass:[0,0,0,1,0,0,1,0,0,0,0,1,0,0,1,0],lead:[1,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0]};
const BN=[0,0,0,0,0,0,3,0,0,0,0,5,0,0,3,0],LN=[12,0,0,10,0,0,7,0,0,0,12,0,0,15,0,0];
CCD.pagePat=null;/* the instrument on the page writes {kick,clap,hat,bass} here */
function pageEngine(c){const E={G:{}};E.bus=c.createGain();E.bus.gain.value=.8;E.filt=c.createBiquadFilter();E.filt.type='lowpass';E.filt.Q.value=.9;E.filt.frequency.value=380;
  const comp=c.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=4;E.bus.connect(E.filt);E.filt.connect(comp);comp.connect(c.destination);
  PAGE_ROWS.forEach(k=>{E.G[k]=c.createGain();E.G[k].gain.value=0;E.G[k].connect(E.bus)});
  E.dly=c.createDelay(1);E.dly.delayTime.value=60/122/4*3;const fb=c.createGain();fb.gain.value=.35;const wet=c.createGain();wet.gain.value=.3;E.dly.connect(fb);fb.connect(E.dly);E.dly.connect(wet);wet.connect(E.G.lead);
  const env=(g,t,at,pk,dc)=>{g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(pk,t+at);g.gain.exponentialRampToValueAtTime(.0001,t+at+dc)};
  const nb=A._nb||(A._nb=noiseBuf(c,.5));
  const nz=(t,ty,f,q,pk,dc,o)=>{const s=c.createBufferSource();s.buffer=nb;const fl=c.createBiquadFilter();fl.type=ty;fl.frequency.value=f;fl.Q.value=q;const g=c.createGain();env(g,t,.001,pk,dc);s.connect(fl);fl.connect(g);g.connect(o);s.start(t);s.stop(t+dc+.05)};
  E.fire={kick(t){const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(165,t);o.frequency.exponentialRampToValueAtTime(44,t+.11);env(g,t,.002,1,.42);o.connect(g);g.connect(E.G.kick);o.start(t);o.stop(t+.5)},
    hat(t){nz(t,'highpass',7500,.7,.17,.045,E.G.hat)},
    clap(t){[0,.011,.022].forEach((o,i)=>nz(t+o,'bandpass',1300,.9,i==2?.55:.35,i==2?.17:.012,E.G.clap))},
    bass(t,i){const o=c.createOscillator(),fl=c.createBiquadFilter(),g=c.createGain();o.type='sawtooth';o.frequency.value=55*Math.pow(2,BN[i]/12);fl.type='lowpass';fl.Q.value=7;fl.frequency.setValueAtTime(900,t);fl.frequency.exponentialRampToValueAtTime(140,t+.18);env(g,t,.004,.32,.2);o.connect(fl);fl.connect(g);g.connect(E.G.bass);o.start(t);o.stop(t+.3)},
    lead(t,i){const o=c.createOscillator(),fl=c.createBiquadFilter(),g=c.createGain();o.type='triangle';o.frequency.value=220*Math.pow(2,(LN[i]||12)/12);fl.type='lowpass';fl.frequency.setValueAtTime(3200,t);fl.frequency.exponentialRampToValueAtTime(700,t+.2);env(g,t,.004,.2,.22);o.connect(fl);fl.connect(g);g.connect(E.G.lead);g.connect(E.dly);o.start(t);o.stop(t+.3)}};
  return E}
CCD.def('story',el=>{const box=$('.story-obj',el),cv=$('canvas',box),clk=$('.nclock',el),dots=$$('.storydots a',el),fxc=$('.story-fx',el);
  const W=['shared','nights','host','artists','school'],FORM={shared:'coin',nights:'ball',host:'ring',artists:'record',school:'dial'};/* one object follows you and changes shape per section (v7). Sub-pages take their app's shape, or the page's own (body data-form) */
  const home=!!$('[data-ch]',el);const world0=W.find(w=>document.body.classList.contains('w-'+w))||'shared';
  /* on app pages every section is a chapter: same colour, the app's object, and the track adds a part each section */
  const chs=home?$$('[data-ch]',el):$$(':scope > main > section, :scope > section',el);
  const pform=document.body.dataset.form||FORM[world0];if(!home)chs.forEach((c,i)=>{c.dataset.w=c.dataset.w||world0;c.dataset.form=c.dataset.form||pform;c.dataset.lv=c.dataset.lv||Math.min(4,i+1)});
  const obj=new CCD.Obj(cv,{root:el.dataset.root||'',form:home?'coin':pform,color:CCD.COL[home?'shared':world0],onCycle:()=>{}});
  let cur=-1,ph=matchMedia('(max-width:599px)');const lean={x:0,y:0};
  /* the object sits behind the page. It flies into the slot the layout keeps for it, and docks at the top corner when there is none */
  const hit=document.createElement('div');hit.className='obj-hit';hit.setAttribute('aria-hidden','true');el.appendChild(hit);
  const css=n=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n))||0;
  const pos={x:innerWidth*.75,y:innerHeight*.45,s:0},BASE=()=>Math.round(Math.min(560,Math.max(innerWidth,innerHeight)*.42));
  box.style.width=box.style.height=BASE()+'px';addEventListener('resize',()=>{box.style.width=box.style.height=BASE()+'px'});
  /* v7: the object lands in whichever slot is on screen, nearest the middle: big beside a section's name, small beside its steps */
  const slots=$$('.objslot',el);
  const target=()=>{const vw=innerWidth,vh=innerHeight,hd=css('--header');let best=null,bd=1e9;
    slots.forEach(sl=>{if(!sl.offsetParent)return;const r=sl.getBoundingClientRect();if(r.width<8||r.bottom<hd+r.height*.35||r.top>vh-r.height*.35)return;const d=Math.abs(r.top+r.height/2-vh*.46);if(d<bd){bd=d;best=r}});
    if(best)return{x:best.left+best.width/2,y:best.top+best.height/2,s:best.width,slot:1};
    const ps=$('.spill-slot');if(ps&&ps.offsetParent){const r=ps.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,s:r.width*1.15,slot:0}}
    const sz=css('--s7');return{x:vw-css('--margin'),y:vh-css('--s8'),s:sz,slot:0}};
  let last=performance.now();
  (function follow(now){const dt=Math.min(.1,(now-last)/1000);last=now;const t=target();const k=RM?1:1-Math.pow(.0015,dt);pos.x+=(t.x-pos.x)*k;pos.y+=(t.y-pos.y)*k;pos.s+=(t.s-pos.s)*k;
    const b=BASE(),sc=pos.s/b;box.style.transform=`translate(${(pos.x-b/2).toFixed(1)}px,${(pos.y-b/2).toFixed(1)}px) scale(${sc.toFixed(4)})`;
    hit.style.transform=`translate(${(pos.x-pos.s/2).toFixed(1)}px,${(pos.y-pos.s/2).toFixed(1)}px)`;hit.style.width=hit.style.height=pos.s.toFixed(1)+'px';box.classList.toggle('docked',!t.slot);requestAnimationFrame(follow)})(last);
  /* scroll reveals, like v7 */
  const rvio=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');rvio.unobserve(en.target)}}),{rootMargin:'0px 0px -12% 0px'});
  $$('.rv',el).forEach(x=>rvio.observe(x));
  /* the big line: each word lights up as you scroll through it */
  $$('.say',el).forEach(sy=>{const words=$$('.w',sy);const sec=sy.closest('.saybox')||sy;const f=()=>{const r=sec.getBoundingClientRect(),vh=innerHeight;const p=Math.max(0,Math.min(1,(vh*.75-r.top)/(r.height-vh*.25)));const n=Math.round(p*words.length*1.1);words.forEach((w,i)=>w.classList.toggle('lit',i<n))};addEventListener('scroll',f,{passive:true});f()});
  /* ---- the track ---- */
  const T={on:false,E:null,lv:0,step:0,next:0,timer:null,knob:1,bpm:122,
    pat(k){const p=CCD.pagePat;if(p&&p[k])return p[k];return PAGE_PAT[k]},
    cut(){return T.lv===0?380:200*Math.pow(2,T.knob*6.6)},
    mix(now){if(!T.E)return;const t=AC.currentTime;PAGE_ROWS.forEach((k,i)=>T.E.G[k].gain.setTargetAtTime(i<=T.lv?1:0,t,now?.001:.12));T.E.filt.frequency.setTargetAtTime(T.cut(),t,now?.001:.2);
      $$('.layers i',el).forEach((x,i)=>x.classList.toggle('on',i<=T.lv))},
    fire(s,t){PAGE_ROWS.forEach(k=>{if(T.pat(k)[s])T.E.fire[k](t,s)});
      setTimeout(()=>{if(!T.on)return;if(T.pat('kick')[s]){obj.pulse=1;fx.kick();document.body.style.setProperty('--b',1);setTimeout(()=>document.body.style.setProperty('--b',0),90)}if(T.lv>=1&&T.pat('hat')[s])fx.hat();document.dispatchEvent(new CustomEvent('ccd:step',{detail:s}))},Math.max(0,(t-AC.currentTime)*1000))},
    sched(){const c=AC,sd=60/T.bpm/4;while(T.next<c.currentTime+.12){T.fire(T.step,T.next);T.next+=sd;T.step=(T.step+1)%16}},
    start(){const c=A.ctx();if(!c||T.on)return;CCD.decks&&CCD.decks.forEach(d=>d.stop());if(!T.E)T.E=pageEngine(c);T.on=true;T.step=0;T.next=c.currentTime+.06;T.mix(true);T.timer=setInterval(T.sched,25);T.sched();sync()},
    stop(){T.on=false;clearInterval(T.timer);T.timer=null;sync();document.dispatchEvent(new CustomEvent('ccd:step',{detail:-1}))},
    level(n){T.lv=n;T.mix()},
    /* a swoosh: v7's scrub, also used for taps */
    scrub(dir,v){if(!T.E)return;const c=AC,t=c.currentTime+.004;const s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain(),f=Math.max(900,Math.min(5200,900+v*14000));s.buffer=A._nb||(A._nb=noiseBuf(c,.5));fl.type='bandpass';fl.Q.value=2.4;
      fl.frequency.setValueAtTime(dir>0?f*.6:f,t);fl.frequency.exponentialRampToValueAtTime(dir>0?f:f*.6,t+.07);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(T.lv===0?.07:.2,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+.085);s.connect(fl);fl.connect(g);g.connect(T.E.bus);s.start(t);s.stop(t+.12)},
    drop(){if(!T.E)return;const c=AC,t=c.currentTime;T.E.filt.frequency.cancelScheduledValues(t);T.E.filt.frequency.setValueAtTime(260,t);T.E.filt.frequency.exponentialRampToValueAtTime(Math.max(400,T.cut()),t+1.6)}};
  CCD.pageTrack=T;
  const sync=()=>{document.body.classList.toggle('sound-on',T.on);$$('[data-track]').forEach(b=>{b.setAttribute('aria-pressed',T.on);CCD.setLabel(b,T.on?(b.dataset.off||'Stop'):(b.dataset.on||'Play the track'))});const pr=$('.prompt');pr&&T.on&&pr.classList.remove('on')};
  document.addEventListener('ccd:sound',()=>T.start());document.addEventListener('ccd:toggle-sound',()=>T.on?T.stop():T.start());
  $$('[data-track]').forEach(b=>b.addEventListener('click',()=>T.on?T.stop():T.start()));
  /* ---- effects: ripples on the kick, a ring where you tap, sparks on the hats ---- */
  const fx=(()=>{const g=fxc.getContext('2d');const R=[];let sp=[];const acc=()=>getComputedStyle(document.body).getPropertyValue('--acc').trim()||'#F2F1EE';
    const oc=()=>{const r=cv.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2,r.width/2]};
    function loop(){const w=innerWidth,h=innerHeight;if(fxc.width!==w||fxc.height!==h){fxc.width=w;fxc.height=h}g.clearRect(0,0,w,h);const now=performance.now(),col=acc();g.strokeStyle=col;g.fillStyle=col;
      for(let i=R.length-1;i>=0;i--){const r=R[i],k=(now-r.t)/r.d;if(k>=1){R.splice(i,1);continue}if(k<0)continue;g.globalAlpha=r.a*(1-k)*(1-k);g.lineWidth=r.w*(1-k)+.5;g.beginPath();g.arc(r.x,r.y,r.r0+(r.r1-r.r0)*(1-Math.pow(1-k,3)),0,Math.PI*2);g.stroke()}
      sp=sp.filter(s=>now-s.t<s.d);sp.forEach(s=>{const k=(now-s.t)/s.d;g.globalAlpha=(1-k)*.8;g.beginPath();g.arc(s.x+s.vx*k,s.y+s.vy*k,s.s*(1-k),0,Math.PI*2);g.fill()});g.globalAlpha=1;requestAnimationFrame(loop)}
    if(!RM)requestAnimationFrame(loop);
    return{kick(){if(RM)return;const[x,y,r]=oc();R.push({x,y,r0:r*.9,r1:r*3.2+Math.min(innerWidth,innerHeight)*.12,t:performance.now(),d:900,a:.35,w:3})},
      hat(){if(RM||Math.random()>.5)return;const[x,y,r]=oc();const a=Math.random()*Math.PI*2;sp.push({x:x+Math.cos(a)*r*1.05,y:y+Math.sin(a)*r*1.05,vx:Math.cos(a)*40,vy:Math.sin(a)*40,s:2+Math.random()*2,t:performance.now(),d:420})},
      tap(x,y){if(RM)return;const t=performance.now();R.push({x,y,r0:4,r1:120,t,d:650,a:.7,w:2},{x,y,r0:2,r1:60,t:t+80,d:500,a:.5,w:1.5})},
      burst(x,y){if(RM)return;const t=performance.now();for(let i=0;i<24;i++){const a=i/24*Math.PI*2,v=80+Math.random()*120;sp.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,s:3+Math.random()*3,t,d:700})}R.push({x,y,r0:10,r1:260,t,d:900,a:.8,w:4})}}})();
  CCD.fx=fx;
  /* taps anywhere: a ring, the object leans toward you and spins, and a swoosh if the track is on */
  addEventListener('pointerdown',e=>{if(e.target.closest('input,textarea,select')||e.target===hit)return;fx.tap(e.clientX,e.clientY);const r=cv.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),d=Math.hypot(dx,dy)||1,m=Math.min(d,340)/340*30;lean.x+=dx/d*m;lean.y+=dy/d*m;obj.vel=(dx>0?1:-1)*2.4;if(T.on&&!e.target.closest('button,a,[role=slider],.istep'))T.scrub(dx>0?1:-1,.3)},{passive:true});
  (function leanLoop(){lean.x*=.9;lean.y*=.9;cv.style.transform=`translate(${lean.x.toFixed(1)}px,${lean.y.toFixed(1)}px)`;requestAnimationFrame(leanLoop)})();
  /* the object: drag the dial to filter the track; grab the coin or the record to scratch the track */
  let kd=null;hit.addEventListener('pointerdown',e=>{e.preventDefault();try{hit.setPointerCapture(e.pointerId)}catch(_){}const c=hit.getBoundingClientRect();kd={y:e.clientY,x:e.clientX,k:T.knob,s:obj.spin,a:Math.atan2(e.clientY-c.top-c.height/2,e.clientX-c.left-c.width/2),acc:0,scr:false,moved:false};
    if((obj.form==='record'||obj.form==='coin')&&T.on){kd.scr=true;clearInterval(T.timer);T.timer=null;box.classList.add('scratching')}});
  addEventListener('pointermove',e=>{if(!kd)return;if(obj.form==='dial'){T.knob=Math.max(0,Math.min(1,kd.k+((kd.y-e.clientY)+(e.clientX-kd.x))/220));obj.knobFix=T.knob;T.mix();return}
    if(Math.hypot(e.clientX-kd.x,e.clientY-kd.y)>5)kd.moved=true;if(!kd.scr){obj.spin=kd.s+(e.clientX-kd.x)*.014;return}const c=hit.getBoundingClientRect();const a=Math.atan2(e.clientY-c.top-c.height/2,e.clientX-c.left-c.width/2);let da=a-kd.a;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;kd.a=a;obj.spin+=da;kd.acc+=da;const q=Math.PI/8,v=Math.abs(da);let n=0;
    while(kd.acc>=q&&n++<4){kd.acc-=q;T.scrub(1,v);T.fire(T.step,AC.currentTime+.004);T.step=(T.step+1)%16}
    while(kd.acc<=-q&&n++<4){kd.acc+=q;T.step=(T.step+15)%16;T.scrub(-1,v)}});
  addEventListener('pointerup',()=>{if(kd&&kd.scr&&T.on&&!T.timer){T.next=AC.currentTime+.05;T.timer=setInterval(T.sched,25)}if(kd&&!kd.moved&&obj.form!=='dial'){obj.vel=3;obj.pulse=1;fx.tap(pos.x,pos.y);if(!T.on)T.start()}box.classList.remove('scratching');kd=null});
  /* ---- chapters ---- */
  const go=()=>{const mid=innerHeight*.5;let i=0;chs.forEach((c,k)=>{if(c.getBoundingClientRect().top<mid)i=k});const c=chs[i];if(!c||i===cur)return;cur=i;
    W.forEach(w=>document.body.classList.toggle('w-'+w,w===(c.dataset.w||world0)));const f=c.dataset.form||'coin';obj.to(f,CCD.COL[c.dataset.w||world0]);obj.knobFix=f==='dial'?T.knob:null;
    box.classList.toggle('knob',f==='dial');hit.classList.toggle('knob',f==='dial');hit.classList.toggle('grab',f==='record'||f==='coin');
    if(clk){clk.classList.remove('tick');void clk.offsetWidth;clk.classList.add('tick');$('b',clk).textContent=c.dataset.t||'';$('span',clk).textContent=c.dataset.n||''}
    dots.forEach((d,k)=>d.classList.toggle('on',k===i));T.level(+c.dataset.lv||0)};
  addEventListener('scroll',go,{passive:true});
  dots.forEach((d,k)=>d.addEventListener('click',e=>{e.preventDefault();chs[k].scrollIntoView({behavior:RM?'auto':'smooth'})}));
  go()});

/* ================= LOGO STAMP under UV light ================= */
CCD.def('stamps',el=>{const pad=$('.spad',el);pad.addEventListener('pointermove',e=>{const r=pad.getBoundingClientRect();pad.style.setProperty('--ux',(e.clientX-r.left)+'px');pad.style.setProperty('--uy',(e.clientY-r.top)+'px');pad.classList.add('lit')});pad.addEventListener('pointerleave',()=>pad.classList.remove('lit'));
  const b=$('[data-stamp]',el);b&&b.addEventListener('click',()=>{CCD.pts&&CCD.pts.award(100,'checked in',b,'stamp-'+b.dataset.stamp,true);const s=document.createElement('span');s.className='ink new';s.style.setProperty('--r',(Math.random()*30-15)+'deg');s.innerHTML='<i></i><em>'+esc(b.dataset.stamp)+'</em>';$('.stamps',el).appendChild(s);pad.classList.add('thunk');vib(25);setTimeout(()=>pad.classList.remove('thunk'),ms('--d-move'));setTimeout(()=>s.classList.remove('new'),ms('--d-scene')*2);b.setAttribute('aria-disabled','true');b.classList.add('is-done');CCD.setLabel(b,'Stamped')})});

/* ================= WHISKERS: a count that fills the room ================= */
CCD.def('whiskers',el=>{const n=$('.wn',el),cap=+el.dataset.cap||40;CCD.whisk=CCD.whisk||{};const set=v=>{v=Math.max(0,Math.min(cap,v));el.dataset.v=v;el.style.setProperty('--f',v/cap);n.textContent=v;el.classList.toggle('full',v>=cap);const s=$('.wcap',el);if(s)s.textContent=v>=cap?'Full':`${cap-v} left`};el._set=set;set(+el.dataset.v||0);
  const r=$('input[type=range]',el);r&&r.addEventListener('input',()=>set(+r.value))});

/* ================= CROSSFADER ================= */
CCD.def('xfader',el=>{const tr=$('.xtrack',el),th=$('.xthumb',el),tgt=document.getElementById(el.dataset.target)||el.closest('[data-xroot]');let x=+el.dataset.x||0,drag=false;
  const set=(v,snap)=>{x=Math.max(0,Math.min(1,v));if(snap)x=x>.5?1:0;el.style.setProperty('--x',x);tgt&&tgt.style.setProperty('--x',x);th.setAttribute('aria-valuenow',Math.round(x*100));th.setAttribute('aria-valuetext',x>.5?el.dataset.b:el.dataset.a);el.classList.toggle('at-b',x>.5);tgt&&tgt.classList.toggle('at-b',x>.5);if(snap)el.dispatchEvent(new CustomEvent('ccd:xfade',{bubbles:true,detail:x}))};
  const fromE=e=>{const r=tr.getBoundingClientRect();return(e.clientX-r.left)/r.width};
  tr.addEventListener('pointerdown',e=>{drag=true;tr.setPointerCapture(e.pointerId);el.classList.add('drag');set(fromE(e))});tr.addEventListener('pointermove',e=>{if(drag)set(fromE(e))});const up=()=>{if(!drag)return;drag=false;el.classList.remove('drag');set(x,true)};['pointerup','pointercancel','lostpointercapture'].forEach(k=>tr.addEventListener(k,up));
  th.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='End'){e.preventDefault();set(1,true)}if(e.key==='ArrowLeft'||e.key==='Home'){e.preventDefault();set(0,true)}});
  $$('[data-side]',el).forEach(b=>b.addEventListener('click',e=>{e.preventDefault();set(b.dataset.side==='b'?1:0,true)}));el.addEventListener('ccd:xfade',()=>$$('[data-side]',el).forEach(b=>b.setAttribute('aria-pressed',(b.dataset.side==='b')===(x>.5))));set(x,true)});

/* ================= HOLD TO SEND ================= */
/* a purr: low noise, pulsed about 24 times a second, through a warm filter */
A.purr=()=>{const c=A.ctx();if(!c)return null;const t=c.currentTime;const src=c.createBufferSource();src.buffer=A._nb||(A._nb=noiseBuf(c,.5));src.loop=true;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=260;lp.Q.value=4;
  const am=c.createGain();am.gain.value=0;const lfo=c.createOscillator();lfo.frequency.value=24;const lg=c.createGain();lg.gain.value=.5;lfo.connect(lg);lg.connect(am.gain);
  const body=c.createOscillator();body.type='sine';body.frequency.value=48;const bg=c.createGain();bg.gain.value=.35;body.connect(bg);bg.connect(am);
  const out=c.createGain();out.gain.setValueAtTime(.0001,t);out.gain.exponentialRampToValueAtTime(.55,t+.12);src.connect(lp);lp.connect(am);am.connect(out);out.connect(c.destination);src.start(t);lfo.start(t);body.start(t);
  return{rate(p){lfo.frequency.setTargetAtTime(24+p*10,c.currentTime,.05);lp.frequency.setTargetAtTime(260+p*240,c.currentTime,.05)},stop(){const n=c.currentTime;out.gain.cancelScheduledValues(n);out.gain.setTargetAtTime(.0001,n,.06);setTimeout(()=>{try{src.stop();lfo.stop();body.stop()}catch(e){}},400)}}};
CCD.def('hold',el=>{const T=+el.dataset.ms||900;let raf,t0=0,done=false,purr=null;
  const go=()=>{if(done||el.classList.contains('is-disabled'))return;t0=performance.now();el.classList.add('holding');purr=A.purr();const f=n=>{const p=Math.min(1,(n-t0)/T);el.style.setProperty('--p',p);purr&&purr.rate(p);if(p<1)raf=requestAnimationFrame(f);else{done=true;purr&&purr.stop();purr=null;el.classList.remove('holding');vib([10,30,10]);CCD.done(el,el.dataset.done||'Sent');el.dispatchEvent(new CustomEvent('ccd:held',{bubbles:true}))}};raf=requestAnimationFrame(f)};
  const stop=()=>{purr&&purr.stop();purr=null;if(done)return;cancelAnimationFrame(raf);el.classList.remove('holding');el.style.setProperty('--p',0)};
  el.addEventListener('pointerdown',go);['pointerup','pointerleave','pointercancel'].forEach(k=>el.addEventListener(k,stop));
  el.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();go()}});el.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter')stop()});
  el.addEventListener('click',e=>e.preventDefault());el._reset=()=>{done=false;el.classList.remove('is-done');el.style.setProperty('--p',0);CCD.setLabel(el,el.dataset.label||'Hold to send')}});

/* ================= SLEEVE: pull the record ================= */
CCD.def('sleeve',el=>{const toggle=()=>{const o=el.classList.toggle('out');el.setAttribute('aria-expanded',o)};el.addEventListener('click',e=>{if(e.target.closest('a,.btn'))return;toggle()});el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}})});

/* ================= TORCH: the wall is dark until you light it ================= */
CCD.def('torch',el=>{const posters=$$('[data-col]',el);const lit=(x,y)=>{const r=el.getBoundingClientRect();el.style.setProperty('--tx',(x-r.left)+'px');el.style.setProperty('--ty',(y-r.top)+'px');el.classList.add('lit');
    let best=null,bd=1e9;posters.forEach(p=>{const q=p.getBoundingClientRect();const d=Math.hypot(x-q.left-q.width/2,y-q.top-q.height/2);if(d<bd){bd=d;best=p}});if(best){el.style.setProperty('--room',best.dataset.col);if(el._pop!==best){el._pop&&el._pop.classList.remove('pop');best.classList.add('pop');el._pop=best}}};
  el.addEventListener('pointermove',e=>lit(e.clientX,e.clientY));el.addEventListener('pointerleave',()=>{el.classList.remove('lit');el._pop&&el._pop.classList.remove('pop');el._pop=null});
  if(!RM){let t=0;const idle=()=>{if(!el.matches(':hover')&&el.getBoundingClientRect().top<innerHeight&&el.getBoundingClientRect().bottom>0){const r=el.getBoundingClientRect();t+=.006;lit(r.left+r.width*(.5+.35*Math.sin(t*2.1)),r.top+r.height*(.5+.3*Math.sin(t*1.3)))}requestAnimationFrame(idle)};idle()}});

/* ================= FLYER WALL ================= */
CCD.def('flyers',el=>{$$('.flyer',el).forEach((f,i)=>{f.style.setProperty('--r',((i*37%11)-5)*1.4+'deg');f.style.setProperty('--dy',((i*53%7)-3)*4+'px')});
  const wall=$('.flyers',el);
  el.addEventListener('ccd:chips',e=>{const on=e.detail,all=!on.length||on.includes('all');const fl=$$('.flyer',wall);const first=new Map(fl.map(f=>[f,f.getBoundingClientRect()]));
    const keep=fl.filter(f=>all||on.includes(f.dataset.city)||(on.includes('tonight')&&f.dataset.tonight));fl.forEach(f=>f.hidden=!keep.includes(f));
    keep.sort(()=>Math.random()-.5).forEach(f=>wall.appendChild(f));fl.filter(f=>!keep.includes(f)).forEach(f=>wall.appendChild(f));
    keep.forEach((f,i)=>{f.style.setProperty('--r',((Math.random()*14)-7).toFixed(1)+'deg');const a=first.get(f),b=f.getBoundingClientRect();if(RM||!a.width){f.animate([{opacity:0},{opacity:1}],{duration:ms('--d-base')});return}
      f.animate([{transform:`translate(${a.left-b.left}px,${a.top-b.top}px) rotate(0deg) scale(.9)`},{transform:`translate(0,0) rotate(var(--r)) translateY(var(--dy,0))`}],{duration:ms('--d-move')+i*30,easing:'cubic-bezier(.34,1.56,.64,1)'})});
    const em=$('.fempty',el);if(em)em.hidden=keep.length>0})});

/* ================= SPINES: every artist on one shelf ================= */
/* the shelf: every artist with a photo, by city. Hover or focus pulls a spine out; click opens their page. */
const PRETTY=n=>n&&n===n.toUpperCase()&&/[A-Z]/.test(n)?n.split(' ').map(w=>w.length>2||/^[A-Z]+$/.test(w)&&w.length>1?w[0]+w.slice(1).toLowerCase():w).join(' '):n;CCD.pretty=PRETTY;
const CITY=c=>{c=String(c||'').split('(')[0].split(',')[0].trim();return c==='Delhi'||c==='Noida'||c==='Gurgaon'||c==='Gurugram'?'New Delhi':c};CCD.city=CITY;
const RPH=(r,root)=>r[4]==='L'?`${root}assets/img/a-${r[0]}.webp`:r[4];CCD.rphoto=RPH;
/* order for browsing: played Cats Can Dance first, then open to bookings, then the rest, with cities dealt round so no one city fills the top */
CCD.mix=R=>{const score=r=>(r[4]?4:0)+(r[6]?2:0)+(r[4]==='L'?1:0);const by={};R.forEach(r=>{const k=score(r)+'|'+(CITY(r[2])||'x');(by[k]=by[k]||[]).push(r)});const out=[];
  [7,6,5,4,3,2,1,0].forEach(sc=>{const qs=Object.keys(by).filter(k=>+k.split('|')[0]===sc).map(k=>by[k].slice().sort((a,b)=>a[1].localeCompare(b[1])));let more=true;while(more){more=false;qs.forEach(q=>{if(q.length){out.push(q.shift());more=true}})}});return out};
CCD.def('spines',el=>{const root=el.dataset.root||'';const shelf=$('.shelf',el),det=$('.sdetail',el);const R=CCD.mix((D.roster||[]).filter(r=>r[4]));
  const M=Object.fromEntries(R.map(r=>[r[0],r]));
  shelf.innerHTML=R.map(r=>`<a class="spine" href="${root}pages/artist.html#${r[0]}" data-a="${r[0]}" style="--img:url(${RPH(r,root)})"><span>${esc(PRETTY(r[1]))}</span></a>`).join('');
  const show=b=>{$$('.spine',shelf).forEach(s=>s.classList.toggle('out',s===b));const r=M[b.dataset.a];det.innerHTML=`<img src="${RPH(r,root)}" alt=""><div><span class="lbl">${esc(CITY(r[2])||'')}</span><b class="t-h3">${esc(PRETTY(r[1]))}</b><span class="tags">${r[3].slice(0,3).map(g=>`<span class="tag">${esc(g)}</span>`).join('')}</span><a class="seeall" href="${root}pages/artist.html#${r[0]}">${EY1}<span class="lab">Open page</span></a></div>`;collect(det)};
  shelf.addEventListener('pointerover',e=>{const b=e.target.closest('.spine');if(b)show(b)});shelf.addEventListener('focusin',e=>{const b=e.target.closest('.spine');if(b)show(b)});
  const f=$('.spine',shelf);f&&show(f)});

/* the roster: all of them, searchable */
CCD.def('roster',el=>{const root=el.dataset.root||'';const R=CCD.mix(D.roster||[]);
  const q=$('input',el),ch=$('.rchips',el),grid=$('.rgrid',el),cnt=$('.rcount',el),more=$('.rmore',el);let f='all',lim=48;
  const cities=['New Delhi','Mumbai','Bengaluru','Goa'];const genres=['Techno','House','Ambient','Bass'];
  ch.innerHTML=[['all','All'],['open','Open to bookings'],['ccd','Played Cats Can Dance'],...cities.map(c=>['c:'+c,c]),...genres.map(g=>['g:'+g,g])].map(([v,n])=>`<button class="chip" data-v="${v}" aria-pressed="${v==='all'}">${n}</button>`).join('');
  const ini=n=>PRETTY(n).split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const card=r=>`<a class="acard${r[4]?'':' noimg'}" href="${root}pages/artist.html#${r[0]}">${r[4]?`<img src="${RPH(r,root)}" alt="" loading="lazy">`:`<span class="aini" aria-hidden="true">${esc(ini(r[1]))}</span>`}<b>${esc(PRETTY(r[1]))}</b><span class="t-data faint">${esc((CITY(r[2])||r[3][0]||'').toUpperCase())}</span></a>`;
  function draw(){const t=CCD.norm?CCD.norm(q.value):q.value.toLowerCase();const hit=R.filter(r=>{if(f==='open'&&!r[5])return false;if(f==='ccd'&&!r[6])return false;if(f.startsWith('c:')&&CITY(r[2])!==f.slice(2))return false;if(f.startsWith('g:')&&!r[3].some(g=>g.toLowerCase().includes(f.slice(2).toLowerCase())))return false;
      if(!t)return true;return (CCD.norm?CCD.norm:(x=>x.toLowerCase()))([r[1],r[2],...r[3]].join(' ')).includes(t)});
    grid.innerHTML=hit.slice(0,lim).map(card).join('')||'<p class="t-small mute">No one by that name yet.</p>';cnt.textContent=`${hit.length} OF ${R.length} ARTISTS`;more.hidden=hit.length<=lim}
  q.addEventListener('input',()=>{lim=48;draw()});ch.addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;f=b.dataset.v;$$('.chip',ch).forEach(x=>x.setAttribute('aria-pressed',x===b));lim=48;draw()});
  more.addEventListener('click',()=>{lim+=48;draw()});collect(el);draw()});

/* ================= SLIVERS: a line-up in strips ================= */
CCD.def('slivers',el=>{const open=s=>$$('.sliver',el).forEach(x=>x.setAttribute('aria-expanded',x===s));
  el.addEventListener('click',e=>{if(e.target.closest('a'))return;const s=e.target.closest('.sliver');if(!s)return;if(s.getAttribute('aria-expanded')==='true'&&s.dataset.href){location.href=s.dataset.href;return}open(s)});
  el.addEventListener('keydown',e=>{const s=e.target.closest('.sliver');if(s&&(e.key==='Enter'||e.key===' ')){e.preventDefault();s.getAttribute('aria-expanded')==='true'&&s.dataset.href?location.href=s.dataset.href:open(s)}});
  el.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const s=e.target.closest('.sliver');if(s)open(s)});el.addEventListener('focusin',e=>{const s=e.target.closest('.sliver');if(s)open(s)});collect(el);const f=$('.sliver',el);f&&f.setAttribute('aria-expanded','true')});

/* ================= CHROME: a turning picture from a 6 x 6 sprite ================= */
/* the chrome logo: a 36-frame turntable. Still until you point at it; hover turns it smoothly, drag turns it by hand and lets go with momentum. */
CCD.def('chrome',el=>{const N=36;let f=0,v=0,hov=false,drag=null,shown=-1,last=performance.now();
  const paint=()=>{const k=((Math.round(f)%N)+N)%N;if(k===shown)return;shown=k;el.style.backgroundPosition=`${(k%6)*20}% ${Math.floor(k/6)*20}%`;el.setAttribute('aria-valuenow',k)};paint();
  el.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')hov=true});el.addEventListener('pointerleave',()=>hov=false);
  el.addEventListener('pointerdown',e=>{drag={x:e.clientX,f,t:performance.now(),lx:e.clientX};el.setPointerCapture(e.pointerId)});
  el.addEventListener('pointermove',e=>{if(!drag)return;const now=performance.now();f=drag.f+(e.clientX-drag.x)/7;v=(e.clientX-drag.lx)/7/Math.max(.008,(now-drag.t)/1000);drag.lx=e.clientX;drag.t=now;paint()});
  const up=()=>{drag=null};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  el.addEventListener('keydown',e=>{const d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(d){e.preventDefault();f+=d;paint()}});
  (function tick(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(!drag){const want=hov&&!RM?22:0;if(hov)v+=(want-v)*(1-Math.pow(.05,dt));else v*=Math.pow(.08,dt);if(Math.abs(v)<.05)v=0;f+=v*dt;if(!hov&&v===0){const r=Math.round(f);f+=(r-f)*(1-Math.pow(.001,dt))}paint()}requestAnimationFrame(tick)})(last)});

/* ================= EYES IN THE ROOM ================= */
CCD.def('room',el=>{const n=+el.dataset.n||12;const g=$('.rgrid2,.rgrid',el);const pair=c=>`<span class="eyes${c?' '+c:''}"><i class="eye"></i><i class="eye"></i></span>`;g.innerHTML=Array.from({length:n},()=>pair('')).join('');collect(g);
  const b=$('[data-going]',el),c=$('.rcount',el);b&&b.addEventListener('click',()=>{const on=!el.classList.contains('you');el.classList.toggle('you',on);if(on){g.insertAdjacentHTML('afterbegin',pair('me'));collect(g);pounce($('.me',g));CCD.done(b,'You\'re going')}else{const me=$('.me',g);me&&me.remove();b.classList.remove('is-done');CCD.setLabel(b,'I\'m going')}c.textContent=n+(on?1:0)})});

/* ================= CHROME OBJECTS: upright and still until you point at them =================
   Every .cobj stands still. Point at it (or at the card it sits in) and it turns once, lifts, and a light runs across the chrome.
   Tap sends it round faster, with a chirp. On the kick it pulses a little, nothing more. */
(()=>{const live=new Set();let kick=0;document.documentElement.classList.add('js-cobj');
  const io=new IntersectionObserver(es=>es.forEach(en=>{en.isIntersecting?live.add(en.target):live.delete(en.target)}),{rootMargin:'80px'});
  const turn=(o,n=1)=>{const c=o._co;if(RM)return;c.target=Math.ceil((c.ang+.01)/(Math.PI*2))*Math.PI*2+(n-1)*Math.PI*2;c.lift=1;o.classList.remove('shine');void o.offsetWidth;o.classList.add('shine')};
  const add=root=>$$('.cobj',root).forEach(o=>{if(o._co)return;o._co={ang:0,target:0,lift:0,hov:false};io.observe(o);const img=o.firstElementChild;img&&img.src&&o.style.setProperty('--m',`url("${img.src}")`);
    const host=o.closest('a,button,.appcol,.fstep,figure,.chead,.ablock,.card')||o;
    host.addEventListener('pointerenter',e=>{if(e.pointerType==='touch')return;o._co.hov=true;turn(o)});host.addEventListener('pointerleave',()=>{o._co.hov=false});
    o.addEventListener('click',()=>{turn(o,2);const c=A.ctx();if(c){const t=c.currentTime,os=c.createOscillator(),g=c.createGain();os.type='triangle';os.frequency.setValueAtTime(900,t);os.frequency.exponentialRampToValueAtTime(1700,t+.08);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.14);os.connect(g);g.connect(c.destination);os.start(t)}})});
  CCD.cobj=add;add(document);
  document.addEventListener('ccd:step',e=>{const s_=e.detail;if(s_>=0){const p=(CCD.pageTrack&&CCD.pageTrack.pat)?CCD.pageTrack.pat('kick'):null;if(p&&p[s_])kick=1}});
  let last=performance.now();
  (function tick(now){const dt=Math.min(.05,(now-last)/1000);last=now;kick*=Math.pow(.0005,dt);
    live.forEach(o=>{const c=o._co,img=o.firstElementChild;if(!img)return;const k=1-Math.pow(.004,dt);c.ang+=(c.target-c.ang)*k;const want=c.hov?1:0;c.lift+=(want-c.lift)*(1-Math.pow(.02,dt));
      const settled=Math.abs(c.target-c.ang)<.002&&c.lift<.002&&kick<.002;if(settled){if(c.on){o.style.removeProperty('--tf');c.on=0;c.ang=c.target=0}return}c.on=1;
      o.style.setProperty('--tf',`translateY(${(-c.lift*5).toFixed(1)}px) rotate(${c.ang.toFixed(4)}rad) scale(${(1+c.lift*.06+kick*.05).toFixed(3)})`)});
    requestAnimationFrame(tick)})(last);
  const mo=new MutationObserver(ms_=>ms_.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)add(n.parentNode||n)})));mo.observe(document.body,{childList:true,subtree:true})})();

/* ================= POINTS: one balance, and everything you do in any app adds to it =================
   Kept in this browser. The header pill, the Points component and every action share it. */
const PT=CCD.pts=(()=>{const K='ccd.points.v2';let st;try{st=JSON.parse(localStorage.getItem(K))}catch(e){}st=st||{bal:350,nights:3,keys:[]};
  const save=()=>{try{localStorage.setItem(K,JSON.stringify(st))}catch(e){}};
  const paint=()=>{$$('.nav-top .pts').forEach(p=>{const img=p.querySelector('img');p.textContent='';img&&p.appendChild(img);p.append(st.bal.toLocaleString('en-IN'));p.setAttribute('aria-label','Points, '+st.bal)});document.dispatchEvent(new CustomEvent('ccd:points',{detail:st}))};
  const fly=(n,label,from)=>{const pill=$('.nav-top .pts');const r=(from&&from.isConnected?from:pill||document.body).getBoundingClientRect();const f=document.createElement('div');f.className='ptfly';f.textContent=`+${n} ${label||''}`.trim();f.style.left=Math.max(8,Math.min(innerWidth-180,r.left+r.width/2-60))+'px';f.style.top=Math.max(64,r.top-8)+'px';document.body.appendChild(f);setTimeout(()=>f.remove(),1500);
    if(pill){pill.classList.remove('bump');void pill.offsetWidth;pill.classList.add('bump')}};
  const P={get bal(){return st.bal},get nights(){return st.nights},
    award(n,label,from,key,night){if(key){if(st.keys.includes(key))return false;st.keys.push(key)}st.bal+=n;if(night)st.nights++;save();fly(n,label,from);paint();return true},
    reset(){st={bal:350,nights:3,keys:[]};save();paint()}};
  document.addEventListener('DOMContentLoaded',paint);return P})();

/* follow buttons anywhere: [data-follow="Name"] */
document.addEventListener('click',e=>{const b=e.target.closest('[data-follow]');if(!b)return;const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);const l=b.querySelector('.lab');if(l)CCD.setLabel(b,on?'Following':'Follow '+b.dataset.follow);if(on)CCD.pts.award(50,'fan',b,'fan-'+b.dataset.follow)});

/* ================= small helpers used by pages ================= */
/* a track row: a little record, the title, a waveform drawn from the title, and its number or year */
CCD.wave=t=>{let h=hashS(t);return Array.from({length:28},()=>{h=Math.imul(h^(h>>>13),1274126177)>>>0;return '<i style="--h:'+(.25+((h&255)/255)*.75).toFixed(2)+'"></i>'}).join('')};
CCD.trackRow=(t,num,meta)=>`<li class="track"><span class="tr-rec" aria-hidden="true"></span><span class="tr-n">${esc(num)}</span><b>${esc(t)}</b><span class="tr-wave" aria-hidden="true">${CCD.wave(t)}</span><span class="tr-meta">${esc(meta||'')}</span></li>`;

CCD.nightCard=(n,root='')=>`<a class="ncard" href="${root}pages/night.html#${n.id}"><span class="np"><img src="${root}assets/img/${n.img}.webp" alt="${esc(n.t)} poster" loading="lazy"></span><span class="nt"><span class="t-data faint">${esc(n.d.toUpperCase())}${n.h?' · '+fmtH(n.h):''}</span><b class="t-h3">${esc(n.t)}</b><span class="mute t-small">${esc(n.v)}, ${esc(n.c)}</span></span></a>`;
const fmtH=h=>{const[H,M]=h.split(':').map(Number);const p=H>=12?'PM':'AM';const h12=((H+11)%12)+1;return h12+(M?':'+String(M).padStart(2,'0'):'')+' '+p};CCD.fmtH=fmtH;
CCD.artistCard=(a,root='')=>`<a class="acard" href="${root}pages/artist.html#${a.id}"><img src="${root}assets/img/a-${a.id}.webp" alt="" loading="lazy"><b>${esc(a.n)}</b><span class="t-data faint">${esc(a.c.toUpperCase())}</span></a>`;

document.addEventListener('DOMContentLoaded',()=>CCD.init());
if(document.readyState!=='loading')setTimeout(()=>CCD.init(),0);
})();
