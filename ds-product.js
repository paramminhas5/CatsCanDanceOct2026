/* Opus product pieces. Needs ds.js. Nothing here talks to a server: sends and saves stay on the page. */
(()=>{
const {$,$$,RM,ms,esc,EY1,EY2,def}=CCD;const D=window.CCDDATA||{};
const vib=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,28)||'your-night';
const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};

/* a ticket code drawn as a grid, seeded by the name. Not a real QR: the door reads the real one. */
CCD.code=(seed,n=21)=>{let h=hash(seed||'ccd');const cells=[];for(let y=0;y<n;y++)for(let x=0;x<n;x++){const corner=(x<7&&y<7)||(x>n-8&&y<7)||(x<7&&y>n-8);let on;if(corner){const cx=x>n-8?x-(n-7):x,cy=y>n-8?y-(n-7):y;on=cx===0||cy===0||cx===6||cy===6||(cx>1&&cx<5&&cy>1&&cy<5)}else{h=Math.imul(h^(h>>>13),1274126177)>>>0;on=(h&3)===0||(h&7)===3}if(on)cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`)}
  return `<svg viewBox="-1 -1 ${n+2} ${n+2}" class="qr" aria-hidden="true"><rect x="-1" y="-1" width="${n+2}" height="${n+2}" fill="#F2F1EE"/><g fill="#0C0D0F">${cells.join('')}</g><circle cx="${n/2}" cy="${n/2}" r="2.6" fill="#F2F1EE"/><circle cx="${n/2}" cy="${n/2}" r="2" fill="#0C0D0F"/></svg>`};

def('code',el=>{el.innerHTML=CCD.code(el.dataset.code)});
/* ================= SHARED STORE: invites and replies live in the artifact's db when the page is published =================
   Off the published page (or signed out) everything still works on this device only. */
CCD.SITE='https://claude.ai/artifact/KD6sBPrdXJ1yHjYq1cjEVS';
const STORE={p:null};
CCD.store=()=>{if(STORE.p)return STORE.p;STORE.p=(async()=>{try{if(!window.claude||!claude.use)return null;const db=await claude.use('db');if(!db)return null;const user=await claude.use('user');const uid=user?await user.id():null;return{db,user,uid}}catch(e){return null}})();return STORE.p};
const LS={get(k){try{return JSON.parse(localStorage.getItem('ccd:'+k))}catch(e){return null}},set(k,v){try{localStorage.setItem('ccd:'+k,JSON.stringify(v))}catch(e){}}};
const newId=()=>Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-3);
const invFromHash=()=>{const m=location.hash.match(/^#i-([a-z0-9]+)$/);return m?m[1]:null};
CCD.lastInvite=async()=>{const h=invFromHash();if(h)return h;const s=await CCD.store();if(s&&s.uid){try{const d=await s.db.doc('data/users/'+s.uid+'/host').get();if(d.exists&&d.data().last)return d.data().last}catch(e){}}return LS.get('last')};
CCD.getInvite=async id=>{const s=await CCD.store();if(s){try{const d=await s.db.doc('invites/'+id).get();if(d.exists)return d.data()}catch(e){}}return (LS.get('inv')||{})[id]||null};
CCD.watchReplies=async(id,cb)=>{const s=await CCD.store();if(s){return s.db.collection('invites/'+id+'/rsvps').onSnapshot(q=>cb(q.docs.map(d=>({id:d.id,...d.data()}))),()=>cb((LS.get('rs')||{})[id]||[]))}
  const f=()=>cb(Object.values((LS.get('rs')||{})[id]||{}));f();addEventListener('ccd:rs',f);return()=>removeEventListener('ccd:rs',f)};
const whenStr=(date,time)=>{if(!date)return 'Pick a date';const d=new Date(date+'T'+(time||'21:00'));const t=d.toLocaleTimeString('en-GB',{hour:'numeric',minute:'2-digit',hour12:true}).replace(':00','').replace(' ','').toUpperCase();return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}).replace(',','')+' · '+t};
CCD.whenStr=whenStr;

/* ================= INVITE MAKER: makes a real invite with a link people can answer ================= */
const LOOKS={chrome:['#9a9a9e','#0C0D0F','inv_chrome'],sunset:['#ff4d8d','#F2F1EE','inv_sunset'],laser:['#08080a','#F2F1EE','inv_laser'],disco:['#0b1430','#F2F1EE','inv_disco'],ink:['#F2F1EE','#0C0D0F',''],yellow:['#FFE600','#0C0D0F','']};
const setLook=(card,k,root)=>{const L=LOOKS[k]||LOOKS.chrome;card.style.setProperty('--ibg',L[0]);card.style.setProperty('--ifg',L[1]);card.style.setProperty('--iimg',L[2]?`url(${root}assets/img/${L[2]}.webp)`:'none');card.classList.toggle('img',!!L[2]);card.classList.toggle('dk',L[1]==='#0C0D0F')};
def('invite',el=>{const f=k=>$(`[name=${k}]`,el),card=$('.inv-card',el),out=$('.inv-out',el),going=$('.inv-going',el),root=el.dataset.root||'';let id=null,unsub=null;
  const vals=()=>({name:f('name').value.trim()||'Your night',date:f('date').value,time:(f('time')||{}).value||'21:00',place:f('place').value.trim()||'Somewhere good',look:($('[name=look]:checked',el)||{}).value||'chrome'});
  const up=()=>{const v=vals();$('.ic-name',card).textContent=v.name;$('.ic-when',card).textContent=whenStr(v.date,v.time);$('.ic-where',card).textContent=v.place;setLook(card,v.look,root)};
  $$('input,select',el).forEach(i=>i.addEventListener('input',up));up();
  const showOut=(link,live)=>{out.hidden=false;out.innerHTML=`<span class="lbl">${live?'Your invite is live':'Your invite is saved on this device'}</span><div class="inv-share"><code class="inv-link">${esc(link)}</code><button class="btn two s" data-copy>${EY2}<span class="lab">Copy link</span></button></div>
    <div class="inv-acts"><a class="btn one s" href="${root}pages/rsvp.html#i-${id}">${EY1}<span class="lab">Open it as a guest</span></a><a class="btn one s" href="${root}pages/guests.html#i-${id}">${EY1}<span class="lab">Guest list</span></a></div>
    <p class="t-small faint">${live?'Anyone you share this page with can open the link and answer. Replies show up here as they come in.':'This copy of the page can\'t save to the shared store, so answers stay on this device. On the published page the link works for anyone you share it with.'}</p><ul class="inv-replies" aria-live="polite"></ul>`;
    const cp=$('[data-copy]',out);cp.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(link);CCD.setLabel(cp,'Copied')}catch(e){const r=document.createRange();r.selectNodeContents($('.inv-link',out));getSelection().removeAllRanges();getSelection().addRange(r);CCD.setLabel(cp,'Selected, copy it')}setTimeout(()=>CCD.setLabel(cp,'Copy link'),2000)});CCD.eyes.collect(out)};
  el.addEventListener('ccd:held',async()=>{const v=vals();id=newId();const s=await CCD.store();const body={...v,host:s&&s.uid||'me',t:Date.now()};let live=false;
    if(s){try{await s.db.doc('invites/'+id).set(body);if(s.uid)await s.db.doc('data/users/'+s.uid+'/host').set({last:id});live=true}catch(e){live=false}}
    const all=LS.get('inv')||{};all[id]=body;LS.set('inv',all);LS.set('last',id);
    showOut(CCD.SITE+'#i-'+id,live);unsub&&unsub();unsub=await CCD.watchReplies(id,rs=>{const n=rs.filter(r=>r.s!=='no').reduce((a,r)=>a+1+(r.plus?1:0),0);going.textContent=n+' going';
      const ul=$('.inv-replies',out);if(ul)ul.innerHTML=rs.map(r=>`<li><span class="gdot g-${esc(r.s)}"></span><b>${esc(r.name||'Someone')}${r.plus?' +1':''}</b><span class="mute">${r.s==='going'?'Going':r.s==='maybe'?'Maybe':'Can\'t make it'}</span></li>`).join('')})});
  const rs=el.querySelector('[data-c=hold]');el.addEventListener('ccd:held',()=>setTimeout(()=>rs&&rs._reset&&rs._reset(),2500))});

/* ================= RSVP: the invite a guest opens from the link ================= */
def('rsvp',el=>{const form=$('form',el),tk=$('.ticket',el),st=$('.chips',el),card=$('.inv-card',el);let id=null;
  (async()=>{id=invFromHash()||LS.get('last');const inv=id?await CCD.getInvite(id):null;el.classList.toggle('demo',!inv);if(!inv){$('.rs-note',el).textContent='This is an example invite. Make one in Host and open its link to answer a real one.';return}
    $('.ic-name',card).textContent=inv.name;$('.ic-when',card).textContent=whenStr(inv.date,inv.time);$('.ic-where',card).textContent=inv.place;setLook(card,inv.look,el.dataset.root||'');
    const s=await CCD.store();let host='Someone';if(s&&s.user&&inv.host){try{const p=await s.user.profiles([inv.host]);host=(p[inv.host]&&p[inv.host].name)||host}catch(e){}}$('.inv-going',card).textContent=(s&&s.uid===inv.host?'Your invite':host+' invited you');
    $('.tk-night',tk).textContent=(inv.name+' · '+whenStr(inv.date,inv.time)).toUpperCase();
    if(s&&s.uid){try{const d=await s.db.doc(`invites/${id}/rsvps/${s.uid}`).get();if(d.exists){const r=d.data();$('[name=guest]',form).value=r.name||'';showTicket(r.name,r.s,r.plus)}}catch(e){}}})();
  const showTicket=(name,s,plus)=>{$('.tk-name',tk).textContent=name+(plus?' +1':'');$('.tk-status',tk).textContent=s==='maybe'?'Maybe':'Going';$('.tk-code',tk).innerHTML=CCD.code(name+(id||''));tk.hidden=false;requestAnimationFrame(()=>tk.classList.add('on'))};
  form.addEventListener('submit',async e=>{e.preventDefault();const name=$('[name=guest]',form).value.trim(),b=$('[type=submit]',form);if(name.length<2){const t=$('[data-c=tail]',form);t&&t.classList.add('is-no');$('[name=guest]',form).focus();return}
    const s0=($('.chip[aria-pressed=true]',st)||{}).dataset?.v||'going',plus=$('[name=plus]',form).checked;b.classList.add('is-loading');
    let ok=true;if(id){const s=await CCD.store();const body={name,s:s0,plus,t:Date.now()};if(s&&s.uid){try{await s.db.doc(`invites/${id}/rsvps/${s.uid}`).set(body)}catch(err){ok=false}}else{const all=LS.get('rs')||{};all[id]=all[id]||{};all[id][name]=body;LS.set('rs',all);dispatchEvent(new Event('ccd:rs'))}}
    ok?CCD.done(b,s0==='no'?'Sent':'You\'re in'):CCD.fail(b,'That didn\'t save. Try again');
    if(!ok)return;if(s0==='no'){$('.rs-note',el).textContent='Thanks for letting them know.';tk.hidden=true;return}showTicket(name,s0,plus)})});

/* ================= GUEST LIST: live replies for your latest invite ================= */
const GUESTS=[['Aisha Rao','going',0,1],['Dev Malhotra','going',1,1],['Mira Shah','maybe',0,0],['Kabir Sethi','going',0,0],['Tara Iyer','no',0,0],['Ishan Kapoor','going',0,1],['Nisha Menon','going',1,0],['Arjun Bose','going',0,0]];
CCD.GUESTS=GUESTS;
def('guests',el=>{const list=$('.glist',el),q=$('input[type=search]',el),cnt=$('.gcount',el),note=$('.gnote',el),root=el.dataset.root||'';let filt='all',rows=GUESTS.map(g=>({name:g[0],s:g[1],plus:g[2],in:g[3]})),demo=true;
  const draw=()=>{const s=(q&&q.value||'').toLowerCase();const show=rows.filter(g=>(filt==='all'||g.s===filt||(filt==='in'&&g.in))&&(g.name||'').toLowerCase().includes(s));
    list.innerHTML=show.length?show.map(g=>`<li class="${g.in?'in':''}"><span class="gav">${esc((g.name||'?').split(' ').map(x=>x[0]).join('').slice(0,2))}</span><b>${esc(g.name||'Someone')}${g.plus?' <span class="faint">+1</span>':''}</b><span class="gst st-${g.s}">${g.s==='going'?'Going':g.s==='maybe'?'Maybe':'Can\'t'}</span><span class="gin">${g.in?'In':''}</span></li>`).join(''):`<li class="gempty"><span class="mute t-small">${rows.length?'No one by that name':'No replies yet. Send the link to the group.'}</span></li>`;
    const go=rows.filter(g=>g.s==='going').reduce((a,g)=>a+1+(g.plus?1:0),0),inn=rows.filter(g=>g.in).reduce((a,g)=>a+1+(g.plus?1:0),0);if(cnt)cnt.textContent=`${go} going · ${inn} in`};
  q&&q.addEventListener('input',draw);el.addEventListener('ccd:chips',e=>{filt=e.detail[0]||'all';draw()});draw();
  (async()=>{const id=await CCD.lastInvite();if(!id){if(note)note.innerHTML=`<span class="ex">example</span> These guests are examples. <a href="${root}pages/invite.html">Make an invite</a> and its replies show here.`;return}
    const inv=await CCD.getInvite(id);if(note)note.textContent=inv?`Replies to ${inv.name}, live.`:'Replies, live.';
    await CCD.watchReplies(id,rs=>{demo=false;rows=rs.map(r=>({name:r.name,s:r.s,plus:r.plus,in:false}));draw()})})()});

/* ================= DOOR SCANNER ================= */
def('door',el=>{const res=$('.dres',el),w=$('[data-c=whiskers]',el),log=$('.dlog',el);let i=0,count=+(w&&w.dataset.v)||18;const seen=new Set(['Aisha Rao']);
  const SEQ=[['Kabir Sethi','ok'],['Aisha Rao','again'],['Unknown guest','no'],['Rohan Das','ok'],['Nisha Menon +1','ok']];
  const scan=()=>{const[name,kind]=SEQ[i++%SEQ.length];el.classList.remove('k-ok','k-again','k-no');void el.offsetWidth;el.classList.add('scanning');
    setTimeout(()=>{el.classList.remove('scanning');el.classList.add('k-'+kind);
      res.innerHTML=kind==='ok'?`<span class="mark ok" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><b>${esc(name)}</b><span>On the list. Let them in.</span>`:kind==='again'?`<span class="mark again" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M2 12.5l4.5 4.5L16 7.5M9 15l2 2L20.5 7.5"/></svg></span><b>${esc(name)}</b><span>Already in, at 10:42 PM. Same ticket twice.</span>`:`<span class="mark no" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></span><b>Not on the list</b><span>No ticket found. Check the name, or add them.</span>`;
      if(kind==='ok'){count+=name.includes('+1')?2:1;w&&w._set&&w._set(count);vib(20)}else vib([40,40,40]);
      if(log){const li=document.createElement('li');li.innerHTML=`<span class="mk ${kind}"></span>${esc(name)}<span class="faint">${kind==='ok'?'in':kind==='again'?'already in':'not on list'}</span>`;log.prepend(li);while(log.children.length>4)log.lastChild.remove()}},RM?0:700)};
  $('[data-scan]',el).addEventListener('click',scan)});

