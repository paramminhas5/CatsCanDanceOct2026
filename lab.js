/* CCD design system lab, round 1 */
(()=>{
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const css=getComputedStyle(document.documentElement);
const tok=n=>css.getPropertyValue(n).trim();
const ms=n=>parseFloat(tok(n));
const body=document.body;
const COL={shared:'#F2F1EE',nights:'#3B78FF',host:'#FFE600',artists:'#A07BFF',school:'#FF4D8D'};
const NAME={shared:'Shared · ink',nights:'Nights · #3B78FF',host:'Host · #FFE600',artists:'Artists · #A07BFF',school:'School · #FF4D8D'};
const FORM_OF={shared:'coin',nights:'ball',artists:'record',host:'stamp',school:'dial'};
let world='shared',lastApp='nights',eyeOpt='a',font='outfit';
const store={get(k){try{return localStorage.getItem('ccdlab.'+k)}catch(e){return null}},set(k,v){try{localStorage.setItem('ccdlab.'+k,v)}catch(e){}}};

/* ---------- views (hash) ---------- */
function route(){const v=(location.hash||'#foundations').slice(1);const ok=['foundations','components','pages','handoff'].includes(v)?v:'foundations';
  $$('.view').forEach(x=>x.classList.toggle('on',x.id==='v-'+ok));$$('.tabs a').forEach(a=>a.classList.toggle('on',a.dataset.v===ok));scrollTo(0,0)}
addEventListener('hashchange',route);route();

/* ---------- header backing ---------- */
const top=$('#top');const onS=()=>top.classList.toggle('scrolled',scrollY>4);addEventListener('scroll',onS,{passive:true});onS();

/* ---------- toc ---------- */
$('#toc').innerHTML=$$('[data-toc]').map((s,i)=>`<button data-to="${s.id}"><em>${String(i+1).padStart(2,'0')}</em>${s.dataset.toc}</button>`).join('');
$('#toc').addEventListener('click',e=>{const b=e.target.closest('button');if(b)document.getElementById(b.dataset.to).scrollIntoView({behavior:RM?'auto':'smooth'})});

/* ---------- world ---------- */
function setEyeClass(){body.classList.remove('eye-a','eye-drift','eye-last-nights','eye-last-host','eye-last-artists','eye-last-school');
  if(eyeOpt==='a')body.classList.add('eye-a');else if(eyeOpt==='b')body.classList.add('eye-last-'+lastApp);else body.classList.add('eye-drift')}
function setWorld(w,fromObj){world=w;if(w!=='shared'){lastApp=w;store.set('last',w)}
  ['shared','nights','host','artists','school'].forEach(k=>body.classList.toggle('w-'+k,k===w));setEyeClass();
  $$('[data-w]').forEach(b=>{if(b.closest('#wmarks'))return;b.setAttribute('aria-pressed',b.dataset.w===w)});
  $('#roleName').textContent=NAME[w];
  if(!fromObj){objs.forEach(o=>o.to(FORM_OF[w],COL[w]))}
  $$('#forms button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.f===FORM_OF[w]));
  paintContrast()}
document.addEventListener('click',e=>{const b=e.target.closest('.wd,.wp,.wsel');if(b)setWorld(b.dataset.w)});

/* ---------- picks: font and eyes ---------- */
function setFont(f){font=f;document.documentElement.classList.toggle('f-instrument',f==='instrument');store.set('font',f);
  $$('[data-font]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.font===f));frames.forEach(fr=>post(fr,{font:f}))}
function setEye(o){eyeOpt=o;store.set('eye',o);setEyeClass();$$('[data-eye]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.eye===o))}
document.addEventListener('click',e=>{const f=e.target.closest('[data-font]');if(f)setFont(f.dataset.font);const y=e.target.closest('[data-eye]');if(y)setEye(y.dataset.eye)});


/* ---------- contrast table ---------- */
function lum(h){h=h.replace('#','');const c=[0,2,4].map(i=>parseInt(h.substr(i,2),16)/255).map(x=>x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function cr(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
const CT=[['Nights','#3B78FF','nights'],['Host','#FFE600','host'],['Artists','#A07BFF','artists'],['School','#FF4D8D','school'],['Red','#FF4438',''],['Mute','#A3A39C',''],['Faint','#86867F',''],['Rest','#6E6E69','']];
function cell(v,need=4.5){const ok=v>=need;return `<td class="m ${ok?'pass':'fail'}">${v.toFixed(2)} ${ok?'pass':'no'}</td>`}
function paintContrast(){$('#contrast tbody').innerHTML=CT.map(([n,h,w])=>`<tr style="${w===world?'background:color-mix(in srgb,var(--acc) 8%,transparent)':''}"><td><span class="chipdot" style="--c:${h}"></span>${n}</td>${cell(cr(h,'#0C0D0F'))}${cell(cr(h,'#F2F1EE'))}</tr>`).join('')}

/* ---------- type specimen ---------- */
const SP=[['hero','Anybody 800 · wdth 100/112/118','Somad Lab','t-hero',[48,72,104]],['h1','Anybody 800 · wdth 100/108/112','Every night worth leaving the house for.','t-h1',[36,48,64]],['h2','Anybody 700 · wdth 108','This weekend','t-h2',[28,32,40]],['h3','Anybody 700 · wdth 104','Danza Drome, Room XO','t-h3',[20,22,24]],['lead','Text 400','Picked by people who go. Posters, line-ups, and who else is going.','t-lead',[18,19,20]],['body','Text 400','Stimming plays live, with GNDHI and open decks after. Doors at 8, on till late.','t-body',[16,16,17]],['small','Text 400','The Humming Tree, Indiranagar, Bengaluru','t-small',[14,14,15]],['button','Text 500',"I'm going",'t-button',[16,16,16]],['data','Mono 500','SUN 22 NOV · 8 PM · 140 BPM','t-data',[13,14,14]],['label','Mono 500 · caps','Episode 05 · Nights','t-label',[11,11,12]]];
let dv='desktop';const di={phone:0,tablet:1,desktop:2};
function paintSpec(){$('#specimen').innerHTML=SP.map(r=>`<div class="sp"><div class="k"><b>${r[0]}</b><span>${r[4][di[dv]]}px · ${r[1]}</span><span>${r[4].join(' / ')}</span></div><div class="v ${r[3]}">${r[2]}</div></div>`).join('');$('#specimen').className='specimen dv-'+dv}
$('#dvseg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;dv=b.dataset.dv;$$('#dvseg button').forEach(x=>x.setAttribute('aria-pressed',x===b));paintSpec()});
dv=innerWidth<600?'phone':innerWidth<1100?'tablet':'desktop';$$('#dvseg button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.dv===dv));paintSpec();
const wr=$('#wrange'),ww=$('#wword'),wo=$('#wout');const setW=v=>{wr.value=v;ww.style.setProperty('--wd',v+'%');wo.textContent='wdth '+v};
wr.addEventListener('input',()=>setW(wr.value));$('#wmarks').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setW(b.dataset.w)});

/* ---------- spacing ---------- */
const SPC=[['s1',4,'Title to its line'],['s2',8,'Icon to label'],['s3',12,'Poster to text'],['s4',16,'Card padding'],['s5',24,'Heading to content'],['s6',32,'Between cards'],['s7',48,'Between blocks'],['s8',64,'Sections, phone'],['s9',96,'Sections, tablet'],['s10',128,'Sections, desktop']];
$('#bars').innerHTML=SPC.map(([k,v,u])=>`<div class="barrow" data-k="${k}"><span>${k}</span><span>${v}</span><i style="--w:${(v/128*100).toFixed(2)}%"></i><em>${u}</em></div>`).join('');
$('#bars').addEventListener('mouseover',e=>{const r=e.target.closest('.barrow');$$('#ncard [data-g]').forEach(x=>x.style.outline=r&&x.dataset.g===r.dataset.k?'2px solid var(--acc)':'')});
$('#bars').addEventListener('mouseleave',()=>$$('#ncard [data-g]').forEach(x=>x.style.outline=''));
$('#gapsBtn').addEventListener('click',e=>{const on=$('#ncard').classList.toggle('show');e.currentTarget.setAttribute('aria-pressed',on)});

/* ---------- three screens ---------- */
const DEV=[['Phone',390,844,'4 cols · margin 24 · gutter 12','56 top + 64 tab bar','64'],['Tablet',820,1180,'8 cols · margin 32 · gutter 24','64 top + 48 sections','96'],['Desktop',1440,900,'12 cols · margin 64 · gutter 24 · max 1312','72 top + 48 sections','128']];
const frames=[];let gridOn=false;
function post(fr,m){try{fr.contentWindow.postMessage(m,'*')}catch(e){}}
$('#devices').innerHTML=DEV.map((d,i)=>`<div class="dev" data-i="${i}"><div class="scr"><iframe title="${d[0]} ${d[1]} wide" src="frame.html" width="${d[1]}" height="${d[2]}" loading="lazy"></iframe></div><div class="cap"><b>${d[0]} · ${d[1]}</b><button data-open="${i}">Open large</button></div><ul><li><span>Grid</span><span>${d[3]}</span></li><li><span>Nav</span><span>${d[4]}</span></li><li><span>Section gap</span><span>${d[5]}</span></li></ul></div>`).join('');
$$('#devices iframe').forEach(f=>{frames.push(f);f.addEventListener('load',()=>{post(f,{font,grid:gridOn})})});
function sizeDevices(){const dv=$('#devices');const W=dv.parentElement.clientWidth,g=ms('--s5');const total=DEV.reduce((a,d)=>a+d[1],0);
  const s=W>=1000?(W-g*2)/total:W>=560?.36:.52;
  $$('#devices .dev').forEach((el,i)=>{const d=DEV[i];el.style.width=(d[1]*s)+'px';const sc=$('.scr',el);sc.style.width=(d[1]*s)+'px';sc.style.height=(d[2]*s)+'px';$('iframe',el).style.transform=`scale(${s})`})}
sizeDevices();addEventListener('resize',sizeDevices);
function setGrid(on){gridOn=on;$('#gridBtn').setAttribute('aria-pressed',on);frames.forEach(f=>post(f,{grid:on}));const fi=$('#focusBox iframe');if(fi)post(fi,{grid:on});$('#labgrid').classList.toggle('on',on)}
$('#gridBtn').addEventListener('click',()=>setGrid(!gridOn));
addEventListener('keydown',e=>{if((e.key==='g'||e.key==='G')&&!e.target.closest('input,textarea'))setGrid(!gridOn);if(e.key==='Escape')closeFocus()});
addEventListener('message',e=>{if(e.data&&'grid' in e.data&&e.data.grid!==gridOn)setGrid(e.data.grid)});
// lab's own grid overlay
const lg=document.createElement('div');lg.id='labgrid';lg.className='labgrid';lg.setAttribute('aria-hidden','true');lg.innerHTML='<div class="wrap grid"></div>';document.body.appendChild(lg);
const paintLG=()=>{$('.grid',lg).innerHTML='<i></i>'.repeat(+tok('--cols')||12)};paintLG();addEventListener('resize',paintLG);
let focusFr=null;
function openFocus(i){const d=DEV[i];$('#focusName').textContent=`${d[0]} · ${d[1]}`;const box=$('#focusBox');box.innerHTML=`<div><iframe title="${d[0]} large" src="frame.html" width="${d[1]}" height="${d[2]}"></iframe></div>`;
  const f=$('iframe',box);f.addEventListener('load',()=>post(f,{font,grid:gridOn}));$('#focus').classList.add('on');
  requestAnimationFrame(()=>{const bw=box.clientWidth,bh=box.clientHeight;const s=Math.min(1,bw/d[1],bh/d[2]);f.style.transform=`scale(${s})`;f.parentElement.style.width=d[1]*s+'px';f.parentElement.style.height=d[2]*s+'px'});$('#focusClose').focus()}
function closeFocus(){$('#focus').classList.remove('on');$('#focusBox').innerHTML=''}
$('#devices').addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b)openFocus(+b.dataset.open)});$('#focusClose').addEventListener('click',closeFocus);

/* ---------- layers ---------- */
const LY=[['page',0,'Content, posters, text',''],['raised',10,'A sticky product column','' ],['object',20,'The coin and its forms','ob'],['subnav',30,"The app's second bar",''],['header',40,'Top bar, always with backing','hdr'],['dock',50,'Phone tab bar, mini player','dk'],['scrim',60,'Dims the page behind a sheet',''],['sheet',70,'Menus, filters, the ticket','sh'],['prompt',80,'"Hear it?", toasts','pr'],['laser',90,'The red dot','lz'],['cat',100,'The cat that comes for the dot','ct']];
$('#rig').innerHTML=LY.map((l,i)=>`<div class="pl" data-l="${l[0]}" style="--i:${i}"><span>${l[0]} · ${l[1]}</span>${l[3]?`<i class="${l[3]}"></i>`:''}</div>`).join('');
$('#ltable tbody').innerHTML=LY.slice().reverse().map(l=>`<tr data-l="${l[0]}"><td>${l[0]}</td><td class="m">${l[1]}</td><td>${l[2]}</td></tr>`).join('');
const hlL=n=>{$$('#rig .pl').forEach(p=>p.classList.toggle('hl',p.dataset.l===n));$$('#ltable tr').forEach(r=>r.classList.toggle('hl',r.dataset.l===n))};
$('#ltable').addEventListener('mouseover',e=>{const r=e.target.closest('tr[data-l]');hlL(r?r.dataset.l:'')});$('#ltable').addEventListener('mouseleave',()=>hlL(''));
$('#rig').addEventListener('mouseover',e=>{const p=e.target.closest('.pl');hlL(p?p.dataset.l:'')});
$('#flatBtn').addEventListener('click',e=>{const f=$('#stack3d').classList.toggle('flat');e.currentTarget.setAttribute('aria-pressed',f);e.currentTarget.lastChild.textContent=f?'Explode':'Flatten'});
const MS=[['n24','Jawani 4eva Open Air','Dirty Good, Delhi. Sat 21 Nov.'],['n26','Somad Lab','The Humming Tree, Bengaluru. Sun 22 Nov.'],['n16','Domi & JD Beck','The Humming Tree, Bengaluru. Tue 17 Nov.']];
$$('.mini .ms').forEach(m=>{m.innerHTML=MS.map(x=>`<b>${x[1]}</b><p>${x[2]}</p><img src="assets/img/${x[0]}.webp" alt="">`).join('');m.scrollTop=ms('--s7')});
if(!RM){let dir=1,mt=performance.now();(function drift(now){const dt=now-mt;mt=now;$$('.mini .ms').forEach(m=>{if(m.matches(':hover'))return;const max=m.scrollHeight-m.clientHeight;if(m._y==null||Math.abs(m._y-m.scrollTop)>2)m._y=m.scrollTop;let y=m._y+dir*dt*.025;if(y>=max||y<=0){dir*=-1;y=Math.max(0,Math.min(max,y))}m._y=y;m.scrollTop=y});requestAnimationFrame(drift)})(mt)}

/* ---------- motion ---------- */
const DUR=[['tap',80,'Press down'],['quick',160,'Hover, colour, pupil to slit'],['base',240,'Tabs, chips, fields'],['move',400,'Sheets, reveals, record sliding out'],['flip',640,'Object changes form, world colour'],['scene',960,'The cat arriving, page switch']];
$('#mrows').innerHTML=DUR.map(d=>`<button class="mr" data-d="${d[0]}"><b>${d[0]}</b><span>${d[1]}ms</span><div class="track"><i style="transition:transform var(--d-${d[0]}) var(--e-out)"></i></div><p>${d[2]}</p></button>`).join('');
const sizeTracks=()=>$$('#mrows .track').forEach(t=>t.style.setProperty('--tw',t.clientWidth+'px'));sizeTracks();addEventListener('resize',sizeTracks);
const playRow=r=>{r.classList.toggle('go')};
$('#mrows').addEventListener('click',e=>{const r=e.target.closest('.mr');if(r)playRow(r)});
$('#playAll').addEventListener('click',()=>{const rows=$$('#mrows .mr');const go=!rows[0].classList.contains('go');rows.forEach((r,i)=>setTimeout(()=>r.classList.toggle('go',go),i*90))});
const EZ=[['out',[.2,.8,.2,1],'Default. Arrives fast, settles soft.'],['inout',[.65,0,.35,1],'Flips, things that leave and come back.'],['spring',[.34,1.56,.64,1],'Pounce, a stamp landing. Sparingly.'],['linear',[0,0,1,1],'Spins and scrubbing only.']];
function bz(p1,p2,t){const u=1-t;return 3*u*u*t*p1+3*u*t*t*p2+t*t*t}
function solve(x1,x2,x){let lo=0,hi=1;for(let i=0;i<24;i++){const m=(lo+hi)/2;bz(x1,x2,m)<x?lo=m:hi=m}return (lo+hi)/2}
$('#eases').innerHTML=EZ.map(([n,p,u])=>{const P=[];for(let i=0;i<=40;i++){const t=i/40;const x=bz(p[0],p[2],t),y=bz(p[1],p[3],t);P.push(`${(10+x*80).toFixed(1)},${(85-y*65).toFixed(1)}`)}
  return `<button class="ez" data-e="${n}"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M10 85H90M10 85V20" stroke="rgba(242,241,238,.14)" fill="none"/><path d="M${P.join('L')}" fill="none" stroke-width="2"/><circle r="4" cx="10" cy="85" fill="currentColor"/></svg><b>${n}</b><p>${u}</p></button>`}).join('');
$('#eases').addEventListener('click',e=>{const b=e.target.closest('.ez');if(!b)return;const p=EZ.find(x=>x[0]===b.dataset.e)[1];const c=$('circle',b);const D=ms('--d-flip')*1.5;const t0=performance.now();
  const step=now=>{const x=Math.min(1,(now-t0)/D);const t=solve(p[0],p[2],x);const y=bz(p[1],p[3],t);c.setAttribute('cx',10+x*80);c.setAttribute('cy',85-y*65);if(x<1)requestAnimationFrame(step);else setTimeout(()=>{c.setAttribute('cx',10);c.setAttribute('cy',85)},500)};requestAnimationFrame(step)});

const ptr=CCD.ptr,pounce=CCD.eyes.pounce,collectEyes=CCD.eyes.collect;
$('#pounceBox').addEventListener('click',()=>pounce($('#pounceEyes')));

const FORM_W={coin:'shared',ball:'nights',record:'artists',stamp:'host',dial:'school'};
const objs=[new CCD.Obj($('#heroGl'),{hint:$('#heroHint'),onCycle:f=>setWorld(FORM_W[f])}),new CCD.Obj($('#objGl'),{onCycle:f=>setWorld(FORM_W[f])})];
$('#forms').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const w={coin:'shared',ball:'nights',record:'artists',stamp:'host',dial:'school'}[b.dataset.f];setWorld(w)});

/* ---------- restore picks ---------- */
/* dock folds away once you're past the hero, unless you've opened it yourself */
let dockManual=true;
lastApp=store.get('last')||'nights';setWorld('shared');
window.__lab={setWorld,setFont,setEye,setGrid,openFocus,closeFocus,collectEyes,pounce};
})();
