
/* ===== new components, 12 Nov ===== */
(()=>{
  /* purr: the filled copy that is revealed while you hold */
  document.querySelectorAll('.btn.hold').forEach(b=>{const f=document.createElement('span');f.className='fc';f.setAttribute('aria-hidden','true');f.textContent=b.textContent;b.appendChild(f)});
  /* chrome objects on the doors: 120 frames of one turn, they turn while you point at the door */
  const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const setF=(el,f)=>{f=((f%120)+120)%120;el._f=f;const i=Math.floor(f);el.style.setProperty('--cx',i%11);el.style.setProperty('--cy',Math.floor(i/11))};
  ['ball','stamp','record','knob'].forEach((form,i)=>{const d=document.querySelectorAll('.doors .door')[i];if(!d)return;
    const c=document.createElement('i');c.className='chr';c.dataset.form=form;c.setAttribute('aria-hidden','true');d.appendChild(c);setF(c,14);
    let on=false,v=0,run=false,last=0;const tick=n=>{const dt=Math.min(50,n-last);last=n;v+=((on?24:0)-v)*.07;if(Math.abs(v)>.05)setF(c,c._f+v*dt/1000);if(on||Math.abs(v)>.05)requestAnimationFrame(tick);else run=false};
    const go=s=>{on=s&&!rm;if(on&&!run){run=true;last=performance.now();requestAnimationFrame(tick)}};
    d.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')go(true)});d.addEventListener('pointerleave',()=>go(false));d.addEventListener('focus',()=>go(true));d.addEventListener('blur',()=>go(false))});
})();

/* ===== round 2: Artists panel, laser cat ===== */
(()=>{
  const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* each artist's record has its own sound. It is generated from their genres here; the real site plays their 30 second previews. */
  const hash=s=>{let h=7;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h};
  const BN0=BN.slice(),LN0=LN.slice();let saved=null,artOn=-1;
  const K={four:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],brk:[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0],hop:[1,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0],slow:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0]};
  function soundOf(a){const g=a.g.join(' ').toLowerCase(),h=hash(a.n);let bpm=122,k=K.four,sw=0,hat=[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,1],clap=[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0];
    if(/techno/.test(g)){bpm=132;hat=[0,0,1,1,0,0,1,0,0,0,1,1,0,0,1,0]}
    if(/house|disco|garage/.test(g)){bpm=124;sw=.14}
    if(/break|electro|bass|ukg|jungle|drum|dub|footwork/.test(g)){bpm=136;k=K.brk;clap=[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1]}
    if(/hip|rap|trap|r&b|pop/.test(g)){bpm=92;k=K.hop;hat=[1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0]}
    if(/ambient|experimental|live|downtempo|indie/.test(g)&&!/techno|house/.test(g)){bpm=104;k=K.slow;hat=[0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0]}
    const tr=h%7-3,rot=h%5;return {bpm:bpm+(h%5)-2,k,sw,hat,clap,tr,rot}}
  function loadSound(i,o){const s=soundOf(o||ARTISTS[i]);if(!saved)saved={pat:JSON.parse(JSON.stringify(pat)),BPM,swing,BN:BN.slice(),LN:LN.slice()};
    BPM=s.bpm;swing=s.sw;pat.kick=s.k.slice();pat.hat=s.hat.slice();pat.clap=s.clap.slice();
    for(let j=0;j<16;j++){pat.bass[j]=PAT0.bass[(j+s.rot)%16];pat.lead[j]=PAT0.lead[(j+s.rot*3)%16];BN[j]=BN0[(j+s.rot)%16]+s.tr;LN[j]=(LN0[(j+s.rot*3)%16]||12)+s.tr}
    artOn=i}
  function unload(){if(!saved)return;Object.keys(saved.pat).forEach(k=>pat[k]=saved.pat[k]);BPM=saved.BPM;swing=saved.swing;saved.BN.forEach((v,j)=>BN[j]=v);saved.LN.forEach((v,j)=>LN[j]=v);saved=null}
  /* real audio first: the artist's own 30 second preview from Deezer. If this page is not allowed to reach it, the generated sound plays and the note says so. */
  const au=new Audio();au.loop=true;au.preload='none';let mode='synth',lastNote='',scr=false,scrT=0;const pv={};
  const note=t=>{lastNote=t;const n=document.getElementById('aNote');if(n)n.textContent=t};
  /* on the real site the server asks Deezer (same as the artist pages do). Elsewhere it falls back. */
  /* on the real site the server looks the artist up in our own data (their checked Deezer tracks, then Bandcamp, then SoundCloud).
     It answers "nothing on file" for a CCD artist with no music, and we never guess a namesake for them. If the server cannot be reached
     (the claude.ai copy of this page), Deezer is asked directly, then the stand-in plays and says so. */
  const emb=p=>p.kind==='bandcamp'?{embed:'Bandcamp',title:p.title,h:42,src:'https://bandcamp.com/EmbeddedPlayer/'+p.type+'='+p.id+'/size=small/bgcol=0c0d0f/linkcol=f3f1e4/transparent=true/'}
    :{embed:'SoundCloud',title:'',h:120,src:'https://w.soundcloud.com/player/?url='+encodeURIComponent(p.url)+'&auto_play=true&visual=false&show_comments=false&show_teaser=false&color=%23f3f1e4'};
  /* when there is no server (a static host), the same answers come from this snapshot of our artist data (13 Nov 2026),
     and fresh Deezer previews are fetched by track id. Names not in it get the Deezer name search. */
  const SONGS={"agent bugs":{},"bombie":{"sc":"https://soundcloud.com/bombiezip"},"dwell":{},"groovier":{},"jatayu":{"bc":["album",94277985,"Jewel Tones"]},"kandy kuri":{},"karan kanchan":{"dz":["4282398902","4273132682","4193765982","3964864251"],"dza":"9447538","sc":"https://soundcloud.com/karankanchanmusic"},"kohra":{"dz":["3261689331","2771049781","2771063851","969659342"],"dza":"491105","sc":"https://soundcloud.com/kohra"},"komorebi":{"dz":["4157620372","3833636131","3883820551","3871032891"],"dza":"5948862","sc":"https://soundcloud.com/komorebitunes"},"lost stories":{"dz":["3618739682","3642807602","3432628831","3129030331"],"dza":"1351220","sc":"https://soundcloud.com/loststories"},"merman":{},"midnight traffic":{"dz":["3698526012","3698514462","3698154622","3698526532"],"dza":"2082791","sc":"https://soundcloud.com/midnighttraffic"},"nikki nair":{"dz":["4286285752","4286285812","4050906491","4107957531"],"dza":"49201222","sc":"https://soundcloud.com/nikki-nair"},"prabh deep":{"dz":["4209279002","4159924032","4145156232","4130264131"],"dza":"8835380"},"sandunes":{"dz":["3713647912","3713623222","2949261141","2949261131"],"dza":"182503","bc":["album",1475962576,"Hand of Thought"],"sc":"https://soundcloud.com/sandunes"},"sartdawg":{},"shantam":{"dz":["4135550391","2446963215","2474645751","1462669252"],"dza":"1093443","bc":["album",789532966,"Iridescent (Shantones series, 2nd EP)"],"sc":"https://soundcloud.com/shantamk"},"sid vashi":{"sc":"https://soundcloud.com/sidvashi"},"suchi":{"bc":["album",3137247545,"Chunky Mole EP"],"sc":"https://soundcloud.com/suchisuchi"}};
  const jp=(path,done)=>{const fn='__dj'+Math.random().toString(36).slice(2),sc=document.createElement('script');let ok=false;const fin=v=>{if(ok)return;ok=true;try{delete window[fn]}catch(e){}sc.remove();done(v)};window[fn]=fin;sc.src='https://api.deezer.com/'+path+(path.includes('?')?'&':'?')+'output=jsonp&callback='+fn;sc.onerror=()=>fin(null);document.head.appendChild(sc);setTimeout(()=>fin(null),4000)};
  function local(a,cb){const e=SONGS[a.n.toLowerCase()];if(!e){previewJ(a,cb);return}const ids=(e.dz||[]).slice();
    const next=()=>{const id=ids.shift();if(id){jp('track/'+id,t=>{if(t&&t.preview){pv[a.n]={url:t.preview,title:t.title||''};cb(pv[a.n])}else next()});return}
      if(e.dza){jp('artist/'+e.dza+'/top?limit=5',j=>{const t=((j&&j.data)||[]).find(x=>x.preview);if(t){pv[a.n]={url:t.preview,title:t.title||''};cb(pv[a.n])}else rest()});return}rest()};
    const rest=()=>{if(e.bc){pv[a.n]=emb({kind:'bandcamp',type:e.bc[0],id:e.bc[1],title:e.bc[2]});cb(pv[a.n])}else if(e.sc){pv[a.n]=emb({kind:'soundcloud',url:e.sc});cb(pv[a.n])}else{pv[a.n]={none:true};cb(pv[a.n])}};next()}
  function preview(a,cb){if(a.n in pv)return cb(pv[a.n]);const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),8000);
    fetch('/api/deezer/find?q='+encodeURIComponent(a.n),{signal:ctl.signal}).then(r=>r.json().then(j=>({ok:r.ok,st:r.status,j}))).then(({ok,st,j})=>{clearTimeout(t);
      if(ok&&j&&j.url&&(!j.kind||j.kind==='audio')){pv[a.n]={url:j.url,title:j.title};cb(pv[a.n])}
      else if(ok&&j&&(j.kind==='bandcamp'||j.kind==='soundcloud')){pv[a.n]=emb(j);cb(pv[a.n])}
      else if(st===404&&j&&j.error){pv[a.n]={none:true};cb(pv[a.n])}
      else local(a,cb)}).catch(()=>{clearTimeout(t);local(a,cb)})}
  function previewJ(a,cb){if(a.n in pv)return cb(pv[a.n]);const fn='__dz'+hash(a.n),sc=document.createElement('script');let done=false;
    const fin=v=>{if(done)return;done=true;pv[a.n]=v;try{delete window[fn]}catch(e){}sc.remove();cb(v)};
    window[fn]=r=>{const t=((r&&r.data)||[]).find(x=>x.preview&&x.artist&&x.artist.name.toLowerCase()===a.n.toLowerCase());fin(t?{url:t.preview,title:t.title}:null)};
    sc.src='https://api.deezer.com/search?q='+encodeURIComponent('artist:"'+a.n+'"')+'&limit=8&output=jsonp&callback='+fn;sc.onerror=()=>fin(null);document.head.appendChild(sc);setTimeout(()=>fin(null),3500)}
  const isOn=()=>artOn===asel&&(mode==='real'?(!au.paused||scr):mode==='embed'?true:playing);
  /* the big record behind the page takes the artist's photo as its label */
  let artTex=null,logoTex=null,uArt=null;
  function setLabel(i){if(typeof glOK==='undefined'||!glOK)return;try{if(uArt===null)uArt=gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM),'uArt');if(!logoTex)logoTex=gl.getParameter(gl.TEXTURE_BINDING_2D);
    if(i<0){if(logoTex)gl.bindTexture(gl.TEXTURE_2D,logoTex);gl.uniform1f(uArt,0);return}
    const im=new Image();im.onload=()=>{if(artOn!==i)return;if(!artTex)artTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,artTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(k=>gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR));[gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(k=>gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE));gl.uniform1f(uArt,1)};im.src='img/'+ARTISTS[i].img+'.webp'}catch(e){}}
  function fallback(){mode='synth';loadSound(asel);artOn=asel;if(playing){step=0}else setPlaying(true);note('No preview could load on this page, so this is a stand-in beat in their style.')}
  /* Bandcamp and SoundCloud play in their own small player, put right under the note */
  function dropEmbed(){document.querySelectorAll('.emb').forEach(e=>e.remove())}
  function putEmbed(after,p){dropEmbed();if(!after)return;const w=document.createElement('div');w.className='emb';const f=document.createElement('iframe');f.src=p.src;f.height=p.h;f.title=p.embed+' player';f.loading='lazy';f.allow='autoplay; encrypted-media';f.setAttribute('seamless','');w.appendChild(f);after.after(w)}
  const embNote=p=>p.embed==='Bandcamp'?'Their newest release'+(p.title?', “'+p.title+'”,':'')+' is on Bandcamp. Press play below.':'Their SoundCloud is below. Press play if it has not started.';
  const noneNote=n=>'We do not have a track of '+n+'’s to play yet.';
  function stopArtist(){au.pause();dropEmbed();if(mode==='synth'&&playing&&artOn>=0)setPlaying(false);unload();artOn=-1;scr=false;mode='synth';setLabel(-1);note('')}
  function playArtist(on){if(!on){stopArtist();return}const a=ARTISTS[asel];au.pause();dropEmbed();unload();artOn=asel;setLabel(asel);note('Finding their track.');
    preview(a,p=>{if(artOn!==asel||ARTISTS[asel]!==a)return;
      if(p&&p.url){mode='real';if(playing)setPlaying(false);au.src=p.url;au.play().then(()=>note('Playing “'+p.title+'”. A 30 second preview from Deezer.')).catch(fallback)}
      else if(p&&p.embed){mode='embed';if(playing)setPlaying(false);putEmbed(document.getElementById('aNote'),p);note(embNote(p))}
      else if(p&&p.none){mode='synth';artOn=-1;setLabel(-1);note(noneNote(a.n))}
      else fallback()})}
  /* anyone on an Episode line-up can be played the same way. off() is called when there is nothing to play. */
  window.__ccdPlay=(n,say,host,off)=>{const a={n,g:['House','Breaks']};au.pause();dropEmbed();if(mode==='synth'&&playing&&artOn!==-1)setPlaying(false);unload();artOn=-2;setLabel(-1);say('Finding their track.');const fb=()=>{mode='synth';loadSound(-2,a);if(playing){step=0}else setPlaying(true);say('No preview could load here. This is a stand-in beat, not their track.')};
    preview(a,p=>{if(artOn!==-2)return;
      if(p&&p.url){mode='real';if(playing)setPlaying(false);au.src=p.url;au.play().then(()=>say('Playing “'+p.title+'”. A 30 second preview from Deezer.')).catch(fb)}
      else if(p&&p.embed){mode='embed';if(playing)setPlaying(false);putEmbed(host,p);say(embNote(p))}
      else if(p&&p.none){mode='synth';artOn=-1;say(noneNote(n));if(off)off()}
      else fb()})};
  window.__ccdStop=()=>stopArtist();
  function aScrub(da){if(mode!=='real'||artOn<0)return;if(!scr){scr=true;au.pause()}try{au.currentTime=Math.max(0,Math.min((au.duration||30)-.3,au.currentTime+da*.4))}catch(e){}au.play().catch(()=>{});clearTimeout(scrT);scrT=setTimeout(()=>au.pause(),80)}
  function aRelease(){if(scr){scr=false;clearTimeout(scrT);au.play().catch(()=>{})}}
  setInterval(()=>{if(artOn>=0&&active&&!String(active.dataset.k).startsWith('artists')&&mode==='synth'){unload();artOn=-1;setLabel(-1)}const d=document.querySelector('.adet .tt');if(d){const on=isOn();d.classList.toggle('on',on);const l=document.querySelector('#playA .lbl');if(l)l.textContent=on?'Stop':'Play the record'}},300);
  let rot=0,lastR=performance.now(),grab=null;(function turn(n){const dt=Math.min(.05,(n-lastR)/1000);lastR=n;const r=document.querySelector('.plat .rec');if(r){if(isOn()&&!grab&&!scr&&!rm)rot+=dt*198;r.style.setProperty('--rot',rot.toFixed(1)+'deg')}requestAnimationFrame(turn)})(lastR);
  /* scratch the big record too */
  {let bg=null;const A2=e=>Math.atan2(e.clientY-lastC.y,e.clientX-lastC.x);kh.addEventListener('pointerdown',e=>{if(mode==='real'&&artOn>=0&&shape===3)bg={a:A2(e)}});kh.addEventListener('pointermove',e=>{if(!bg)return;const a=A2(e);let da=a-bg.a;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;bg.a=a;rot+=da*180/Math.PI;aScrub(da)});const u=()=>{if(bg){bg=null;aRelease()}};kh.addEventListener('pointerup',u);kh.addEventListener('pointercancel',u)}
  /* the fan side */
  const old=aRender;
  aRender=function(){old();const a=ARTISTS[asel],d=document.getElementById('aDet');
    const ph=d.querySelector('.ph'),deck=document.createElement('div');deck.className='tt';
    deck.innerHTML=`<button class="plat" id="plat" aria-label="${a.n}'s record. Press to play. Drag it round to scratch."><span class="rec"><img src="img/${a.img}.webp" alt=""></span></button><i class="arm"></i><span class="hint">Drag the record to scratch</span>`;
    ph.replaceWith(deck);
    d.querySelector('.where').textContent=[a.c,...a.g].join(' · ');const ch=d.querySelector('.chips');if(ch)ch.remove();
    const recs=d.querySelector('.recs');if(a.r){const c=document.createElement('div');c.className='crate';c.setAttribute('role','img');c.setAttribute('aria-label',a.r+' records on file');const h=hash(a.n);c.innerHTML=Array.from({length:a.r},(_,i)=>`<i class="${(i*7+h)%5===0?'c':''}" style="height:${62+((i*37+h)%38)}%"></i>`).join('');recs.before(c);recs.innerHTML=`<b>${a.r}</b> records on file`}
    const acts=d.querySelector('.acts'),pb=document.createElement('button');pb.className='btn sm solid';pb.id='playA';pb.innerHTML='<span class="lbl">Play the record</span>';acts.prepend(pb);const fb=d.querySelector('#fanB');fb.className='btn sm';
    pb.onclick=()=>playArtist(!isOn());
    const sb=d.querySelector('#sendB');if(sb&&!sb.querySelector('.fc')){const f=document.createElement('span');f.className='fc';f.setAttribute('aria-hidden','true');f.textContent=sb.textContent;sb.appendChild(f)}
    const pl=deck.querySelector('.plat'),ang=e=>{const r=pl.getBoundingClientRect();return Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2))};
    pl.addEventListener('pointerdown',e=>{grab={a:ang(e),acc:0,moved:0,scr:false};if(mode==='synth'&&playing&&artOn===asel&&E){grab.scr=true;clearInterval(timer);timer=null;evq.length=0}pl.setPointerCapture(e.pointerId);e.preventDefault()});
    pl.addEventListener('pointermove',e=>{if(!grab)return;const a2=ang(e);let da=a2-grab.a;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;grab.a=a2;grab.moved+=Math.abs(da);rot+=da*180/Math.PI;if(mode==='real'&&artOn===asel&&grab.moved>.06)aScrub(da);
      if(grab.scr){grab.acc+=da;const q=Math.PI/8,v=Math.abs(da);let n=0;while(grab.acc>=q&&n++<4){grab.acc-=q;scrub(1,v);step=(step+1)%STEPS}while(grab.acc<=-q&&n++<4){grab.acc+=q;step=(step+STEPS-1)%STEPS;scrub(-1,v)}}});
    const up=()=>{if(!grab)return;const g=grab;grab=null;if(g.scr&&playing&&!timer){nextT=actx.currentTime+.05;timer=setInterval(sched,25)}aRelease();if(g.moved<.06)playArtist(!isOn())};
    pl.addEventListener('pointerup',up);pl.addEventListener('pointercancel',up);
    pl.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();playArtist(!isOn())}});
    if(artOn>=0&&artOn!==asel)playArtist(true);else if(lastNote&&artOn===asel){const nn=document.getElementById('aNote');if(nn)nn.textContent=lastNote}
  };
  aRender();
  /* the artist side, with fewer words */
  const A=document.getElementById('aArt');if(A){const h=A.querySelectorAll('h5');if(h[0])h[0].firstChild.textContent='Asks ';if(h[1])h[1].textContent='Tour';
    const note=A.querySelector('p.note');if(note)note.remove();
    const top=document.createElement('div');top.className='desk-top';top.innerHTML='<b>Your desk</b><a class="btn sm solid" href="#artists">Find your page</a>';A.prepend(top)}
  /* how it works, in the order you would do it */
  const T=['Pick a record','Play it. Drag it to scratch.','Be a fan','Book them'];
  if(typeof TOUR!=='undefined'&&TOUR.artists){document.querySelectorAll('.steps[data-app="artists"] button').forEach((b,i)=>{if(T[i]){if(TOUR.artists[i])TOUR.artists[i].t=T[i];const n=[...b.childNodes].reverse().find(x=>x.nodeType===3&&x.textContent.trim());if(n)n.textContent=T[i];else{const s=b.querySelector('span:not(.n)');if(s)s.textContent=T[i]}}})}
  /* the laser's cat: it runs after the dot and jumps on it when the dot stops */
  const cat=document.createElement('div');cat.id='lzcat';cat.setAttribute('aria-hidden','true');cat.innerHTML='<img src="img/cat_dance.png" alt="">';document.body.appendChild(cat);
  const cp={x:innerWidth*.5,y:innerHeight+90},ci=cat.firstChild;let still=0,jumped=false,lastC2=performance.now(),was=false;
  (function chase(n){const dt=Math.min(.05,(n-lastC2)/1000);lastC2=n;
    if(laserOn){if(!was){was=true;cat.style.display='block';cp.x=lzP.x<innerWidth/2?innerWidth+60:-60;cp.y=lzP.y}
      const dx=lzP.x-cp.x,dy=lzP.y+22-cp.y,d=Math.hypot(dx,dy),sp=rm?2000:Math.min(900,260+d*2.2);
      if(d>26){const m=Math.min(d-20,sp*dt);cp.x+=dx/d*m;cp.y+=dy/d*m;still=0;jumped=false;cat.className='run';cat.style.setProperty('--face',dx<0?-1:1)}
      else{still+=dt;if(still>.5&&!jumped){jumped=true;cat.className='jump';ci.src='img/cat_hand.png';pulse=1;try{if(playing&&E)E.fire.kick(actx.currentTime+.01,0)}catch(e){}{const el=document.elementFromPoint(lzP.x,lzP.y),t=el&&el.closest('button,a,.ad,img,.chip,input[type=range]');if(t){if(t.id==='xf')setX(xside>=.5?0:1,true);t.classList.remove('bat');void t.offsetWidth;t.classList.add('bat');setTimeout(()=>t.classList.remove('bat'),520)}}setTimeout(()=>{ci.src='img/cat_dance.png';cat.className='sit'},560)}else if(!jumped)cat.className='sit'}
      cat.style.transform=`translate(${cp.x.toFixed(1)}px,${cp.y.toFixed(1)}px)`}
    else if(was){was=false;cat.style.display='none'}
    requestAnimationFrame(chase)})(lastC2);
})();
window.__ccd={get s(){return {playing,BPM,step,timer:timer!==null,laserOn}},get mix(){try{return E?ROWS.map(([k])=>k+' '+E.G[k].gain.value.toFixed(2)).join(', '):'no audio yet'}catch(e){return String(e)}}};
/* host: the invite tilts like a card in your hand */
(()=>{const c=document.getElementById('invite');if(!c||matchMedia('(prefers-reduced-motion: reduce)').matches)return;c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect();c.style.setProperty('--ry',(((e.clientX-r.left)/r.width-.5)*14).toFixed(1)+'deg');c.style.setProperty('--rx',((.5-(e.clientY-r.top)/r.height)*10).toFixed(1)+'deg')});c.addEventListener('pointerleave',()=>{c.style.setProperty('--rx','0deg');c.style.setProperty('--ry','0deg')})})();