/* ================= BOOKING OFFER: beatmatch the fee =================
   Their row runs at 122 BPM. Your row runs slower the further you are under their ask, so the lights drift apart.
   Meet the ask and your row snaps into phase: the beats land together. "Hear it" plays both kicks, theirs left, yours right. */
def('offer',el=>{const ask=+el.dataset.ask||60000,stepV=1000;let off=+el.dataset.offer||48000;const rows=$$('.brow',el),gap=$('.ogap',el),val=$('.oval',el),send=$('[data-c=hold]',el),rng=$('input[type=range]',el),hear=$('[data-hear]',el);
  const fmt=v=>'₹'+v.toLocaleString('en-IN');const askEl=$('.oask',el);if(askEl)askEl.textContent=fmt(ask);
  const dotsA=$$('.kicks i',rows[0]),dotsB=$$('.kicks i',rows[1]);let phA=0,phB=0,last=performance.now(),lit=[-1,-1];
  const ratio=()=>Math.max(.5,Math.min(1.25,off/ask));const lock=()=>off===ask;
  const up=()=>{const d=off-ask;val.textContent=fmt(off);el.classList.toggle('lock',d===0);el.classList.toggle('over',d>0);el.style.setProperty('--gap',Math.min(1,Math.abs(d)/24000));
    gap.textContent=d===0?'Locked. The beats land together. Send it.':d<0?`${fmt(-d)} under their ask. Your beat is slower, so it drifts.`:`${fmt(d)} over their ask. Your beat is rushing. You can come down.`;
    if(rng&&+rng.value!==off)rng.value=off;if(d===0){vib(15);phB=phA}
    if(send){const no=d<-15000;send.classList.toggle('is-disabled',no);send.dataset.why='Get within ₹15,000 of their ask to send';const m=$('.owhy',el);if(m)m.textContent=no?'Get within ₹15,000 of their ask to send.':''}};
  /* lights: one dot per beat, eight across */
  const tick=now=>{const dt=Math.min(.1,(now-last)/1000);last=now;const bps=122/60;phA+=dt*bps;phB=lock()?phA:phB+dt*bps*ratio();
    const ia=Math.floor(phA)%8,ib=Math.floor(phB)%8;if(ia!==lit[0]){dotsA.forEach((x,k)=>x.classList.toggle('hit',k===ia));lit[0]=ia}if(ib!==lit[1]){dotsB.forEach((x,k)=>x.classList.toggle('hit',k===ib));lit[1]=ib}
    if(hearing)audio();requestAnimationFrame(tick)};
  /* sound */
  let hearing=false,nA=0,nB=0,out=null;const c0=()=>CCD.audio.ctx();
  const kick=(c,t,pan)=>{const p=c.createStereoPanner?c.createStereoPanner():null;const g=c.createGain();if(p){p.pan.value=pan;g.connect(p);p.connect(c.destination)}else g.connect(c.destination);const o=c.createOscillator();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(45,t+.1);g.gain.setValueAtTime(.8,t);g.gain.exponentialRampToValueAtTime(.001,t+.35);o.connect(g);o.start(t);o.stop(t+.4)};
  const audio=()=>{const c=AC_();if(!c)return;const now=c.currentTime,ia=60/122,ib=ia/ratio();while(nA<now+.12){kick(c,nA,-.7);nA+=ia}if(lock()){nB=nA-ia}else while(nB<now+.12){kick(c,nB,.7);nB+=ib}};
  const AC_=()=>CCD.audio.ctx();
  hear&&hear.addEventListener('click',()=>{const c=AC_();if(!c)return;hearing=!hearing;hear.setAttribute('aria-pressed',hearing);CCD.setLabel(hear,hearing?'Stop':'Hear it');if(hearing){nA=nB=c.currentTime+.05}});
  $('[data-n="-1"]',el).addEventListener('click',()=>{off=Math.max(30000,off-stepV);up()});$('[data-n="1"]',el).addEventListener('click',()=>{off=Math.min(80000,off+stepV);up()});
  rng&&rng.addEventListener('input',()=>{off=+rng.value;up()});
  el.addEventListener('ccd:held',()=>{const r=$('.osent',el);if(r){r.hidden=false;r.innerHTML=`<b>Offer sent: ${fmt(off)}</b><span class="mute t-small">${off===ask?'At their ask, so it usually gets a quick yes.':'They can accept, pass or come back with a number.'}</span>`}hearing&&hear.click()});
  up();requestAnimationFrame(tick)});

/* ================= THE INSTRUMENT: one sequencer, with export ================= */
const ROWS=['kick','clap','hat','bass'];const START=[[0,4,8,12],[4,12],[2,6,10,14],[0,3,8,11]];
def('instrument',el=>{const grid=$('.igrid',el);let pat=ROWS.map((r,i)=>Array.from({length:16},(_,k)=>START[i].includes(k)));const mute=[0,0,0,0];let bpm=+el.dataset.bpm||122,swing=0,cut=.7,playing=false,step=0,nextT=0,timer=null,hist=[];
  grid.innerHTML=ROWS.map((r,i)=>`<button class="irow" data-row="${i}" aria-pressed="false">${r}</button>`+Array.from({length:16},(_,k)=>`<button class="istep${k%4===0?' bar':''}" data-r="${i}" data-k="${k}" aria-label="${r} step ${k+1}" aria-pressed="${pat[i][k]}"></button>`).join('')).join('');
  const linked=!!el.closest('.story');const link=()=>{if(!linked)return;const z=i=>mute[i]?pat[i].map(()=>0):pat[i];CCD.pagePat={kick:z(0),clap:z(1),hat:z(2),bass:z(3)}};link();
  if(linked)document.addEventListener('ccd:step',e=>{const s=e.detail;$$('.istep.now',grid).forEach(x=>x.classList.remove('now'));if(s>=0)$$(`.istep[data-k="${s}"]`,grid).forEach(x=>x.classList.add('now'));const on=document.body.classList.contains('sound-on');if(play.getAttribute('aria-pressed')!==String(on)){play.setAttribute('aria-pressed',on);CCD.setLabel(play,on?'Stop':'Play')}});
  const out=()=>{const c=CCD.audio.ctx();if(!c)return null;if(!el._f){el._f=c.createBiquadFilter();el._f.type='lowpass';el._f.connect(c.destination)}el._f.frequency.value=200+Math.pow(cut,2)*14000;return el._f};
  grid.addEventListener('click',e=>{const s=e.target.closest('.istep');if(s){const r=+s.dataset.r,k=+s.dataset.k;hist.push(pat.map(x=>x.slice()));pat[r][k]=!pat[r][k];s.setAttribute('aria-pressed',pat[r][k]);link();if(pat[r][k]){const c=CCD.audio.ctx();c&&CCD.audio.voice(c,out(),ROWS[r],c.currentTime)}return}
    const rw=e.target.closest('.irow');if(rw){const i=+rw.dataset.row;mute[i]=!mute[i];rw.setAttribute('aria-pressed',!!mute[i]);grid.classList.toggle('m'+i,!!mute[i]);link()}});
  const sched=()=>{const c=CCD.audio.ctx();while(nextT<c.currentTime+.12){const sd=60/bpm/4;const t=nextT+(step%2?swing*sd*.5:0);ROWS.forEach((r,i)=>{if(pat[i][step]&&!mute[i])CCD.audio.voice(c,out(),r,t,{f:[55,55,65.4,49][Math.floor(step/4)],cut:300+cut*900})});const s=step;setTimeout(()=>{$$('.istep.now',grid).forEach(x=>x.classList.remove('now'));$$(`.istep[data-k="${s}"]`,grid).forEach(x=>x.classList.add('now'));el.style.setProperty('--beat',s%4===0?1:0)},Math.max(0,(t-c.currentTime)*1000));nextT+=sd;step=(step+1)%16}};
  const play=$('[data-play]',el);play.addEventListener('click',()=>{const c=CCD.audio.ctx();if(!c)return;if(linked){document.dispatchEvent(new CustomEvent('ccd:toggle-sound'));setTimeout(()=>{const on=document.body.classList.contains('sound-on');play.setAttribute('aria-pressed',on);CCD.setLabel(play,on?'Stop':'Play')},30);return}playing=!playing;play.setAttribute('aria-pressed',playing);CCD.setLabel(play,playing?'Stop':'Play');el.classList.toggle('playing',playing);if(playing){step=0;nextT=c.currentTime+.05;timer=setInterval(sched,25)}else{clearInterval(timer);$$('.istep.now',grid).forEach(x=>x.classList.remove('now'))}});
  /* tap tempo */
  const taps=[],bv=$('.ibpm',el);const tap=$('[data-tap]',el);tap&&tap.addEventListener('click',()=>{const n=performance.now();taps.push(n);while(taps.length>5)taps.shift();if(taps.length>1){const iv=(taps[taps.length-1]-taps[0])/(taps.length-1);if(iv>250&&iv<1500){bpm=Math.round(60000/iv);bv.textContent=bpm;if(linked&&CCD.pageTrack)CCD.pageTrack.bpm=bpm}}});
  const hh=$('[data-half]',el);hh&&hh.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;grid.classList.toggle('hb',b.dataset.h==='b');$$('button',hh).forEach(x=>x.setAttribute('aria-pressed',x===b))});
  const sw=$('[name=swing]',el);sw&&sw.addEventListener('input',()=>swing=+sw.value/100);
  /* the filter dial */
  const dial=$('.idial',el);if(dial){let dr=null;const setC=v=>{cut=Math.max(0,Math.min(1,v));dial.style.setProperty('--v',cut);dial.setAttribute('aria-valuenow',Math.round(cut*100));out();if(linked&&CCD.pageTrack){CCD.pageTrack.knob=cut;CCD.pageTrack.mix()}};setC(cut);
    dial.addEventListener('pointerdown',e=>{dr={y:e.clientY,v:cut};dial.setPointerCapture(e.pointerId)});dial.addEventListener('pointermove',e=>{if(dr)setC(dr.v+(dr.y-e.clientY)/160)});dial.addEventListener('pointerup',()=>dr=null);
    dial.addEventListener('keydown',e=>{const d=e.key==='ArrowUp'||e.key==='ArrowRight'?.05:e.key==='ArrowDown'||e.key==='ArrowLeft'?-.05:0;if(d){e.preventDefault();setC(cut+d)}})}
  /* hold rewind to undo */
  const rw=$('[data-rewind]',el);if(rw){let t;const undo=()=>{if(!hist.length)return;pat=hist.pop();link();$$('.istep',grid).forEach(s=>s.setAttribute('aria-pressed',pat[+s.dataset.r][+s.dataset.k]))};rw.addEventListener('pointerdown',()=>{undo();t=setInterval(undo,260);el.classList.add('rewinding')});['pointerup','pointerleave'].forEach(k=>rw.addEventListener(k,()=>{clearInterval(t);el.classList.remove('rewinding')}))}
  const clr=$('[data-clear]',el);clr&&clr.addEventListener('click',()=>{hist.push(pat.map(x=>x.slice()));pat=pat.map(r=>r.map(()=>false));link();$$('.istep',grid).forEach(s=>s.setAttribute('aria-pressed','false'))});
  /* export: four bars rendered to a WAV you can drop into Live */
  const ex=$('[data-export]',el),exo=$('.iexport',el);ex&&ex.addEventListener('click',async()=>{const c=CCD.audio.ctx();if(!c)return;ex.classList.add('is-loading');CCD.setLabel(ex,'Rendering');const sd=60/bpm/4,len=sd*64+.5;const oc=new OfflineAudioContext(2,Math.ceil(len*44100),44100);const fl=oc.createBiquadFilter();fl.type='lowpass';fl.frequency.value=200+Math.pow(cut,2)*14000;fl.connect(oc.destination);
    for(let s=0;s<64;s++){const k=s%16,t=s*sd+(k%2?swing*sd*.5:0);ROWS.forEach((r,i)=>{if(pat[i][k]&&!mute[i])CCD.audio.voice(oc,fl,r,t,{f:[55,55,65.4,49][Math.floor(k/4)],cut:300+cut*900})})}
    const buf=await oc.startRendering();const wav=toWav(buf);const url=URL.createObjectURL(new Blob([wav],{type:'audio/wav'}));const name=`ccd-school-${bpm}bpm.wav`;
    exo.innerHTML=`<audio controls src="${url}"></audio><a class="seeall" href="${url}" download="${name}">${EY1}<span class="lab">${name}</span><span class="cnt">${(wav.byteLength/1024|0)} KB</span></a><span class="t-small faint">Four bars at ${bpm} BPM, 44.1 kHz WAV. Drag it into an Ableton Live clip slot.</span>`;CCD.eyes.collect(exo);CCD.done(ex,'Exported')});
  function toWav(b){const ch=b.numberOfChannels,n=b.length,o=new ArrayBuffer(44+n*ch*2),v=new DataView(o);const w=(p,s)=>{for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i))};w(0,'RIFF');v.setUint32(4,36+n*ch*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,b.sampleRate,true);v.setUint32(28,b.sampleRate*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*ch*2,true);let p=44;const d=[...Array(ch)].map((_,i)=>b.getChannelData(i));for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const s=Math.max(-1,Math.min(1,d[c][i]));v.setInt16(p,s<0?s*0x8000:s*0x7FFF,true);p+=2}return o}});