/* host: flip the invite to its back */
(()=>{const c=document.getElementById('invite');if(!c)return;const b=document.createElement('div');b.className='back';b.innerHTML='<div><small>Entry</small><b></b></div><div class="code" role="img" aria-label="Entry code, example"></div><small>Show this at the door. Example code.</small>';c.appendChild(b);
  const fb=document.createElement('button');fb.className='btn sm';fb.id='flipB';fb.type='button';fb.textContent='Flip the card';c.after(fb);
  fb.onclick=()=>{const n=document.getElementById('iName');b.querySelector('b').textContent=(n&&n.textContent.trim())||'Your night';try{b.querySelector('.code').innerHTML=hQr(((n&&n.textContent.trim())||'Your night')+'|entry')}catch(e){}const sw=()=>{c.classList.toggle('showback');fb.textContent=c.classList.contains('showback')?'Flip it back':'Flip the card'};
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){sw();return}c.classList.add('edge');setTimeout(()=>{sw();c.classList.remove('edge')},210)}})();

/* episodes: days to the next one, and the three posters to pull */
(()=>{const tc=document.querySelector('#ch-episodes .tc');if(!tc||typeof EPS==='undefined')return;const nx=EPS.find(e=>e.next);if(nx){const d=Math.ceil((new Date('2026-11-25T00:00:00+05:30')-Date.now())/864e5);const el=document.createElement('div');el.className='epnext';el.innerHTML=d>0?`<b>${d}</b><span><small>${d===1?'day':'days'} to Episode ${nx.n}</small>${nx.d.replace(' 2026','')}<br>${nx.v}, Bengaluru</span>`:`<b>${d===0?'Tonight':'Ep '+nx.n}</b><span><small>Episode ${nx.n}</small>${nx.d.replace(' 2026','')}<br>${nx.v}, Bengaluru</span>`;tc.appendChild(el)}
  const go=i=>{epS=i;epR();const r=document.querySelector('#ch-episodes .eprow');if(r)r.scrollIntoView({behavior:'smooth',block:'start'})};
  const fan=document.createElement('div');fan.className='epfan';EPS.forEach((e,i)=>{if(!e.img)return;const b=document.createElement('button');b.type='button';b.style.setProperty('--r',((i%2?1:-1)*(3+i))+'deg');b.setAttribute('aria-label','Episode '+e.n+', '+e.d+', '+e.v);b.innerHTML=`<img src="img/${e.img}.webp" alt="">`;b.onclick=()=>go(i);fan.appendChild(b)});tc.appendChild(fan);
  /* the line-up plays: tap a name */
  let cur=null;const epR0=epR;epR=function(){epR0();cur=null;const box=document.querySelector('#ch-episodes .epi');if(!box)return;const note=document.createElement('p');note.className='note epnote';note.setAttribute('aria-live','polite');const ol=box.querySelector('.trk');if(!ol)return;ol.after(note);
    ol.querySelectorAll('li').forEach(li=>{const sp=li.querySelector('span'),name=li.textContent.replace(sp?sp.textContent:'','').trim();if(!name||/open decks/i.test(name))return;li.classList.add('pl');li.tabIndex=0;li.setAttribute('role','button');li.setAttribute('aria-label','Play '+name);const pp=document.createElement('i');pp.className='pp';pp.textContent='Play';li.appendChild(pp);
      const tog=()=>{ol.querySelectorAll('li.on').forEach(x=>{x.classList.remove('on');x.querySelector('.pp').textContent='Play'});if(cur===name){cur=null;window.__ccdStop();note.textContent='';return}cur=name;li.classList.add('on');pp.textContent='Stop';window.__ccdPlay(name,t=>{if(cur===name)note.textContent=t},note,()=>{if(cur!==name)return;cur=null;li.classList.remove('on');pp.textContent='Play'})};
      li.addEventListener('click',tog);li.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tog()}})})};epR();
  if(nx){const a=document.createElement('button');a.type='button';a.className='btn solid epgo';a.textContent='See Episode '+nx.n;a.onclick=()=>go(EPS.indexOf(nx));tc.appendChild(a)}})();