/* ================= GEAR BUILDER: the rig for the room ================= */
const CROWD=[[100,'2 tops, 1 sub','Moving heads × 2'],[200,'2 tops, 2 subs','Moving heads × 4'],[400,'4 tops, 4 subs','Moving heads × 6']];
const KITS={club:['House and techno',[['CDJ-3000 × 2','Pioneer, linked'],['DJM-A9 mixer','Four channels'],['Booth monitors × 2','Angled at the DJ']]],hiphop:['Hip-hop and drill',[['Technics SL-1200 × 2','With Serato vinyl'],['Battle mixer','Rane or DJM-S'],['MC mic','Wireless']]],vinyl:['Vinyl only',[['Technics SL-1200 × 2','For your records'],['Rotary mixer','Three channels'],['Booth monitors × 2','Angled at the DJ']]]};
def('gear',el=>{let size=1,kit='club';const out=$('.rig',el),room=$('.groom',el);
  const draw=()=>{const c=CROWD[size],k=KITS[kit];room.innerHTML=`<span class="gbooth">Booth</span><span class="gcrowd" aria-hidden="true">${'<i></i>'.repeat(c[0]/10)}</span>`;$('.gsize',el).textContent=`Up to ${c[0]} people`;
    out.innerHTML=[['Decks',k[1]],['Sound',[[c[1],'Sized for '+c[0]]]],['Light',[[c[2],'Plus one strobe']]]].map(([h,items])=>`<li><span class="lbl">${h}</span>${items.map(i=>`<div><b>${esc(i[0])}</b><span class="mute t-small">${esc(i[1])}</span></div>`).join('')}</li>`).join('')};
  
  $$('[data-size]',el).forEach(b=>b.addEventListener('click',()=>{size=+b.dataset.size;$$('[data-size]',el).forEach(x=>x.setAttribute('aria-pressed',x===b));draw()}));draw()});