/* points: a line with the rewards on it, filled as you earn */
(()=>{const v=document.getElementById('vu'),t=document.getElementById('pTot');if(!v||!t)return;const R=[[200,'+1'],[300,'Spot'],[800,'Ticket']];const d=document.createElement('div');d.className='ptrack';d.setAttribute('role','img');d.innerHTML='<i class="fill"></i>'+R.map(([n,l])=>`<span style="--p:${n/8}%"><b>${l}</b>${n}</span>`).join('');v.after(d);
  const up=()=>{const p=parseInt(t.textContent.replace(/\D/g,''))||0;d.style.setProperty('--w',Math.min(100,p/8)+'%');d.setAttribute('aria-label',p+' points. Rewards at 200, 300 and 800.');[...d.querySelectorAll('span')].forEach((s,i)=>s.classList.toggle('got',p>=R[i][0]))};up();setInterval(up,400)})();

/* what we built: big chrome objects. Point at one and the page takes its colour. */
(()=>{const rm=matchMedia('(prefers-reduced-motion: reduce)').matches,root=document.documentElement;const w=document.createElement('div');w.id='hovwash';w.setAttribute('aria-hidden','true');document.body.appendChild(w);
  const setF=(el,f)=>{f=((f%120)+120)%120;el._f=f;const i=Math.floor(f);el.style.setProperty('--cx',i%11);el.style.setProperty('--cy',Math.floor(i/11))};let prev=null;
  document.querySelectorAll('.rl li,.doors .door').forEach(d=>{const c=d.querySelector('.chr'),col=getComputedStyle(d).getPropertyValue('--c').trim();if(c&&c._f==null)setF(c,14);
    let on=false,v=0,run=false,last=0;const tick=n=>{const dt=Math.min(50,n-last);last=n;v+=((on?24:0)-v)*.07;if(c&&Math.abs(v)>.05)setF(c,c._f+v*dt/1000);if(on||Math.abs(v)>.05)requestAnimationFrame(tick);else run=false};
    const go=s=>{if(s){if(prev===null)prev=root.style.getPropertyValue('--acc');root.style.setProperty('--acc',col);w.style.setProperty('--hc',col);w.classList.add('on')}else{if(prev!==null){root.style.setProperty('--acc',prev);prev=null}w.classList.remove('on')}
      if(d.matches('.rl li')){on=s&&!rm;if(on&&!run){run=true;last=performance.now();requestAnimationFrame(tick)}}};
    d.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')go(true)});d.addEventListener('pointerleave',()=>go(false));d.addEventListener('focus',()=>go(true));d.addEventListener('blur',()=>go(false))})})();
/* round 10: lines draw on scroll with a tail, and the opening line lights up as you scroll */
(()=>{const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doors=[...document.querySelectorAll('.doors .door')],rules=[...document.querySelectorAll('.rl li')];
  [...doors,...rules].forEach(el=>{const t=document.createElement('i');t.className='tail';t.setAttribute('aria-hidden','true');el.appendChild(t)});
  if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>e.target.classList.toggle('in',e.isIntersecting)),{threshold:.7});rules.forEach(r=>io.observe(r))}else rules.forEach(r=>r.classList.add('in'));
  const h=document.querySelector('#why .say');let ws=[];
  if(h&&!rm){const wrap=n=>{[...n.childNodes].forEach(c=>{if(c.nodeType===3){const f=document.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(p=>{if(!p)return;if(/^\s+$/.test(p)){f.appendChild(document.createTextNode(p));return}const s=document.createElement('span');s.className='w';s.textContent=p;f.appendChild(s)});c.replaceWith(f)}else if(c.nodeType===1)wrap(c)})};wrap(h);ws=[...h.querySelectorAll('.w')]}
  let tk=false;const up=()=>{tk=false;const on=scrollY>8;doors.forEach(d=>d.classList.toggle('in',on));
    if(ws.length){const r=h.getBoundingClientRect(),vh=innerHeight,p=Math.max(0,Math.min(1,(vh*.9-r.top)/(vh*.5+r.height))),n=p*ws.length;for(let i=0;i<ws.length;i++)ws[i].style.opacity=i<n?1:.2}};
  addEventListener('scroll',()=>{if(!tk){tk=true;requestAnimationFrame(up)}},{passive:true});up()})();
/* round 11: a press flicks the tail; the track builds one part per section; an echo comes in at the end */
(()=>{document.querySelectorAll('.doors .door,.rl li').forEach(el=>el.addEventListener('pointerdown',()=>{el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit');setTimeout(()=>el.classList.remove('hit'),480)}));
  try{const L={episodes:2,'episodes-b':2,host:3,'host-b':3,'host-x':3,'gear-h':3,'gear-x':3,artists:4,'artists-b':4,'artists-x':4};Object.keys(L).forEach(k=>{if(STAGES[k])STAGES[k].lv=L[k]})}catch(e){}
  let wet=null;setInterval(()=>{try{if(!E||!actx)return;if(!wet){const d=actx.createDelay(1),fb=actx.createGain();wet=actx.createGain();d.delayTime.value=60/BPM*.75;fb.gain.value=.35;wet.gain.value=0;E.filt.connect(d);d.connect(fb);fb.connect(d);d.connect(wet);wet.connect(an)}
    const k=active?String(active.dataset.k):'';window.__ccdWet=wet;wet.gain.setTargetAtTime(k==='points'||k==='outro'?.45:0,actx.currentTime,.3)}catch(e){}},500)})();
/* round 12: plain heading for the feature list, and the logo goes home */
(()=>{const fix=()=>document.querySelectorAll('.liner h2').forEach(h=>{const m=h.textContent.match(/on the (.+) record/i);if(m)h.textContent='What '+m[1].trim()+' does'});fix();addEventListener('hashchange',()=>setTimeout(fix,80));
  const im=document.querySelector('nav.top img[src*="logo"],header img[src*="logo"],nav img[src*="logo"]');const lg=im&&(im.closest('a,button')||im.parentElement);
  if(lg){lg.style.cursor='pointer';lg.setAttribute('aria-label','Cats Can Dance, home');lg.addEventListener('click',e=>{e.preventDefault();if(location.hash&&location.hash!=='#')location.hash='';setTimeout(()=>scrollTo({top:0,behavior:'smooth'}),60)})}})();
/* after switching pages, nothing waits hidden for a scroll */
addEventListener('hashchange',()=>setTimeout(()=>document.querySelectorAll('.rv').forEach(e=>{if(e.offsetParent)e.classList.add('in')}),320));
/* round 13: points as three rewards that unlock */
(()=>{const t=document.getElementById('pTot'),box=t&&t.closest('.pts');if(!box)return;const R=[[200,'Bring a +1'],[300,'Guaranteed spot'],[800,'Free ticket']];
  const L='<path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z"/>',U='<path d="M7 11V8a5 5 0 0 1 9.6-2M5 11h14v10H5z"/>';
  const g=document.createElement('div');g.className='rewards';g.innerHTML=R.map(([n,l])=>`<div class="rw"><svg viewBox="0 0 24 24" aria-hidden="true">${L}</svg><b>${l.replace('+1','<em class="pl1">+1</em>')}</b><span></span><i></i></div>`).join('');t.closest('.tot').after(g);
  const old=[...box.querySelectorAll('*')].find(e=>!e.children.length&&/Bring a \+1/.test(e.textContent)&&!g.contains(e));if(old){let c=old;while(c.parentElement&&c.parentElement!==box)c=c.parentElement;if(c!==g&&c.parentElement===box)c.style.display='none'}
  const up=()=>{const p=parseInt(t.textContent.replace(/\D/g,''))||0;[...g.children].forEach((el,i)=>{const n=R[i][0],ok=p>=n;el.classList.toggle('got',ok);el.querySelector('svg').innerHTML=ok?U:L;el.querySelector('span').textContent=ok?'Unlocked':(n-p)+' points to go';el.querySelector('i').style.setProperty('--w',Math.min(100,p/n*100)+'%')})};up();setInterval(up,400)})();

/* ===== round 14 ===== */
/* phone: the closing object sits in a slot above the words, so it scrolls with them instead of over them */
(()=>{const o=document.getElementById('outro');if(!o)return;const s=document.createElement('div');s.className='objslot oslot';s.setAttribute('aria-hidden','true');o.prepend(s)})();
/* the page's own tour (decided 13 Nov): it still plays once when a panel comes into view, but it stops for good
   the moment you touch that panel, and it never types over something you typed. Its typing used to keep running after it stopped. */
(()=>{const typers=new Set();
  const typeC=(inp,txt)=>{if(!inp||inp.dataset.mine)return;inp.value='';let i=0;const t=setInterval(()=>{if(inp.dataset.mine){clearInterval(t);typers.delete(t);return}inp.value=txt.slice(0,++i);inp.dispatchEvent(new Event('input'));if(i>=txt.length){clearInterval(t);typers.delete(t)}},45);typers.add(t)};
  const end0=endTour;endTour=function(a,i){typers.forEach(clearInterval);typers.clear();return end0(a,i)};
  TOUR.host[0].run=e=>typeC(e,'Mishti turns 30');
  TOUR.host[3].run=(e,auto)=>{if(e.id==='iRsvp')e.click();if(auto&&!hMe){const w=$('#iWho');typeC(w,'Ishaan');setTimeout(()=>{if(!hMe&&!iF.hidden&&!w.dataset.mine)iF.requestSubmit()},900)}};
  /* Artists: the steps now do what their labels say. The auto run points at Play but does not start sound by itself. */
  IC.play='<path d="M8 5.5v13l10.5-6.5z"/>';
  TOUR.artists=[{t:'Pick a record',ic:'disc',el:()=>{fanSide();return $$('#aDiscs .ad')[1]},run:e=>e.click()},
    {t:'Play it. Drag it to scratch.',ic:'play',el:()=>{fanSide();return $('#playA')},run:(e,auto)=>{if(!auto)e.click()}},
    {t:'Be a fan',ic:'heart',el:()=>{fanSide();return $('#fanB')},run:e=>e.click()},
    {t:'Book them',ic:'send',el:()=>{fanSide();return $('#bookB')},run:e=>{if(!$('#offer').classList.contains('show'))e.click()}}];
  stepEls('artists').forEach((b,i)=>{const s=TOUR.artists[i],svg=b.querySelector('svg');if(s&&svg)svg.innerHTML=IC[s.ic]});
  /* your own input is yours */
  const mine=e=>{const t=e.target;if(t&&t.matches&&t.matches('input,textarea'))t.dataset.mine='1'};
  document.addEventListener('keydown',mine,true);document.addEventListener('pointerdown',mine,true);document.addEventListener('paste',mine,true);
  /* touching a panel in any way ends its tour */
  $$('.panel[data-tour]').forEach(p=>{const stop=()=>{toured[p.dataset.tour]=1;if(tour&&tour.app===p.dataset.tour)endTour(p.dataset.tour,tour.i-1)};
    ['keydown','focusin','input'].forEach(ev=>p.addEventListener(ev,e=>{if(e.isTrusted)stop()}))})})();
/* scroll: the page asked every section for its box on every frame, which forces layout each frame.
   Section positions are now kept and measured again only when the layout changes (or once a second). */
(()=>{const absTop=el=>{let t=0;while(el){t+=el.offsetTop;el=el.offsetParent}return t};let cache=null,ct=0;
  const build=()=>{cache=stages.filter(s=>s.offsetParent).map(s=>{const t=absTop(s);return {s,t,b:t+s.offsetHeight}});ct=performance.now()};
  const drop=()=>{cache=null};let bh=0;setInterval(()=>{const h=document.body.scrollHeight;if(h!==bh){bh=h;drop()}},300);
  addEventListener('resize',drop);addEventListener('hashchange',drop);
  pick=function(){if(!cache||performance.now()-ct>1000)build();if(!cache.length)return stages[0];const mid=scrollY+innerHeight*.5;let best=cache[0].s,bd=1e9;
    for(const c of cache){if(c.t<=mid&&c.b>mid)return c.s;const d=Math.min(Math.abs(c.t-mid),Math.abs(c.b-mid));if(d<bd){bd=d;best=c.s}}return best}})();
(()=>{const w=document.getElementById('why');if(!w)return;const s=document.createElement('div');s.className='objslot wslot';s.setAttribute('aria-hidden','true');(w.querySelector('.why-in')||w).prepend(s)})();
/* item 14: a picture on every feature card, made from the product itself (real posters, photos, School screens, the chrome objects, the real buttons) */
(()=>{const im=(f,c='')=>`<img src="img/${f}.webp" alt="" loading="lazy" class="${c}">`,av=f=>`<img src="img/a-${f}.webp" alt="" loading="lazy" class="fp-av">`,
  chr=(f,x)=>`<i class="chr fp-chr" data-form="${f}" style="--cx:${x%11};--cy:${Math.floor(x/11)}"></i>`,eye='<span class="fp-ey"><i></i><i></i></span>',
  qr=s=>{try{return hQr(s)}catch(e){return ''}},sv=d=>`<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`,
  R={vj:sv('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>'),snd:sv('<rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="14" r="3.5"/><circle cx="12" cy="7.5" r="1.5"/>'),ph:sv('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),lt:sv('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>')};
  const P={
   nights:[`<div class="fp-fan">${im('n00')}${im('n08')}${im('n03')}</div>`,
     `<div class="fp-chips">${['Bengaluru','Mumbai','Delhi NCR','Goa','Hyderabad'].map((c,i)=>`<span class="${i?'':'on'}">${c}</span>`).join('')}</div>`,
     `<div class="fp-rows"><div>${av('sandunes')}<span>Sandunes</span><u>↗</u></div><div>${av('kohra')}<span>Kohra</span><u>↗</u></div></div>`,
     `<div class="fp-mid"><span class="fp-btn solid">${eye}I'm going</span><small>+ 8 others</small></div>`,
     `<div class="fp-eyes">${Array.from({length:9},(_,i)=>`<span class="fp-ey${i===4?' me':''}"><i></i><i></i></span>`).join('')}</div>`,
     `<div class="fp-mid"><div class="fp-tix"><b>Fri 13 Nov</b><span>Entry · 1</span></div></div>`,
     `<div class="fp-mid">${chr('stamp',14)}</div>`,
     `<div class="fp-fan sq">${im('ep4')}${im('ep2')}</div>`],
   host:[`<div class="fp-mid"><div class="fp-inv"><small>You're invited</small><b>Rooftop<br>thing</b></div></div>`,
     `<div class="fp-mid"><div class="fp-seg"><span class="on">Free, RSVP</span><span>Tickets</span></div></div>`,
     `<div class="fp-rows"><div><span>Aditi</span><em class="on">Going</em></div><div><span>Rohan +1</span><em class="on">Going</em></div><div><span>Zoya</span><em>Maybe</em></div></div>`,
     `<div class="fp-mid"><div class="fp-qr">${qr('door')}</div><small class="ok">Aditi is in</small></div>`,
     `<div class="fp-mid">${chr('record',30)}${chr('knob',60)}</div>`,
     `<div class="fp-chips roles"><span>${R.vj}VJ</span><span>${R.snd}Sound</span><span>${R.ph}Photo</span></div>`,
     `<div class="fp-mid">${av('nikki-nair')}<span class="fp-btn hold">Send offer</span></div>`,
     `<div class="fp-mid"><div class="fp-post">${im('n10')}<span>Live on Nights</span></div></div>`],
   artists:[`<div class="fp-rows src"><div><span>A release</span><u>Source ↗</u></div><div><span>A gig</span><u>Source ↗</u></div><div><span>A press piece</span><u>Source ↗</u></div></div>`,
     `<div class="fp-mid">${av('sandunes')}<span class="fp-live"><i></i>New release · today</span></div>`,
     `<div class="fp-mid"><span class="fp-btn">Be a fan</span><span class="fp-btn on">Fan ✓</span></div>`,
     `<div class="fp-mid"><div class="fp-offer"><b>Sat 5 Dec · Bengaluru</b><span>Club night, 2 hour set</span></div></div>`,
     `<div class="fp-route"><span>Goa</span><i></i><span>Mumbai</span><i></i><span>Delhi</span></div>`,
     `<div class="fp-mid"><svg class="fp-tee" viewBox="0 0 64 56" aria-hidden="true"><path d="M20 4l-16 9 6 11 6-3v31h32V21l6 3 6-11-16-9c-2 5-6 8-12 8s-10-3-12-8z"/></svg><small>From their page</small></div>`,
     `<div class="fp-mid"><span class="fp-btn solid">${eye}Claim your page</span></div>`,
     `<div class="fp-bars">${[['Bengaluru',92],['Mumbai',70],['Delhi',54],['Goa',30]].map(([c,v])=>`<div><span>${c}</span><i style="width:${v}%"></i></div>`).join('')}</div>`],
   school:[`<div class="fp-fan sq">${im('s_learn')}${im('s_studio')}${im('s_dj')}</div>`,
     `<div class="fp-pads">${Array.from({length:16},(_,i)=>`<i class="${[0,4,8,12,6,14].includes(i)?'on':''}"></i>`).join('')}</div>`,
     `<div class="fp-layers">${['Kick','Hats','Clap','Bass','Lead'].map((l,i)=>`<div><span>${l}</span><i style="width:${30+i*14}%"></i></div>`).join('')}</div>`,
     `<div class="fp-chips">${['Find the one','Count it in','Four on the floor'].map(c=>`<span>${c}</span>`).join('')}</div>`,
     `<div class="fp-shot">${im('s_studio')}</div>`,
     `<div class="fp-shot">${im('s_dj')}</div>`,
     `<div class="fp-chips files"><span>loop.wav</span><span>drums.mid</span><span>bass.mid</span><span>lead.mid</span></div>`,
     `<div class="fp-mid"><b class="fp-free">₹0</b></div>`],
   gear:[`<div class="fp-chips">${['House & techno','Hip-hop','Vinyl','Your own'].map((c,i)=>`<span class="${i?'':'on'}">${c}</span>`).join('')}</div>`,
     `<div class="fp-bars">${[['100',34],['200',62],['400',96]].map(([c,v])=>`<div><span>${c} people</span><i style="width:${v}%"></i></div>`).join('')}</div>`,
     `<div class="fp-chips roles"><span>${R.snd}Engineer</span><span>${R.vj}VJ</span><span>${R.ph}Photo</span><span>${R.lt}Lights</span></div>`,
     `<div class="fp-mid">${chr('record',30)}</div>`]};
  $$('[data-liner]').forEach(el=>{const k=el.dataset.liner,pics=P[k];if(!pics)return;el.querySelectorAll('ol li').forEach((li,i)=>{if(!pics[i]||li.querySelector('.fp'))return;const d=document.createElement('div');d.className='fp';d.setAttribute('aria-hidden','true');d.innerHTML=pics[i];li.prepend(d);li.classList.add('haspic')})})})();
(()=>{const c=document.getElementById('invite');if(!c)return;const s=document.createElement('i');s.className='sheen';s.setAttribute('aria-hidden','true');c.appendChild(s);
  c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect();c.style.setProperty('--gx',((e.clientX-r.left)/r.width*100).toFixed(0)+'%');c.style.setProperty('--gy',((e.clientY-r.top)/r.height*100).toFixed(0)+'%')})})();
document.querySelectorAll('.tcard[data-k]').forEach(t=>{if(t.querySelector('.objslot'))return;const s=document.createElement('div');s.className='objslot tslot';s.setAttribute('aria-hidden','true');t.appendChild(s)});
window.__ccdObj=()=>({x:cur.x*innerWidth,y:cur.y*innerHeight,k:active&&active.dataset.k,locked:typeof locked!=="undefined"?locked:null});
/* phone: the open Episode has no place for the object, so it leaves the screen instead of hanging off the edge */
try{if(STAGES['episodes-b'])STAGES['episodes-b'].m=[.5,-.45,.2]}catch(e){}

/* ===== round 16: on a phone the site works like an app (13 Nov, Param: "a bar on top", "mobile first, compact") =====
   A bar on top with the four apps; each app opens on the product; home is five things; one play button at the bottom. */
(()=>{const mq=matchMedia('(max-width:700px)'),phone=()=>mq.matches;
  const TABS=[['home','Home','#F2F1EE'],['nights','Nights','#3B78FF'],['host','Host','#FFE600'],['artists','Artists','#A98BFF'],['school','School','#FF7DAA']];
  const bar=document.createElement('div');bar.id='mbar';
  bar.innerHTML=`<div class="mrow"><a class="mlogo" href="#home"><img src="img/logo.png" alt="">Cats Can Dance</a><a class="mpts" href="#points" aria-label="Your points"><b id="mPts">0</b> pts</a></div><nav class="mtabs" aria-label="Apps">${TABS.map(([k,l,c])=>`<a href="#${k}" data-p="${k}" style="--c:${c}">${l}</a>`).join('')}</nav>`;
  document.body.prepend(bar);
  const sync=()=>{const p=document.body.dataset.page||'home',cur={episodes:'nights',points:'home',gear:'host'}[p]||p;
    bar.querySelectorAll('.mtabs a').forEach(a=>{const on=a.dataset.p===cur;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
    const pt=document.getElementById('ptsN');if(pt)document.getElementById('mPts').textContent=pt.textContent};
  sync();addEventListener('hashchange',()=>setTimeout(sync,30));setInterval(sync,800);
  /* on a phone the doors open the app instead of scrolling the home page */
  document.addEventListener('click',e=>{if(!phone())return;const a=e.target.closest('[data-go]');if(!a)return;e.stopImmediatePropagation();e.preventDefault();location.hash=a.getAttribute('href')},true);
  /* no demo that plays itself on a phone: it plays when you press Show me */
  if(phone())['nights','host','artists','school','gear'].forEach(a=>{toured[a]=1});
  /* home: the next Episode, under the doors */
  const nx=typeof EPS!=='undefined'&&EPS.find(e=>e.next),hero=document.getElementById('hero');
  if(nx&&hero){const d=Math.ceil((new Date('2026-11-25T00:00:00+05:30')-Date.now())/864e5),a=document.createElement('a');a.className='mnext';a.href='#episodes';
    a.innerHTML=`<span><small>Next Episode</small><b>${nx.d.replace(' 2026','')}</b><em>${nx.v}, Bengaluru</em></span><strong>${d>0?d+'<i>days</i>':'Tonight'}</strong>`;hero.appendChild(a)}
  /* home: the object sits above the words, in the page */
  const hs=document.createElement('div');hs.className='objslot hslot';hs.setAttribute('aria-hidden','true');const hin=document.querySelector('#hero .hero-in');if(hin)hin.prepend(hs);
  /* phone: sections with no place for the object send it off the screen instead of hanging it off an edge */
  if(phone())Object.keys(STAGES).forEach(k=>{try{STAGES[k].m=[.5,-.45,.2]}catch(e){}});
})();

/* ===== round 17: the phone, rebuilt on the live site's patterns (13 Nov, Param: scroll down only, objects must keep up,
   lose the green, use the live site's components and make the copy better).
   Why the live site reads: every block is a label, one heading, one line and one action; blocks are boxed with a hard edge;
   real counts; lists instead of carousels; the next Episode is always one tap away. ===== */
(()=>{if(!window.__ph)return;const N=typeof NIGHTS!=='undefined'?NIGHTS:[];
  const days=Math.ceil((new Date('2026-11-25T00:00:00+05:30')-Date.now())/864e5);
  /* objects: the chrome sprites sit in the page and scroll with it natively. They turn as you scroll. */
  const FORM={nights:'ball',episodes:'ball',host:'stamp','gear-h':'knob',artists:'record',school:'knob'},sp=[];
  const put=(slot,form,b)=>{if(!slot)return;const c=document.createElement('i');c.className='chr pchr';c.dataset.form=form;c.setAttribute('aria-hidden','true');c._b=b;slot.appendChild(c);sp.push(c)};
  put(document.querySelector('#hero .hslot'),'logo',14);
  document.querySelectorAll('.tcard[data-k] .tslot').forEach((s,i)=>put(s,FORM[s.parentElement.dataset.k]||'ball',i*17));
  put(document.querySelector('#pts-sec .objslot'),'logo',60);
  let tk=false;const turn=()=>{tk=false;const y=scrollY;for(const c of sp){const f=Math.floor(((c._b+y*.1)%120+120)%120);c.style.setProperty('--cx',f%11);c.style.setProperty('--cy',Math.floor(f/11))}};
  addEventListener('scroll',()=>{if(!tk){tk=true;requestAnimationFrame(turn)}},{passive:true});turn();
  /* home */
  const hero=document.getElementById('hero');
  const tick=document.createElement('a');tick.className='mtick';tick.href='#episodes';tick.innerHTML=`<span><small>Next Episode</small>Wed 25 Nov · The Humming Tree</span><b>${days>0?days+' days':'Tonight'}</b>`;hero.prepend(tick);
  const ey=hero.querySelector('.eyebrow');if(ey)ey.textContent='Bengaluru · since 2025';
  const le=hero.querySelector('.lede');if(le)le.textContent='Find a night out, throw your own, book the artists and learn to make the music. One place for all of it.';
  const D=[['Find a night out',N.length+' nights coming up'],['Throw your own','Invite, guest list and door'],['Book the artists','208 artists on file'],['Learn to make it','Free, in your browser']];
  document.querySelectorAll('.doors .door').forEach((d,i)=>{const p=d.querySelector('p'),s=d.querySelector('small');if(p)p.textContent=D[i][0];if(s)s.textContent=D[i][1]});
  const row=(n,i)=>{const [dw,dn]=n.d.split(' ');return `<span class="mdt"><small>${dw}</small><b>${dn}</b></span><span class="mtx"><b>${n.t}</b><small>${n.v.split(',')[0]} · ${n.c}</small></span>`};
  const wk=document.createElement('div');wk.className='mweek';
  wk.innerHTML=`<p class="mlb">This week</p><h2 class="mh">Where to go.</h2>${N.slice(0,3).map((n,i)=>`<a class="mrw" href="#nights" data-i="${i}">${row(n,i)}<i>→</i></a>`).join('')}<a class="mbtn" href="#nights">See all ${N.length} nights</a>`;
  document.querySelector('.doors').after(wk);
  wk.querySelectorAll('.mrw').forEach(a=>a.addEventListener('click',()=>{nsel=+a.dataset.i;city='All';setTimeout(()=>{try{nCities();nList()}catch(e){}},60)}));
  const why=document.getElementById('why');if(why){const e=why.querySelector('.eyebrow'),h=why.querySelector('.say');if(e)e.textContent='House rules';if(h)h.textContent='Four things we stick to.'}
  /* app title cards: a label, one heading that says what you do, one line */
  const COPY={nights:['01 · Nights','Find a night worth going out for.','Every listing is checked and links to the real tickets. Say you’re going and see who else is.'],
    episodes:['Ours · Bengaluru','Episodes.','The nights we throw. House, breaks, UKG and bass, with residents Merman and Sartdawg.'],
    host:['02 · Host','Throw a party from your phone.','Make the invite, keep the guest list, check people in at the door. Free.'],
    artists:['03 · Artists','Hear them. Follow them. Book them.','Pages for South Asian electronic artists. Every fact links to where we found it.'],
    school:['04 · School','Learn music by making it.','Make a beat in your browser, change it, then take it into Ableton. Free.']};
  document.querySelectorAll('.tcard[data-k]').forEach(t=>{const c=COPY[t.dataset.k];if(!c)return;const m=t.querySelector('.meta'),h=t.querySelector('h2'),cl=t.querySelector('.claim');if(m)m.innerHTML=`<span class="mlb">${c[0]}</span>`;if(h){h.textContent=c[1];h.classList.add('mh')}if(cl)cl.textContent=c[2]});
  document.querySelectorAll('.todo .ahead').forEach(a=>{const k=a.dataset.pg,c=COPY[k];a.style.position='relative';const sl=document.createElement('div');sl.className='aslot';sl.setAttribute('aria-hidden','true');a.prepend(sl);put(sl,FORM[k]||(k==='gear'?'knob':'ball'),k.length*13);
    if(!c)return;const m=a.querySelector('.meta'),h=a.querySelector('h2'),cl=a.querySelector('.claim');if(m)m.innerHTML=`<span class="mlb">${c[0]}</span>`;if(h){h.textContent=c[1];h.classList.add('mh')}if(cl)cl.textContent=c[2]});turn();
  /* Nights: the listing is a list you scroll down. Tap a night and it opens under its row. */
  const pan=document.querySelector('.panel[data-tour=nights]'),det=document.getElementById('nDet');
  if(pan&&det){const ml=document.createElement('div');ml.id='mList';pan.querySelector('.ngrid').before(ml);let all=false;
    const render=()=>{const f=N.map((n,i)=>[n,i]).filter(([n])=>city==='All'||n.c===city);let vis=all?f:f.slice(0,5);if(!vis.some(([,i])=>i===nsel)){const s=f.find(([,i])=>i===nsel);if(s)vis=vis.concat([s])}
      ml.innerHTML=vis.map(([n,i])=>`<div class="mri${i===nsel?' open':''}" data-i="${i}"><button class="mrw" type="button" aria-expanded="${i===nsel}">${row(n,i)}${going.has(i)?'<em>Going</em>':'<i>+</i>'}</button></div>`).join('')+(f.length>5?`<button class="mbtn" type="button" id="mAll">${all?'Show fewer':'See all '+f.length+' nights'}</button>`:'');
      ml.querySelectorAll('.mrw').forEach(b=>b.onclick=()=>{nsel=+b.parentElement.dataset.i;nList();b.parentElement.scrollIntoView({block:'nearest',behavior:'smooth'})});
      const a=document.getElementById('mAll');if(a)a.onclick=()=>{all=!all;render()};
      const o=ml.querySelector('.mri.open');if(o)o.appendChild(det)};
    const nl0=nList;nList=function(){nl0();render()};render()}
  /* what each app does: four cards, the rest behind one button */
  document.querySelectorAll('.liner ol').forEach(ol=>{if(ol.children.length<=4)return;ol.classList.add('cut');const b=document.createElement('button');b.type='button';b.className='mbtn';b.textContent='See all '+ol.children.length;b.onclick=()=>{ol.classList.toggle('cut');b.textContent=ol.classList.contains('cut')?'See all '+ol.children.length:'Show fewer'};ol.after(b)});
})();

/* ===== round 18 (13 Nov, Param): Artists opens on Karan Kanchan and links to his real page.
   Phone home explains everything the way catscandance.com does, section by section, with real content and fewer boxes. ===== */
(()=>{
  /* Artists: Karan Kanchan first, and every artist links to their page on catscandance.com */
  try{const kk=ARTISTS.findIndex(a=>a.n==='Karan Kanchan');if(kk>=0){asel=kk;aRender()}
    AHEAD.artists[3]='https://catscandance.com/artists/karan-kanchan';
    document.querySelectorAll('.todo .row2 a[href="https://catscandance.com/artists"]').forEach(a=>{a.href=AHEAD.artists[3];a.lastChild&&(a.lastChild.textContent=a.lastChild.textContent)});
    document.querySelectorAll('a[href="https://catscandance.com/artists"]').forEach(a=>{if(a.closest('.todo'))a.href=AHEAD.artists[3]});
    const r0=aRender;aRender=function(){r0();const a=ARTISTS[asel],acts=document.querySelector('#aDet .acts');if(acts&&!acts.querySelector('.pg')){const l=document.createElement('a');l.className='btn sm pg';l.target='_blank';l.rel='noopener';l.href='https://catscandance.com/artists/'+a.img.replace(/^a-/,'');l.textContent='Full page ↗';acts.appendChild(l)}};aRender();
  }catch(e){}
})();
(()=>{if(!window.__ph)return;const N=typeof NIGHTS!=='undefined'?NIGHTS:[];
  const MON={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  const when=n=>{const p=n.d.split(' ');const last=n.d.split(' to ').pop().split(' ');return new Date(2026,MON[last[2]]??10,+last[1]||+p[1],23,59)};
  const up=N.map((n,i)=>[n,i]).filter(([n])=>when(n)>=Date.now());
  const art=typeof ARTISTS!=='undefined'?ARTISTS.find(a=>a.n==='Karan Kanchan'):null;
  const EP=typeof EPS!=='undefined'?EPS:[];
  const steps=(c,list)=>`<ol class="hs" style="--c:${c}">${list.map(([b,p],i)=>`<li><span>0${i+1}</span><div><b>${b}</b><p>${p}</p></div></li>`).join('')}</ol>`;
  const row=(n,i)=>{const [dw,dn,mo]=n.d.split(' ');return `<a class="hr" href="#nights" data-i="${i}"><span class="hd"><small>${dw}</small><b>${dn}</b><small>${(mo||'').slice(0,3)}</small></span><span class="ht"><small>${n.h?n.h+' · ':''}${n.g&&n.g[0]?n.g[0]:'Club night'}</small><b>${n.t}</b><em>${n.v.split(',')[0]}, ${n.c}</em></span></a>`};
  const el=document.createElement('section');el.id='mhome';el.dataset.pg='home';
  el.innerHTML=`
  <div class="hx"><p class="mlb">What this site does</p><h2 class="mh">Four apps for a night out.</h2>
    <p class="hp">Each one does one job. Use one or all four, and your points and your nights carry across.</p>
    <nav class="apps">${[['#nights','Nights','Find a night across India and see who else is going.',up.length+' nights coming up','#7FA7FF','ball',14],['#host','Host','Throw your own. Invite, guest list and door, from your phone.','Free','#FFE600','stamp',40],['#artists','Artists','Hear South Asian electronic artists and book them.','208 artists on file','#A98BFF','record',70],['#school','School','Learn to produce and DJ, in your browser.','Free for now','#FF7DAA','knob',96]].map(([h,n,p,c,col,f,x],i)=>`<a href="${h}" style="--c:${col}"><span class="an">0${i+1}</span><span class="at"><b>${n}</b><p>${p}</p><small>${c}</small></span><i class="chr" data-form="${f}" style="--cx:${x%11};--cy:${Math.floor(x/11)}"></i></a>`).join('')}</nav></div>

  <div class="hx band" style="--bg:#2F5BFF;--fg:#fff;--c:#fff">
    <p class="mlb">01 · Nights</p><h2 class="mh">Find a night. Go with people.</h2>
    <p class="hp">Underground nights across India, checked by us before they go up. Say you're going and we'll put you in a crew of 3 to 6 people from your city.</p>
    ${steps('#fff',[['Pick a night','Filter by city. Every listing links to the real tickets.'],['Say you’re going','See who else is, or ask us to find you a crew.'],['Check in at the door','You get points that turn into a +1, a guaranteed spot or a free ticket.']])}
    <div class="wk"><p class="mlb">This week</p>${up.slice(0,4).map(([n,i])=>row(n,i)).join('')}<a class="hb" href="#nights">See all ${up.length} nights</a>
    <p class="note2">Every night here has an artist or promoter we trust behind it.</p></div>
  </div>

  <div class="hx band" style="--bg:#FF6A3D;--fg:#1d0a03;--c:#1d0a03">
    <p class="mlb">Ours · the Episodes</p><h2 class="mh">Our own nights.</h2>
    <p class="hp">We throw them in Bengaluru. House, breaks, UKG and bass, with residents Merman and Sartdawg and guests.</p>
    <div class="nx"><div><small>Next up · Episode 5</small><b>Wed 25 Nov</b><span>The Humming Tree, Bengaluru</span></div><div class="cd" id="mCd"></div><a class="hb solid" href="https://catscandance.com/nights" target="_blank" rel="noopener">Get tickets ↗</a></div>
    <p class="mlb" style="margin-top:28px">Every Episode so far</p>
    <div class="eps">${EP.filter(e=>!e.next).slice().reverse().map(e=>`<a href="#episodes" class="epc">${e.img?`<img src="img/${e.img}.webp" alt="Episode ${e.n} poster" loading="lazy">`:`<span class="ph">EP0${e.n}</span>`}<b>Episode ${e.n}</b><small>${e.d.replace(' 2026','').replace(' 2025',' 2025')} · ${e.v}</small>${e.l&&e.l.length?`<em>${e.l.filter(x=>!/open decks/i.test(x)).join(' · ')}</em>`:''}</a>`).join('')}</div>
  </div>

  <div class="hx" style="--c:#FFE600">
    <p class="mlb">02 · Host</p><h2 class="mh">Throw a party from your phone.</h2>
    <p class="hp">House party, rooftop, a night at a bar. Make the invite, share one link, and run the door on the night. Free.</p>
    <div class="inv"><small>You're invited</small><b>Rooftop thing</b><span>Sat 21 Nov, 8 pm<br>Indiranagar, Bengaluru</span><em>RSVP</em></div>
    ${steps('#FFE600',[['Make the invite','Name, date, place and a look. Takes a minute.'],['Share one link','People RSVP or buy a ticket. You see who’s coming.'],['Run the door','Scan people in from your phone. It keeps working offline.']])}
    <a class="hb" href="#host">Make an invite</a>
  </div>

  <div class="hx band" style="--bg:#A98BFF;--fg:#160d33;--c:#160d33">
    <p class="mlb">03 · Artists</p><h2 class="mh">Hear them. Book them.</h2>
    <p class="hp">Pages for South Asian electronic artists. Every gig, release and press piece links to where we found it.</p>
    ${art?`<div class="ac"><img src="img/${art.img}.webp" alt="${art.n}"><div><small>${art.c} · ${art.g.join(', ')}</small><b>${art.n}</b><span>${art.r} records on file</span></div>
      <div class="aa"><button type="button" class="hb solid" id="mPlay">▶ Play</button><a class="hb" href="https://catscandance.com/artists/karan-kanchan" target="_blank" rel="noopener">His page ↗</a></div><p class="note2" id="mPn" aria-live="polite"></p></div>`:''}
    <p class="mlb" style="margin-top:24px">If you're an artist</p>
    <p class="hp">Your page fills itself in. Gigs we find get added with tickets, new releases show up the week they're out, and booking requests arrive as a brief: date, room, set length and budget.</p>
    <a class="hb" href="#artists">Find your page</a>
  </div>

  <div class="hx" style="--c:#FF7DAA">
    <p class="mlb">04 · School</p><h2 class="mh">Learn music by making it.</h2>
    <p class="hp">Lessons you play instead of watch. Start with rhythm on a drum machine, then build a track and mix it on two decks. Runs in your browser, free for now.</p>
    <img class="shot" src="img/s_learn.webp" alt="A School lesson" loading="lazy">
    ${steps('#FF7DAA',[['Lessons','Rhythm, melody and harmony, one short lesson at a time.'],['Studio','Build a track from drums, bass and lead. Export it to Ableton.'],['Decks','Two decks and a mixer. Play your track into someone else’s.']])}
    <a class="hb" href="#school">Open School</a>
  </div>

  <div class="hx" style="--c:#A98BFF">
    <p class="mlb">Points</p><h2 class="mh">Go out. Get in free.</h2>
    <p class="hp">You earn points in all four apps. They turn into things that matter on the night.</p>
    <div class="pl"><i style="--w:0%"></i>${[[200,'A +1'],[300,'Guaranteed spot'],[800,'Free ticket']].map(([n,l],i)=>`<span style="--p:${[33.3,66.6,100][i]}%"><b>${l}</b>${n} pts</span>`).join('')}</div>
    <ul class="ern">${[['Check in at a night','+100'],['Bring a friend to their first night','+150'],['Rate a night','+10'],['Follow an artist','+50']].map(([a,b])=>`<li><span>${a}</span><b>${b}</b></li>`).join('')}</ul>
    <a class="hb" href="#points">See your points</a>
  </div>`;
  const hero=document.getElementById('hero');hero.after(el);
  const le=hero.querySelector('.lede');if(le)le.textContent='We throw dance music nights in Bengaluru. This is where we keep everything else: nights across India worth going to, the artists playing them, a way to throw your own, and a school to learn the music.';
  const cta=hero.querySelector('.hero-cta');if(cta){cta.innerHTML=`<a class="hb solid" href="#nights">What's on this week</a><a class="hb" href="#episodes">Episode 5 tickets</a>`}
  el.querySelectorAll('.hr').forEach(a=>a.addEventListener('click',()=>{nsel=+a.dataset.i;city='All';setTimeout(()=>{try{nCities();nList()}catch(e){}},60)}));
  const cd=document.getElementById('mCd'),T=new Date('2026-11-25T21:00:00+05:30');const tickCd=()=>{let s=Math.max(0,Math.floor((T-Date.now())/1000));const d=Math.floor(s/86400);s%=86400;const h=Math.floor(s/3600);s%=3600;const m=Math.floor(s/60);s%=60;cd.innerHTML=[[d,'days'],[h,'hrs'],[m,'min'],[s,'sec']].map(([v,l])=>`<span><b>${String(v).padStart(2,'0')}</b>${l}</span>`).join('')};tickCd();setInterval(tickCd,1000);
  const pb=document.getElementById('mPlay');if(pb){let on=false;const pn=document.getElementById('mPn');pb.onclick=()=>{if(on){on=false;window.__ccdStop();pb.textContent='▶ Play';pn.textContent='';return}on=true;pb.textContent='■ Stop';window.__ccdPlay('Karan Kanchan',t=>{if(on)pn.textContent=t},pn,()=>{on=false;pb.textContent='▶ Play'})}}
  const pt=document.getElementById('pTot'),pl=el.querySelector('.pl');const pu=()=>{const p=pt?parseInt(pt.textContent.replace(/\D/g,''))||0:0;const w=p<=200?p/200*33.3:p<=300?33.3+(p-200)/100*33.3:Math.min(100,66.6+(p-300)/500*33.4);pl.querySelector('i').style.setProperty('--w',w+'%');pl.querySelectorAll('span').forEach((s,i)=>s.classList.toggle('got',p>=[200,300,800][i]))};pu();setInterval(pu,1000);
})();