/* ================= EPISODES: our own nights, on a stage =================
   The selected poster sits big with its record sliding out behind it, spinning. A giant outlined number,
   the room, the date and the line-up as tracks. Every Episode sits on the shelf below. The next one counts down. */
def('episodes',el=>{const root=el.dataset.root||'';const E=D.eps||[];const stage=$('.ep-stage',el),shelf=$('.ep-shelf',el);let cur=null;
  const pad=n=>String(n).padStart(2,'0');
  const days=d=>{const t=new Date(d.replace(/^\w+ /,'')+' 2026');const n=Math.ceil((t-Date.now())/864e5);return isNaN(n)?null:n};
  const art=e=>e.img?`<img src="${root}assets/img/${e.img}.webp" alt="Episode ${e.no} poster">`:`<span class="ep-slate"><img src="${root}assets/img/chrome-cat.webp" alt=""><b>${pad(e.no)}</b><em>${e.next?'Poster soon':'No poster'}</em></span>`;
  shelf.innerHTML=E.map(e=>`<button class="ep-th${e.next?' next':''}" data-no="${e.no}" aria-pressed="false" aria-label="Episode ${e.no}, ${esc(e.v)}">${art(e)}<span class="ep-n">${pad(e.no)}</span></button>`).join('');
  const show=no=>{const e=E.find(x=>x.no===no);if(!e)return;cur=no;$$('.ep-th',shelf).forEach(b=>b.setAttribute('aria-pressed',+b.dataset.no===no));const dd=e.next?days(e.d):null;
    stage.innerHTML=`<div class="ep-art"><span class="ep-rec" aria-hidden="true"><img src="${root}assets/img/logo.png" alt=""></span><div class="ep-poster">${art(e)}</div></div>
      <div class="ep-info"><span class="ep-big" aria-hidden="true">${pad(e.no)}</span><span class="lbl">Episode ${pad(e.no)}${e.next?' · next':''}</span><b class="t-h1">${esc(e.v)}</b><span class="t-data mute">${esc(e.d.toUpperCase())}, BENGALURU</span>
      ${e.l.length?`<ol class="tracks">${e.l.map((a,i)=>CCD.trackRow(a,i<2?'A'+(i+1):'B'+(i-1),'')).join('')}</ol>`:`<p class="mute">${e.next?'Line-up soon. Residents Merman and Sartdawg.':'Line-up not on file yet.'}</p>`}
      ${e.next?`<div class="ep-count">${dd!=null&&dd>=0?`<b>${dd}</b><span>${dd===1?'day':'days'} to go</span>`:''}</div><button class="btn two l hold" data-c="hold" data-label="Hold to save your spot" data-done="Spot saved">${EY2}<span class="lab">Hold to save your spot</span></button>`:`<button class="btn one m" data-c="iwas">${EY1}<span class="lab">I was there</span></button>`}</div>`;
    stage.classList.remove('in');void stage.offsetWidth;stage.classList.add('in');CCD.init(stage)};
  shelf.addEventListener('click',e=>{const b=e.target.closest('.ep-th');if(b)show(+b.dataset.no)});
  shelf.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const b=e.target.closest('.ep-th');if(b&&+b.dataset.no!==cur)show(+b.dataset.no)});
  el.addEventListener('keydown',e=>{const i=E.findIndex(x=>x.no===cur);if(e.key==='ArrowRight'&&i<E.length-1)show(E[i+1].no);if(e.key==='ArrowLeft'&&i>0)show(E[i-1].no)});
  stage.addEventListener('pointermove',e=>{const p=$('.ep-art',stage);if(!p||RM)return;const r=p.getBoundingClientRect();p.style.setProperty('--tx',((e.clientX-r.left)/r.width-.5).toFixed(3));p.style.setProperty('--ty',((e.clientY-r.top)/r.height-.5).toFixed(3))});
  stage.addEventListener('pointerleave',()=>{const p=$('.ep-art',stage);p&&p.style.setProperty('--tx',0);p&&p.style.setProperty('--ty',0)});
  show((E.find(x=>x.next)||E[E.length-1]).no)});
def('iwas',el=>el.addEventListener('click',()=>{CCD.done(el,'Stamped. +100');el.classList.add('is-done')}));

/* ================= POINTS: three ideas to replace the meter ================= */
def('points',el=>{const E=D.earn||[],RW=D.rewards||[];let bal=+el.dataset.bal||350;const card=$('.pcard',el),tab=$('.ptab',el),crate=$('.pcrate',el),hist=[['Check in at a night',100,'Ep 04, Bar Wild'],['A friend comes to their first night',150,'Kabir, Ep 04'],['Be a fan of an artist',50,'Kohra'],['Rate a night',10,'Danza Drome'],['Share a night',20,'Somad Lab'],['Finish a lesson',25,'Drums, lesson 3']];
  const nextR=()=>RW.find(r=>r[0]>bal)||RW[RW.length-1];
  const draw=()=>{const nr=nextR();
    if(card){const slots=8,filled=Math.min(slots,Math.floor(bal/100));card.innerHTML=`<div class="pc-head"><span class="lbl">Your card</span><b class="t-h2">${bal}</b></div><div class="pc-grid">${Array.from({length:slots},(_,i)=>`<span class="pc-slot${i<filled?' on':''}${(i+1)*100===nr[0]?' goal':''}">${i<filled?'<img src="'+(el.dataset.root||'')+'assets/img/logo.png" alt="">':(i+1)*100===nr[0]?'<em>'+nr[0]+'</em>':''}</span>`).join('')}</div><p class="t-small mute">${nr[0]>bal?`${nr[0]-bal} to your next reward`:'Reward ready'}</p>`}
    if(tab){tab.innerHTML=`<div class="pt-paper"><span class="lbl">Cats Can Dance · your tab</span>${hist.map(h=>`<div class="pt-line"><span>${esc(h[2])}</span><span class="dots"></span><b>+${h[1]}</b></div>`).join('')}<div class="pt-total"><span>Total</span><b>${bal}</b></div><div class="pt-menu">${RW.map(r=>`<div class="pt-line ${r[0]<=bal?'can':''}"><span>${esc(r[1])}</span><span class="dots"></span><b>${r[0]}</b></div>`).join('')}</div></div>`}
    if(crate){const n=Math.min(12,Math.round(bal/50));crate.innerHTML=`<div class="cr-box">${Array.from({length:12},(_,i)=>`<span class="cr-rec${i<n?' on':''}" style="--i:${i}"></span>`).join('')}</div><div><b class="t-h2">${bal}</b><p class="t-small mute">Every 50 adds a record. A full crate is ${RW[RW.length-1][0]}.</p></div>`}};
  $$('[data-earn]',el).forEach(b=>b.addEventListener('click',()=>{const e=E[+b.dataset.earn];bal+=e[1];hist.unshift([e[0],e[1],'Just now']);hist.length=Math.min(hist.length,7);draw();const pop=document.createElement('span');pop.className='ppop';pop.textContent='+'+e[1];b.appendChild(pop);setTimeout(()=>pop.remove(),900)}));
  draw()});

document.addEventListener('DOMContentLoaded',()=>CCD.init());
})();
