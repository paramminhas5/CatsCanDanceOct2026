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
  {const q=new URLSearchParams(location.search).get('name');if(q&&f('name'))f('name').value=q.slice(0,34)}$$('input,select',el).forEach(i=>i.addEventListener('input',up));up();
  const showOut=(link,live)=>{out.hidden=false;out.innerHTML=`<span class="lbl">${live?'Your invite is live':'Your invite is saved on this device'}</span><div class="inv-share"><code class="inv-link">${esc(link)}</code><button class="btn two s" data-copy>${EY2}<span class="lab">Copy link</span></button></div>
    <div class="inv-acts"><a class="btn one s" href="https://wa.me/?text=${encodeURIComponent('You\'re invited: '+link)}" target="_blank" rel="noopener"><span class="lab">Send on WhatsApp</span></a><a class="btn one s" href="${root}pages/rsvp.html#i-${id}">${EY1}<span class="lab">Open it as a guest</span></a><a class="btn one s" href="${root}pages/guests.html#i-${id}">${EY1}<span class="lab">Guest list</span></a></div>
    <p class="t-small faint">${live?'Anyone you share this page with can open the link and answer. Replies show up here as they come in.':'This copy of the page can\'t save to the shared store, so answers stay on this device. On the published page the link works for anyone you share it with.'}</p><ul class="inv-replies" aria-live="polite"></ul>`;
    const cp=$('[data-copy]',out);cp.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(link);CCD.setLabel(cp,'Copied')}catch(e){const r=document.createRange();r.selectNodeContents($('.inv-link',out));getSelection().removeAllRanges();getSelection().addRange(r);CCD.setLabel(cp,'Selected, copy it')}setTimeout(()=>CCD.setLabel(cp,'Copy link'),2000)});CCD.eyes.collect(out)};
  el.addEventListener('ccd:held',async()=>{const v=vals();id=newId();const s=await CCD.store();const body={...v,host:s&&s.uid||'me',t:Date.now()};let live=false;
    if(s){try{await s.db.doc('invites/'+id).set(body);if(s.uid)await s.db.doc('data/users/'+s.uid+'/host').set({last:id});live=true}catch(e){live=false}}
    const all=LS.get('inv')||{};all[id]=body;LS.set('inv',all);LS.set('last',id);
    const base=live?CCD.SITE:location.href.split('#')[0].replace(/\/pages\/[^/]*$/,'/pages/rsvp').replace(/\/(index\.html)?$/,'/pages/rsvp');showOut(base+'#i-'+id,live);CCD.pts.award(50,'night hosted',card,'host-'+id);unsub&&unsub();unsub=await CCD.watchReplies(id,rs=>{const n=rs.filter(r=>r.s!=='no').reduce((a,r)=>a+1+(r.plus?1:0),0);going.textContent=n+' going';
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
def('offer',el=>{const ask=+el.dataset.ask||60000,stepV=1000;let off=+el.dataset.offer||48000;const gap=$('.ogap',el),val=$('.oval',el),send=$('[data-c=hold]',el),rng=$('input[type=range]',el);
  const fmt=v=>'₹'+v.toLocaleString('en-IN');const askEl=$('.oask',el);if(askEl)askEl.textContent=fmt(ask);
  const up=()=>{const d=off-ask;val.textContent=fmt(off);el.classList.toggle('lock',d===0);el.classList.toggle('over',d>0);if(rng){rng.value=off;rng.style.setProperty('--p',((off-30000)/50000*100).toFixed(1)+'%')}
    gap.textContent=d===0?'At their ask. These usually get a quick yes.':d<0?`${fmt(-d)} under their ask.`:`${fmt(d)} over their ask.`;
    const no=d<-15000;send.classList.toggle('is-disabled',no);send.dataset.why='Get within ₹15,000 of their ask to send';if(no)gap.textContent+=' Get within ₹15,000 to send.'};
  $('[data-n="-1"]',el).addEventListener('click',()=>{off=Math.max(30000,off-stepV);up()});$('[data-n="1"]',el).addEventListener('click',()=>{off=Math.min(80000,off+stepV);up()});
  rng.addEventListener('input',()=>{off=+rng.value;up()});
  el.addEventListener('ccd:held',()=>{const r=$('.osent',el);r.hidden=false;r.innerHTML=`<b>Offer sent: ${fmt(off)}</b><span class="mute t-small">${off===ask?'At their ask, so it usually gets a quick yes.':'They can accept, pass or come back with a number.'}</span>`});
  up()});

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
    const buf=await oc.startRendering();const wav=toWav(buf);CCD.pts.award(25,'lesson done',ex,'lesson-export');const url=URL.createObjectURL(new Blob([wav],{type:'audio/wav'}));const name=`ccd-school-${bpm}bpm.wav`;
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
def('iwas',el=>el.addEventListener('click',()=>{if(el.classList.contains('is-done'))return;CCD.done(el,'Stamped');el.classList.add('is-done');CCD.pts.award(100,'stamped',el,el.dataset.key||null,true)}));

/* ================= POINTS: the meter, your stamps under the light, how you earn, what it gets you =================
   Back to the v7 design. Every row you tap really adds to the balance in the header, and so does everything
   you do elsewhere (check in, I was there, follow, make an invite, finish a loop). */
def('points',el=>{const root=el.dataset.root||'';
  const EARN=[['nights','Check in at a night',100,0,'checked in',1],['nights','A friend comes to their first night',150,0,'friend came'],['nights','Rate a night',10,0,'rated'],['nights','Share a night',20,1,'shared'],['artists','Be a fan of an artist',50,1,'fan'],['host','Host a night',50,1,'night hosted'],['school','Finish a lesson',25,1,'lesson done']];
  const PERKS=[[200,'Bring a +1'],[300,'Guaranteed spot'],[-3,'Regular'],[800,'Free ticket'],[-10,'Resident'],[1e9,'Merch']];
  const P0=[150,168],RR=140,pt=(v,r)=>{const an=(-52+Math.min(v,1000)/1000*104-90)*Math.PI/180;return[(P0[0]+r*Math.cos(an)).toFixed(1),(P0[1]+r*Math.sin(an)).toFixed(1)]};
  let ticks='';for(let v=0;v<=1000;v+=50){const x=pt(v,RR),y=pt(v,RR-(v%100?6:12));ticks+=`<line x1="${x[0]}" y1="${x[1]}" x2="${y[0]}" y2="${y[1]}" stroke="${v>=800?'#FF3B30':'#0C0D0F'}" stroke-width="${v%100?1:1.8}"/>`}
  [[200,'+1'],[300,'Spot'],[800,'Ticket']].forEach(([v,l],i)=>{const x=pt(v,RR+13);ticks+=`<text x="${x[0]}" y="${x[1]}" text-anchor="middle" font-family="Martian Mono,monospace" font-size="8.5">${l}</text><circle class="lamp" data-v="${v}" cx="${250+i*14}" cy="118" r="4"/>`});
  el.innerHTML=`<div class="pv-top"><div class="pv-tot"><b data-tot></b><span data-tier></span></div>
    <div class="vu"><svg viewBox="0 0 300 128" role="img" aria-label="Points meter">${ticks}<text x="16" y="120" font-family="Martian Mono,monospace" font-size="8">POINTS</text><g class="ndl"><line x1="150" y1="168" x2="150" y2="34" stroke="#0C0D0F" stroke-width="2"/></g><circle cx="150" cy="168" r="50" fill="#0C0D0F"/></svg></div></div>
    <div class="pv-grid"><div><span class="lbl">Your stamps · one a night out, +100 points each · move over them like a UV light</span><div class="pv-stamps"></div><p class="pv-next t-small"></p>
      <span class="lbl" style="display:block;margin-top:var(--s5)">What it gets you</span><ul class="perks">${PERKS.map(([v,l])=>`<li data-v="${v}"><b>${l}</b><span>${v<0?(-v)+' nights out':v>1e8?'Prices soon':v+' points'}</span></li>`).join('')}</ul></div>
    <div><span class="lbl">How you earn · tap one</span><div class="earn">${EARN.map((x,i)=>`<button data-e="${i}" style="--c:var(--c-${x[0]})"><i></i><span>${x[1]}</span>${x[3]?'<s>example</s>':''}<b>+${x[2]}</b></button>`).join('')}</div></div></div>`;
  const tot=$('[data-tot]',el),tier=$('[data-tier]',el),ndl=$('.ndl',el),st=$('.pv-stamps',el);
  const draw=()=>{const b=CCD.pts.bal,n=CCD.pts.nights;tot.textContent=b.toLocaleString('en-IN');tier.innerHTML=n>=10?'Resident':n>=3?`Regular<br>${n} nights out`:`points<br>${n} night${n===1?'':'s'} out`;
    ndl.style.setProperty('--ang',(-52+Math.min(b,1000)/1000*104)+'deg');$$('.lamp',el).forEach(l=>l.classList.toggle('on',b>=+l.dataset.v));
    $$('.perks li',el).forEach(li=>{const v=+li.dataset.v;li.classList.toggle('on',v<0?n>=-v:b>=v)});
    const EPS=(D.eps||[]).filter(x=>!x.next);st.innerHTML=Array.from({length:10},(_,i)=>{const ep=EPS[i];const r=((i*37)%17)-8;return `<span class="pst${i<n?' got':''}${i===2||i===9?' goal':''}">${i<n?`<span class="ink" style="--r:${r}deg"><i></i><em>${ep?'EP 0'+ep.no:'NIGHT '+(i+1)}</em></span>`:''}${i===2?'<b>Regular</b>':i===9?'<b>Resident</b>':''}</span>`}).join('');
    $('.pv-next',el).innerHTML=n<3?`<b>${3-n} more</b> and you're a Regular: a guaranteed spot at every Episode.`:n<10?`<b>Regular.</b> ${10-n} more nights out and you're a Resident.`:'<b>Resident.</b> Free entry to every Episode.'};
  $$('.earn button',el).forEach(b=>b.addEventListener('click',()=>{const x=EARN[+b.dataset.e];CCD.pts.award(x[2],x[4],b,null,!!x[5]);b.classList.remove('hit');void b.offsetWidth;b.classList.add('hit')}));
  st.addEventListener('pointermove',e=>{const r=st.getBoundingClientRect();st.style.setProperty('--ux',(e.clientX-r.left)+'px');st.style.setProperty('--uy',(e.clientY-r.top)+'px');st.classList.add('lit')});st.addEventListener('pointerleave',()=>st.classList.remove('lit'));
  document.addEventListener('ccd:points',draw);
  document.addEventListener('ccd:step',e=>{if(e.detail<0)return;const p=CCD.pageTrack&&CCD.pageTrack.pat('kick');if(p&&p[e.detail]){el.classList.add('kick');setTimeout(()=>el.classList.remove('kick'),90)}});
  draw()});

/* ================= WORK BLOCK: how it works beside one product card =================
   The steps on the left drive the card: a step with a tab opens that tab, a step with a target scrolls to it and lights it.
   Tabs in the card's bar switch its views. [data-goto] buttons move to a tab. Making the invite moves Host to the guest list. */
def('cbody',el=>{const steps=$$('.steps button',el),tabs=$$('.pbar .ptabs [data-tab]',el),vs=$$('.pbody > .hv',el);let cur=0;
  const go=n=>{if(!vs.length)return;cur=n;tabs.forEach(t=>t.setAttribute('aria-selected',+t.dataset.tab===n));vs.forEach(v=>{v.hidden=+v.dataset.v!==n;if(!v.hidden){v.classList.remove('in');void v.offsetWidth;v.classList.add('in')}});
    steps.forEach(b=>{if(b.dataset.tab==null)return;const t=+b.dataset.tab;b.classList.toggle('done',t<n);b.classList.toggle('on',t===n&&b===steps.find(x=>+x.dataset.tab===n))});CCD.eyes.collect(el)};
  tabs.forEach(t=>t.addEventListener('click',()=>go(+t.dataset.tab)));
  el.addEventListener('click',e=>{const g=e.target.closest('[data-goto]');if(g){go(+g.dataset.goto);$('.panel',el).scrollIntoView({behavior:RM?'auto':'smooth',block:'nearest'})}});
  const inView=r=>r.top>CCD.ms('--header')+8&&r.bottom<innerHeight-8;
  const show=(i,auto)=>{const b=steps[i];if(!b)return;steps.forEach((x,k)=>{x.classList.toggle('on',k===i);x.classList.toggle('done',k<i)});
    if(b.dataset.tab!=null&&+b.dataset.tab!==cur)go(+b.dataset.tab);
    const t=(b.dataset.focus&&[...$$(b.dataset.focus,el)].find(x=>x.offsetParent))||$('.pbody',el);if(!t)return;
    const point=()=>{CCD.paw(t);t.classList.remove('flash');void t.offsetWidth;t.classList.add('flash')};
    if(inView(t.getBoundingClientRect()))setTimeout(point,40);else{t.scrollIntoView({behavior:RM?'auto':'smooth',block:'center'});setTimeout(point,RM?40:520)}};
  steps.forEach((b,i)=>b.addEventListener('click',()=>{stopTour();show(i)}));
  let tour=null;const stopTour=()=>{clearInterval(tour);tour=null;sm&&CCD.setLabel(sm,'Show me')};
  const sm=$('[data-showme]',el);sm&&sm.addEventListener('click',()=>{if(tour){stopTour();return}let i=0;show(i);CCD.setLabel(sm,'Stop');tour=setInterval(()=>{i++;if(i>=steps.length){stopTour();return}show(i)},1700)});
  if(vs.length)go(0);
  /* a scroll moment: the first time the steps come into view they light up one after another, without moving the page */
  const run=new IntersectionObserver(es=>{if(!es[0].isIntersecting||tour)return;run.disconnect();if(RM)return;let i=0;const t=setInterval(()=>{if(tour){clearInterval(t);return}steps.forEach((x,k)=>{x.classList.toggle('on',k===i);x.classList.toggle('done',k<i)});if(++i>steps.length){clearInterval(t);steps.forEach(x=>x.classList.remove('on','done'))}},520)},{threshold:.45});
  const ol=$('.steps',el);ol&&run.observe(ol)});

/* ================= THE PAW: points at the thing a step is about, and taps it ================= */
CCD.paw=(()=>{let p=null,hide=null;return t=>{if(!p){p=document.createElement('div');p.className='paw';p.setAttribute('aria-hidden','true');p.innerHTML='<svg viewBox="0 0 64 64"><ellipse cx="32" cy="42" rx="15" ry="13"/><ellipse cx="14" cy="26" rx="6" ry="8"/><ellipse cx="25" cy="16" rx="6" ry="8"/><ellipse cx="39" cy="16" rx="6" ry="8"/><ellipse cx="50" cy="26" rx="6" ry="8"/></svg>';document.body.appendChild(p)}
  const r=t.getBoundingClientRect();const x=r.left+Math.min(r.width/2,r.width-24),y=r.top+Math.min(r.height/2,r.height-16);p.style.transform=`translate(${x.toFixed(0)}px,${y.toFixed(0)}px)`;p.classList.add('on');p.classList.remove('tap');void p.offsetWidth;setTimeout(()=>p.classList.add('tap'),RM?0:380);
  clearTimeout(hide);hide=setTimeout(()=>p.classList.remove('on'),2200)}})();
addEventListener('scroll',()=>{const p=document.querySelector('.paw.on');p&&p.classList.remove('on')},{passive:true});

/* ================= ARTIST BOARD: twelve faces, one in focus ================= */
def('aboard',el=>{const root=el.dataset.root||'';const M=Object.fromEntries((D.roster||[]).map(r=>[r[0],r]));const f=$('.ab-f',el);
  const nightsOf=slug=>{const nm=CCD.norm(CCD.pretty(M[slug][1]));return (D.nights||[]).filter(n=>n.l.some(l=>CCD.norm(l.replace(/\s*\(live\)/i,''))===nm))};
  function show(slug){const r=M[slug];if(!r)return;$$('.ab-av',el).forEach(b=>b.setAttribute('aria-pressed',b.dataset.slug===slug));const nm=CCD.pretty(r[1]),ph=CCD.rphoto(r,root),n=nightsOf(slug)[0];
    f.innerHTML=`<div class="ab-ph"><img src="${ph}" alt="${esc(nm)}"><button class="vinyl ab-vin" data-c="vinyl" data-a="${slug}" data-n="${esc(nm)}" aria-label="${esc(nm)}. Tap to play, drag to scratch."><img src="${ph}" alt=""></button></div>
      <div class="ab-t"><span class="t-data faint">${esc((CCD.city(r[2])||'').toUpperCase())}</span><b class="ab-n">${esc(nm)}</b><span class="tags">${r[3].slice(0,3).map(g=>`<span>${esc(g)}</span>`).join('')}</span>
      ${n?`<a class="ab-next" href="${root}pages/night.html#${n.id}"><i></i>Next: ${esc(n.d)}, ${esc(n.t)}</a>`:`<span class="ab-next none">No date announced</span>`}
      <div class="vinfo"></div><div class="acts"><a class="btn two m" href="${root}pages/artist.html#${slug}">${EY2}<span class="lab">Open their page</span></a><button class="btn one m" data-follow="${esc(nm)}" aria-pressed="false">${EY1}<span class="lab">Follow</span></button></div></div>`;
    f.classList.remove('in');void f.offsetWidth;f.classList.add('in');CCD.init(f)}
  el.addEventListener('click',e=>{const b=e.target.closest('.ab-av');if(b)show(b.dataset.slug)});
  show(($('.ab-av',el)||{}).dataset?.slug)});

/* ================= PICKS: Nights, curated =================
   One pick in the frame. Hover or focus a row and its poster and facts take the frame; leave and the pick comes back.
   City tabs are quiet text. On touch, the first tap on a row shows it in the frame, the second opens the night. */
def('picks',el=>{const root=el.dataset.root||'';const fr=$('.pk-frame',el),img=$('.pk-img img',fr),ia=$('.pk-img',fr),t=$('.pk-t',fr),m=$('.pk-m',fr),l=$('.pk-l',fr),tag=$('.pk-tag',fr),go=$('.pk-go',fr);
  const defHref=ia.getAttribute('href');let cur=null,timer=null;
  const who=json=>{let xs=[];try{xs=JSON.parse(json)}catch(e){}return '<span class="lbl">Playing</span> '+(xs.length?xs.map(([n,k])=>k?`<a href="${root}pages/artist.html#${k}">${esc(n)}</a>`:`<span>${esc(n)}</span>`).join(', '):'<span class="faint">Line-up not announced</span>')};
  const set=a=>{clearTimeout(timer);if(a===cur)return;cur=a;fr.classList.add('swap');
    timer=setTimeout(()=>{if(a){img.src=a.dataset.img;t.textContent=a.dataset.t;m.textContent=a.dataset.m;l.innerHTML=who(a.dataset.l);tag.textContent='Also this week';ia.href=go.href=a.href}
      else{img.src=img.dataset.def;t.textContent=t.dataset.def;m.textContent=m.dataset.def;l.innerHTML=who(l.dataset.def);tag.textContent='Our pick this week';ia.href=go.href=defHref}
      fr.classList.remove('swap')},ms('--d-quick'))};
  const list=$('.pk-list ol',el);const rowOf=e=>{const li=e.target.closest('li');return li&&$('.pk-main',li)};
  list.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const a=rowOf(e);if(a)set(a)});
  list.addEventListener('focusin',e=>{const a=rowOf(e);if(a)set(a)});
  el.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')set(null)});
  list.addEventListener('click',e=>{const a=e.target.closest('.pk-main');if(!a)return;if(matchMedia('(hover:none)').matches&&cur!==a){e.preventDefault();set(a);fr.scrollIntoView({behavior:RM?'auto':'smooth',block:'nearest'})}});
  const tabs=$('.pk-tabs',el),emp=$('.pk-empty',el);
  tabs.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$$('button',tabs).forEach(x=>x.setAttribute('aria-pressed',x===b));const v=b.dataset.v;let n=0;
    $$('li',list).forEach(li=>{const on=v==='all'||li.dataset.city===v;li.hidden=!on;if(on)n++});emp.hidden=n>0;set(null)})});

/* ================= NIGHT PAGE: night.html#id renders that night ================= */
def('nightpage',el=>{const root=el.dataset.root||'';const N=D.nights||[];
  function draw(){const id=location.hash.replace('#','');const n=N.find(x=>x.id===id);if(!n)return;
    const fh=h=>{if(!h)return'';const [H,M]=h.split(':').map(Number);return `${(H+11)%12+1}${M?':'+String(M).padStart(2,'0'):''} ${H>=12?'PM':'AM'}`};
    document.title=n.t+' · Cats Can Dance';
    const sl=$('.sleeve',el);$('.cover img',sl).src=`${root}assets/img/${n.img}.webp`;$('.cover img',sl).alt=n.t+' poster';sl.setAttribute('aria-label',n.t+'. Pull the record for the line-up.');sl.classList.remove('out');sl.setAttribute('aria-expanded','false');
    const RO=Object.fromEntries((D.roster||[]).map(r=>[CCD.norm(CCD.pretty(r[1])),r[0]]));
    $('.tracks-wrap',sl).innerHTML='<ol class="tracks">'+(n.l.length?n.l:['Line-up not announced']).map((a,i)=>{const nm=a.replace(/\s*\(live\)/i,'');const hit=RO[CCD.norm(nm)];return `<li class="track"><span class="tr-rec" aria-hidden="true"></span><span class="tr-n">${String.fromCharCode(65+(i>>1))}${i%2+1}</span><b>${hit?`<a href="${root}pages/artist.html#${hit}">${esc(a)}</a>`:esc(a)}</b><span class="tr-wave" aria-hidden="true">${CCD.wave(a)}</span><span class="tr-meta"></span></li>`}).join('')+'</ol>';
    $('h1',el).textContent=n.t;
    const dd=$$('.kvs dd',el);dd[0].textContent=n.d+(n.h?', '+fh(n.h):'');dd[1].textContent=n.v+', '+n.c;dd[2].textContent=(n.g||[]).join(', ')||'Not listed';
    const acts=$('.acts',el);let tk=$('a[href*="http"]',acts);if(n.tk){if(!tk){acts.insertAdjacentHTML('beforeend',`<a class="btn one m" target="_blank" rel="noopener">${EY1}<span class="lab">Tickets</span></a>`);tk=$('a[target]',acts)}tk.href=n.tk;CCD.setLabel(tk,/skillbox/i.test(n.tk)?'Tickets on SkillBox':/district/i.test(n.tk)?'Tickets on District':'Tickets')}else if(tk)tk.remove();
    CCD.eyes.collect(el);
    const crumb=document.querySelector('.subnav .on, .subnav [aria-current]');crumb&&/night/i.test(crumb.textContent)&&(crumb.textContent=n.t);
    $$('.nmore .ncard').forEach(a=>a.hidden=a.getAttribute('href').endsWith('#'+id))}
  draw();addEventListener('hashchange',()=>{draw();scrollTo({top:0,behavior:RM?'auto':'smooth'})})});

/* ================= ARTIST PAGE: any artist, from the catscandance.com database =================
   artist.html#slug. The artist, their eras, releases, gigs, press and videos come from the live database.
   Eras are sleeves: pull one and the record slides out, the page takes that era's colour and photo, and releases and shows narrow to it.
   Releases play real 30 second previews (Deezer, through our server route). Bandcamp-only records open on Bandcamp. */
const SB='https://jybloszaucgqlbkzquqw.supabase.co/rest/v1/',SBK='sb_publishable_LklrPFlR8TjDoT9ZV8PizA_wkIL9uNR';
CCD.sb=async q=>{const r=await fetch(SB+q,{headers:{apikey:SBK,Authorization:'Bearer '+SBK}});if(!r.ok)throw 'sb';return r.json()};
const ERACOL=['nights','school','artists','host'];
const TYPE=t=>({ep:'EP',lp:'Album',album:'Album',single:'Single',remix:'Remix',compilation:'Compilation',mix:'Mix'}[String(t||'').toLowerCase()]||(t?String(t)[0].toUpperCase()+String(t).slice(1):'Release'));
const ytId=u=>{const m=String(u||'').match(/(?:v=|youtu\.be\/)([\w-]{11})/);return m?m[1]:null};
const pretty=n=>n&&n===n.toUpperCase()&&/[A-Z]/.test(n)?n.split(' ').map(w=>w.length>2||/^[A-Z]+$/.test(w)&&w.length>1?w[0]+w.slice(1).toLowerCase():w).join(' '):n;
def('artistpage',el=>{const root=el.dataset.root||'';const R=(D.roster||[]);
  const h0=location.hash.replace('#','').split('&')[0].toLowerCase();const slug=R.some(x=>x[0]===h0)?h0:(el.dataset.slug||'sandunes');
  const me=R.find(x=>x[0]===slug)||R.find(x=>x[0]===el.dataset.slug);
  const photo=x=>x&&x[4]==='L'?`${root}assets/img/a-${x[0]}.webp`:(x&&x[4])||'';
  const fb=JSON.parse(($('.ap-data',el)||{}).textContent||'{}');
  let A=null,ERAS=[],RELS=[],GIGS=[],PRESS=[],VIDS=[],AFF=[],PHOTOS=[];
  const dz=CCD.dz,AU=CCD.audio;let era=-1,focus=null,type='all',now=null;
  const $h=$('.ap-head',el),$sl=$('.ap-sls',el),$fo=$('.ap-focus',el),$rel=$('.ap-rels',el),$pop=$('.ap-pop',el),$sh=$('.ap-shows',el),$pr=$('.ap-press',el),$vid=$('#watch .ap-vids',el),$con=$('.ap-conn',el),$fans=$('.ap-fans',el);
  const COL=k=>k<0||ERAS.length<2?'var(--c-artists)':`var(--c-${ERACOL[k%ERACOL.length]})`;
  const eraOf=y=>{if(!ERAS.length||!y)return -1;let k=ERAS.findIndex(e=>y>=e.from&&(e.to==null||y<=e.to));return k<0?(y<ERAS[0].from?0:ERAS.length-1):k};
  const art=(r,cls='')=>`<span class="ap-art ${cls}" style="--ec:${COL(r.era)}">${r.dz?`<img src="${dz.cover(r.dz,cls?'big':'medium')}" alt="" loading="lazy" onerror="this.remove()">`:''}<b>${esc(r.t)}</b><em>${r.y||''}</em></span>`;
  /* ---------- load ---------- */
  async function load(){
    try{const [a]=await CCD.sb(`artists?slug=eq.${slug}&select=slug,name,based_city,genres,bio,instagram,spotify,soundcloud,website,photo_url,open_to_bookings,labels`);if(!a)throw 'none';A=a;
      const q=t=>CCD.sb(t).catch(()=>[]);
      const [er,ds,gg,pr,vd,af,md]=await Promise.all([q(`artist_eras?artist_slug=eq.${slug}&select=from_year,to_year,label,sound,tags,source_name&order=from_year`),q(`artist_discography?artist_slug=eq.${slug}&select=title,release_type,release_date,year,label,bandcamp_url,deezer_album_id,deezer_track_title&order=year.asc.nullsfirst`),q(`artist_gigs?artist_slug=eq.${slug}&select=event_name,venue,city,event_date,source&order=event_date.desc`),q(`artist_press?artist_slug=eq.${slug}&select=title,publication,url,date_published&order=date_published.desc.nullslast`),q(`artist_videos?artist_slug=eq.${slug}&select=title,url,kind,platform`),q(`artist_affiliations?artist_slug=eq.${slug}&select=name,kind`),q(`artist_media?artist_slug=eq.${slug}&kind=eq.photo&select=url,sort&order=sort`)]);
      ERAS=er.map(e=>({from:e.from_year,to:e.to_year,label:e.label||'',sound:e.sound||'',tags:e.tags||[],src:e.source_name||''}));
      RELS=ds.map(r=>({t:r.title,ty:TYPE(r.release_type),y:r.year||(r.release_date?+r.release_date.slice(0,4):null),lab:r.label||'',bc:r.bandcamp_url||'',dz:r.deezer_album_id||'',tr:r.deezer_track_title||''}));
      GIGS=gg.map(g=>({d:g.event_date,e:g.event_name,v:g.venue||'',c:g.city||'',src:g.source||''}));PRESS=pr.map(x=>({d:x.date_published||'',p:x.publication||'',t:x.title,u:x.url}));VIDS=vd.map(v=>({id:ytId(v.url),t:v.title,k:v.kind||'',u:v.url,pl:v.platform||''}));AFF=af;PHOTOS=md.map(m=>m.url);
    }catch(e){if(fb.slug===slug){A=fb.artist;ERAS=fb.eras;RELS=fb.rels;GIGS=fb.gigs;PRESS=fb.press||[];VIDS=fb.vids||[];AFF=fb.aff||[]}else if(me){A={name:me[1],based_city:me[2],genres:me[3]}}else A={name:slug}}
    if(!PHOTOS.length&&(photo(me)||A.photo_url))PHOTOS=[photo(me)||A.photo_url];
    /* no releases in our database: take their catalogue from Deezer */
    if(!RELS.length){try{const ar=await dz.findArtist(pretty(A.name));if(ar){const al=await dz.jsonp('artist/'+ar.id+'/albums?limit=40');RELS=(al.data||[]).map(x=>({t:x.title,ty:TYPE(x.record_type),y:x.release_date?+x.release_date.slice(0,4):null,lab:'',bc:'',dz:String(x.id),tr:''})).sort((a,b)=>(a.y||0)-(b.y||0));el.classList.add('from-dz')}}catch(e){}}
    RELS.forEach(r=>r.era=eraOf(r.y));GIGS.forEach(g=>g.era=eraOf(g.d?+g.d.slice(0,4):null));
    paint()}
  /* ---------- paint ---------- */
  function paint(){const name=pretty(A.name);document.title=name+' · Cats Can Dance';
    const city=(A.based_city||'').split('(')[0].replace(/, (India|USA)$/,'');const g=(A.genres||[]).slice(0,3).join(', ');
    const links=[A.spotify&&['Spotify',A.spotify],A.soundcloud&&['SoundCloud',A.soundcloud],A.instagram&&['Instagram',/^http/.test(A.instagram)?A.instagram:'https://instagram.com/'+A.instagram.replace('@','')],A.website&&['Website',A.website]].filter(Boolean);
    const yrs=[...RELS.map(r=>r.y),...ERAS.map(e=>e.from)].filter(Boolean);const span=yrs.length?`${Math.min(...yrs)} to now`:'';
    const nm0=CCD.norm(name);const nn=(D.nights||[]).find(n=>n.l.some(l=>CCD.norm(l.replace(/\s*\(live\)/i,''))===nm0));
    $h.innerHTML=`<div class="ap-photo">${PHOTOS[0]?`<img src="${PHOTOS[0]}" alt="${esc(name)}" data-photo>`:`<span class="ap-ini">${esc(name[0]||'?')}</span>`}</div>
      <div class="ap-id"><span class="lbl">${esc([city,g,span].filter(Boolean).join(' · '))}</span><h1 class="ap-name">${esc(name)}</h1>
      ${nn?`<a class="ab-next" href="${root}pages/night.html#${nn.id}"><i></i>Next: ${esc(nn.d)}, ${esc(nn.t)}</a>`:`<span class="ab-next none">No date near you yet. Follow to hear first.</span>`}
      <p class="ap-line" data-line></p>
      <div class="ap-acts"><button class="btn two l" data-start>${EY2}<span class="lab">${ERAS.length>1?'Start here':'Play'}</span></button><button class="btn one m" data-follow="${esc(name)}" aria-pressed="false">${EY1}<span class="lab">Follow</span></button><a class="btn one m" href="#book">${EY1}<span class="lab">Book</span></a><button class="btn one m" data-share>${EY1}<span class="lab">Share</span></button></div>
      ${links.length?`<div class="ap-links">${links.map(([n,u])=>`<a href="${esc(u)}" target="_blank" rel="noopener">${n}</a>`).join('')}</div>`:''}</div>`;
    CCD.init($h);CCD.eyes.collect($h);
    /* eras as sleeves */
    $('.ap-eras',el).hidden=ERAS.length<2;
    $sl.innerHTML=ERAS.length<2?'':`<button class="ap-sl ap-band all" data-era="-1" aria-pressed="true"><i></i><b>Everything</b><span class="t-data faint">${RELS.length} RECORDS</span></button>`+
      ERAS.map((e,k)=>{const nr=RELS.filter(r=>r.era===k).length;return `<button class="ap-sl ap-band" data-era="${k}" aria-pressed="false" style="--ec:${COL(k)};--w:${Math.max(1,(e.to||new Date().getFullYear())-e.from+1)}"><i></i><b>${esc(e.label||e.sound.split(',')[0])}</b><span class="t-data faint">${e.from} TO ${e.to||'NOW'} · ${nr}</span></button>`}).join('');
    $$('.ap-sl',el).forEach(b=>b.addEventListener('click',()=>setEra(+b.dataset.era,'click')));
    drawPop();drawVids();drawPress();drawConn();drawFans();
    $('[data-start]',el).addEventListener('click',startHere);$('[data-share]',el).addEventListener('click',e=>share(e.currentTarget));
    const h=/era-(\d)/.exec(location.hash);setEra(h&&ERAS.length?Math.min(ERAS.length-1,+h[1]-1):-1,'init');
    el.classList.add('ready')}
  function setEra(k,from){era=k;el.style.setProperty('--ec',COL(k));$$('.ap-sl',el).forEach(b=>b.setAttribute('aria-pressed',+b.dataset.era===k));
    const line=$('[data-line]',el),ph=$('[data-photo]',el);
    if(k>=0){const e=ERAS[k];line.innerHTML=`<b>${e.from} to ${e.to||'now'}.</b> ${esc(e.sound)}.${e.src?` <span class="faint">${esc(e.src)}</span>`:''}`;if(ph&&PHOTOS.length)ph.src=PHOTOS[k%PHOTOS.length]}
    else{line.innerHTML=ERAS.length?esc(ERAS.map(e=>e.label||e.sound.split(',')[0]).join(', then ')):esc(A.bio?A.bio.split('. ')[0]+'.':(A.genres||[]).join(', '));if(ph&&PHOTOS.length)ph.src=PHOTOS[0]}
    drawRels();drawShows();
    if(from!=='focus'){const pool=RELS.filter(r=>k<0||r.era===k);const r=pool.filter(x=>x.dz).pop()||pool[pool.length-1];r&&setFocus(r,'era')}
    if(from==='click')history.replaceState(null,'','#'+slug+(k>=0?'&era-'+(k+1):''))}
  /* ---------- focus ---------- */
  function setFocus(r,from){focus=r;if(from==='tile'&&era>=0&&r.era!==era)setEra(r.era,'focus');$fo.style.setProperty('--ec',COL(r.era));
    $fo.innerHTML=`<div class="apf-art">${art(r,'big')}<span class="apf-rec" aria-hidden="true"></span></div><div class="apf-t"><span class="lbl">${esc(r.ty)}${r.y?' · '+r.y:''}${r.lab?' · '+esc(r.lab):''}</span><b class="apf-title">${esc(r.t)}</b>
      <div class="apf-acts">${r.dz||r.bc?`<button class="btn two m" data-fplay>${EY2}<span class="lab">${!r.dz?'Play on Bandcamp':'Play'}</span></button>`:''}${r.bc?`<a class="btn one s" href="${r.bc}" target="_blank" rel="noopener">${EY1}<span class="lab">Bandcamp</span></a>`:''}${r.dz?`<a class="btn one s" href="https://www.deezer.com/album/${r.dz}" target="_blank" rel="noopener">${EY1}<span class="lab">Deezer</span></a>`:''}</div>
      <ol class="apf-tracks"><li class="t-small mute">${r.dz?'Loading the tracklist':r.bc?'This one lives on Bandcamp.':`No streaming link on record for this one.${A.soundcloud?` <a href="${esc(A.soundcloud)}" target="_blank" rel="noopener">Hear them on SoundCloud</a>.`:''}`}</li></ol></div>`;
    CCD.eyes.collect($fo);const fp=$('[data-fplay]',$fo);fp&&fp.addEventListener('click',()=>playItem({r}));
    $$('.ap-rel',el).forEach(t=>t.classList.toggle('on',t.dataset.t===r.t));
    if(r.dz)dz.album(r.dz).then(al=>{if(focus!==r)return;const ts=(al.tracks&&al.tracks.data)||[];if(!r.lab&&al.label)r.lab=al.label;const ol=$('.apf-tracks',$fo);
        ol.innerHTML=ts.slice(0,12).map((t,i)=>`<li><button data-i="${i}"${t.preview?'':' disabled'}><span class="tr-n">${String(i+1).padStart(2,'0')}</span><b>${esc(t.title)}</b><span class="t-data faint">${Math.floor(t.duration/60)}:${String(t.duration%60).padStart(2,'0')}</span></button></li>`).join('')+(ts.length>12?`<li class="t-small faint">${ts.length-12} more on Deezer</li>`:'');
        $$('button',ol).forEach(b=>b.addEventListener('click',()=>{const t=ts[+b.dataset.i];playItem({r,track:t.title,preview:t.preview})}))})
      .catch(()=>{if(focus===r)$('.apf-tracks',$fo).innerHTML='<li class="t-small mute">The tracklist could not load.</li>'});
    if(!deck.isPlaying()){setNow({r});deck.reset()}}
  /* ---------- releases ---------- */
  function drawRels(){const list=RELS.filter(r=>(era<0||r.era===era)&&(type==='all'||r.ty===type)).slice().reverse();$('.ap-reln',el).textContent=`${list.length}${list.length!==RELS.length?' OF '+RELS.length:''}`;
    $rel.innerHTML=list.map(r=>`<button class="ap-rel shv${focus&&focus.t===r.t?' on':''}" data-t="${esc(r.t)}" style="--ec:${COL(r.era)}"><span class="shv-s"><span class="shv-rec" aria-hidden="true"></span>${art(r)}</span><span class="ap-rt"><b>${esc(r.t)}</b><span class="t-data faint">${esc(r.ty.toUpperCase())}${r.y?' · '+r.y:''}</span></span></button>`).join('')||'<p class="t-small mute">Nothing on record for these years.</p>';
    const ch=$('.ap-types',el);if(!ch.dataset.done){ch.dataset.done=1;const types=[...new Set(RELS.map(r=>r.ty))];ch.hidden=types.length<2;ch.innerHTML=['all',...types].map(v=>`<button class="chip" aria-pressed="${v===type}" data-v="${v}">${EY1}${v==='all'?'All':({Remix:'Remixes',Mix:'Mixes'}[v]||v+(v.endsWith('s')?'':'s'))}</button>`).join('');CCD.eyes.collect(ch)}}
  $('.ap-types',el).addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;type=b.dataset.v;$$('.chip',b.parentElement).forEach(x=>x.setAttribute('aria-pressed',x===b));drawRels()});
  $rel.addEventListener('click',e=>{const b=e.target.closest('.ap-rel');if(!b)return;const r=RELS.find(x=>x.t===b.dataset.t);setFocus(r,'tile');if(r.dz||r.bc)playItem({r})});
  /* ---------- shows ---------- */
  function drawShows(){const today=new Date().toISOString().slice(0,10);const up=GIGS.filter(g=>g.d>=today);
    const name=pretty(A.name).toLowerCase();const nights=(D.nights||[]).filter(n=>n.l.some(l=>l.toLowerCase().replace(/\s*\(live\)/,'')===name));
    $('.ap-up',el).innerHTML=nights.length||up.length?`<span class="lbl">Next</span>`+nights.map(n=>`<a class="ap-next" href="${root}pages/night.html#${n.id}"><img src="${root}assets/img/${n.img}.webp" alt=""><span><b>${esc(n.t)}</b><span class="t-small mute">${esc(n.d)}, ${esc(n.v)}, ${esc(n.c)}</span></span></a>`).join('')+up.map(g=>`<div class="ap-next"><span><b>${esc(g.e)}</b><span class="t-small mute">${g.d}, ${esc([g.v,g.c].filter(Boolean).join(', '))}</span></span></div>`).join('')
      :`<span class="lbl">Next</span><b class="t-h3">No dates announced</b><button class="btn one m" data-remind>${EY1}<span class="lab">Tell me when they play</span></button>`;
    const rm=$('[data-remind]',el);rm&&rm.addEventListener('click',()=>{CCD.done(rm,'We\'ll tell you');rm.classList.add('is-done')});CCD.eyes.collect($('.ap-up',el));
    const past=GIGS.filter(g=>g.d<today&&(era<0||g.era===era));$('.ap-showsn',el).textContent=past.length?`${past.length} shows on record, newest first`:'';
    $sh.innerHTML=past.slice(0,12).map(g=>{const d=new Date(g.d);return `<li><span class="t-data">${d.toLocaleString('en-GB',{month:'short'}).toUpperCase()} ${d.getFullYear()}</span><div><b>${g.src?`<a href="${esc(g.src)}" target="_blank" rel="noopener">${esc(g.e)}</a>`:esc(g.e)}</b><span class="t-small mute">${esc([g.v,g.c].filter(Boolean).join(', '))}${g.src?` · <a class="src" href="${esc(g.src)}" target="_blank" rel="noopener">${esc(host(g.src))}</a>`:''}</span></div><button class="btn one s" data-c="iwas" data-key="gig-${slug}-${g.d}">${EY1}<span class="lab">I was there</span></button></li>`}).join('');CCD.init($sh);
    $('#shows',el).hidden=!past.length&&!nights.length&&!up.length&&!GIGS.length&&false}
  /* ---------- popular, videos, press, connections, fans ---------- */
  async function drawPop(){const box=$('#popular',el);try{const r=await dz.artistTop(pretty(A.name));const rows=r.tracks.filter(t=>t.preview).slice(0,6);if(!rows.length)throw 0;
      $pop.innerHTML=rows.map((x,i)=>`<li><button data-i="${i}"><span class="tr-n">${String(i+1).padStart(2,'0')}</span><b>${esc(x.title)}</b><span class="t-small mute">${esc(x.album.title)}</span><span class="tr-wave" aria-hidden="true">${CCD.wave(x.title)}</span></button></li>`).join('');
      $$('button',$pop).forEach(b=>b.addEventListener('click',()=>{const x=rows[+b.dataset.i];const rr=RELS.find(q=>q.dz==x.album.id)||{t:x.album.title,ty:'Track',y:'',era:-1,dz:String(x.album.id),tr:x.title};playItem({r:rr,track:x.title,preview:x.preview})}));box.hidden=false}catch(e){box.hidden=true}}
  const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'').split('.')[0]}catch(e){return ''}};
  const PL={youtube:'YouTube',soundcloud:'SoundCloud',mixcloud:'Mixcloud',boilerroom:'Boiler Room',bandcamp:'Bandcamp',instagram:'Instagram'};
  const vcard=x=>`<a class="ap-vid" href="${esc(x.u)}" target="_blank" rel="noopener"><span class="ap-vth">${x.id?`<img src="https://img.youtube.com/vi/${x.id}/mqdefault.jpg" alt="" loading="lazy" onerror="this.remove()">`:`<span class="ap-vtile"><b>${esc(PL[host(x.u)]||host(x.u)||'Listen')}</b></span>`}<span class="ap-vpl" aria-hidden="true"></span></span><b>${esc(x.t)}</b><span class="t-data faint">${esc(({mix:'MIX',live_set:'LIVE SET',music_video:'VIDEO',interview:'INTERVIEW'}[x.k]||'').toString())}${x.u?' · '+esc((PL[host(x.u)]||host(x.u)).toUpperCase()):''}</span></a>`;
  function drawVids(){const mixes=VIDS.filter(x=>/mix|live|set|dj/i.test(x.k)&&x.u),vids=VIDS.filter(x=>!/mix|live|set|dj/i.test(x.k)&&x.id);
    const more=A.soundcloud?`<a class="seeall" href="${esc(A.soundcloud)}" target="_blank" rel="noopener">${EY1}<span class="lab">More on SoundCloud</span></a>`:'';
    $('#mixes',el).hidden=!mixes.length&&!more;$('.ap-mixes',el).innerHTML=mixes.slice(0,8).map(vcard).join('')||'<p class="t-small mute">No mixes on record yet.</p>';$('.ap-mixmore',el).innerHTML=more;CCD.eyes.collect($('#mixes',el));
    $('#watch',el).hidden=!vids.length;$vid.innerHTML=vids.slice(0,8).map(vcard).join('')}
  function drawPress(){$('#press',el).hidden=!PRESS.length;$pr.innerHTML=PRESS.slice(0,10).map(x=>`<li><span class="t-data faint">${(x.d||'').slice(0,4)}</span><a href="${esc(x.u)}" target="_blank" rel="noopener"><b>${esc(x.t)}</b><span class="mute t-small">${esc(x.p)}</span></a></li>`).join('')}
  function drawConn(){const by=k=>AFF.filter(a=>a.kind===k).map(a=>a.name);const groups=[['Labels',[...new Set([...(A.labels||[]),...by('label')])]],['Worked with',by('collaborator')],['Crews and bands',by('collective')]].filter(g=>g[1].length);
    $('#connections',el).hidden=!groups.length;$con.innerHTML=groups.map(([t,l])=>`<div><span class="lbl">${t}</span><div class="tags">${l.map(x=>{const hit=R.find(r=>CCD.norm(r[1])===CCD.norm(x));return hit?`<a href="#${hit[0]}" data-go>${esc(pretty(x))}</a>`:`<span>${esc(x)}</span>`}).join('')}</div></div>`).join('')}
  function drawFans(){const gs=new Set((A.genres||[]).map(x=>x.toLowerCase()));const f=R.filter(x=>x[0]!==slug&&x[4]&&x[3].some(g=>gs.has(g.toLowerCase()))).slice(0,6);const ff=f.length>=4?f:R.filter(x=>x[0]!==slug&&x[4]).slice(0,6);
    $fans.innerHTML=ff.map(x=>`<a class="acard" href="#${x[0]}" data-go><img src="${photo(x)}" alt="" loading="lazy"><b>${esc(pretty(x[1]))}</b><span class="t-data faint">${esc((x[2]||'').toUpperCase())}</span></a>`).join('')}
  
  /* ---------- player ---------- */
  const pl=$('.ap-player',el),rec=$('.ap-rec',pl),cov=$('.ap-cov',pl),pt=$('.ap-pt',pl),pp=$('.ap-pp',pl),src=$('.ap-src',pl),nxt=$('.ap-next-era',pl),prog=$('.ap-prog i',pl);
  const deck=CCD.deck(pl,rec,{load:()=>loadNow(),onPlay:on=>{pp.setAttribute('aria-pressed',on);pp.setAttribute('aria-label',on?'Pause':'Play');el.classList.toggle('is-playing',on)}});
  async function bufFor(it){const r=it.r;try{if(it.preview)return{b:await dz.buf(it.preview),real:1};if(!r.dz)throw 0;const al=await dz.album(r.dz);const ts=(al.tracks&&al.tracks.data)||[];const t=ts.find(x=>x.title===r.tr)||ts.find(x=>x.preview);if(!t||!t.preview)throw 0;it.track=t.title;return{b:await dz.buf(t.preview),real:1}}
    catch(e){return{b:await AU.artistLoop({id:'a-'+slug+(it.track||r.t),g:A.genres}),real:0}}}
  async function loadNow(){if(!now)setNow({r:focus||RELS.filter(x=>x.dz).pop()||RELS[0]||{t:A.name,ty:'',era:-1}});const it=now;pl.classList.add('loading');const o=await bufFor(it);pl.classList.remove('loading');it.real=o.real;paintNow();return o.b}
  function setNow(it){now=it;paintNow()}
  function paintNow(){if(!now)return;const r=now.r;cov.innerHTML=r.dz?`<img src="${dz.cover(r.dz,'small')}" alt="" onerror="this.remove()">`:'';pl.style.setProperty('--ec',COL(r.era));$('b',pt).textContent=now.track||r.tr||r.t;
    $('.t-data',pt).textContent=`${pretty(A.name).toUpperCase()} · ${String(r.t).toUpperCase()}${r.y?' · '+r.y:''}${now.real===0?' · PREVIEW COULD NOT LOAD, STAND-IN LOOP':now.real?' · 30 SEC PREVIEW':''}`;
    const bcOnly=!r.dz&&r.bc;src.textContent=bcOnly?'On Bandcamp':r.dz?'Deezer':'';src.href=bcOnly?r.bc:r.dz?`https://www.deezer.com/album/${r.dz}`:'#';src.hidden=!(r.dz||r.bc)}
  async function playItem(it){if(!it.r.dz&&it.r.bc&&!it.preview){setNow(it);window.open(it.r.bc,'_blank','noopener');return}setNow(it);pl.classList.add('loading');const o=await bufFor(it);pl.classList.remove('loading');it.real=o.real;paintNow();deck.setBuffer(o.b,true)}
  pp.addEventListener('click',()=>deck.toggle());
  (function pr_(){const p=parseFloat(getComputedStyle(pl).getPropertyValue('--prog'))||0;prog.style.width=(p*100).toFixed(1)+'%';requestAnimationFrame(pr_)})();
  function startHere(){if(ERAS.length>1){const k=0;setEra(k,'start');const r=RELS.filter(x=>x.era===k&&x.dz).pop()||RELS.find(x=>x.era===k);r&&(setFocus(r,'start'),playItem({r}))}else{const r=focus||RELS.filter(x=>x.dz).pop();r&&playItem({r})}}
  nxt.addEventListener('click',()=>{if(ERAS.length<2){const i=RELS.indexOf(now&&now.r);const r=RELS.filter(x=>x.dz)[(RELS.filter(x=>x.dz).indexOf(now&&now.r)+1)%Math.max(1,RELS.filter(x=>x.dz).length)];r&&(setFocus(r,'start'),playItem({r}));return}
    const cur=now?now.r.era:era;const k=((cur<0?-1:cur)+1)%ERAS.length;setEra(k,'start');const r=RELS.filter(x=>x.era===k&&x.dz).pop()||RELS.find(x=>x.era===k);r&&(setFocus(r,'start'),playItem({r}))});
  async function share(b){const url=location.href;try{if(navigator.share){await navigator.share({title:pretty(A.name),url});return}await navigator.clipboard.writeText(url);CCD.setLabel(b,'Link copied')}catch(e){CCD.setLabel(b,'Copy the address bar')}setTimeout(()=>CCD.setLabel(b,'Share'),2000)}
  addEventListener('hashchange',()=>{const s2=location.hash.replace('#','').split('&')[0].toLowerCase();if(s2&&s2!==slug&&R.some(x=>x[0]===s2))location.reload()});
  load()});

/* sleeves on their own (the lab card): pull one, the record slides out and the rail takes its colour */
def('sleeves',el=>{el.addEventListener('click',e=>{const b=e.target.closest('.ap-sl');if(!b)return;$$('.ap-sl',el).forEach(x=>x.setAttribute('aria-pressed',x===b));el.style.setProperty('--ec',b.style.getPropertyValue('--ec')||'var(--c-artists)')})});


/* ================= ARTIST PAGE (round 11): the live catscandance.com layout, in Opus =================
   artist.html#slug. An era rail on the left (phones: era cards in a row), the photo and the name big, the bio and actions,
   then Popular, Releases, Watch and listen, Shows, Press, Connections and Fans also like, with Upcoming, Book, nights
   with us and Photos on the side, and one player along the bottom. Pick an era and the whole page narrows to it and takes
   its colour. Data: data/a/<slug>.json (a snapshot shipped with the site), then the live database, then what we have. */
def('artist11',el=>{const root=el.dataset.root||'';const PH=()=>innerWidth<600;if(PH()){const d=$('.ar-more',el);d&&d.removeAttribute('open')}const R=(D.roster||[]);const dz=CCD.dz,AU=CCD.audio;
  const h0=decodeURIComponent(location.hash.replace('#','').split('&')[0]).toLowerCase();const slug=R.some(x=>x[0]===h0)?h0:(el.dataset.slug||'sandunes');
  const me=R.find(x=>x[0]===slug);const fb=JSON.parse(($('.ap-data',el)||{}).textContent||'{}');
  const rphoto=x=>x&&x[4]==='L'?`${root}assets/img/a-${x[0]}.webp`:(x&&x[4])||'';
  let A={},ERAS=[],RELS=[],GIGS=[],PRESS=[],VIDS=[],AFF=[],PHOTOS=[];let era=-1,type='all',focus=null,now=null,allRel=false,allShow=false,connTab=null;
  const Q=s=>$(s,el);const COLS=['nights','school','artists','host'];
  const COL=k=>k<0||ERAS.length<2?'var(--c-artists)':`var(--c-${COLS[k%COLS.length]})`;
  const eraOf=y=>{if(!ERAS.length||!y)return -1;const k=ERAS.findIndex(e=>y>=e.from&&(e.to==null||y<=e.to));return k<0?(y<ERAS[0].from?0:ERAS.length-1):k};
  const yrs=e=>`${e.from} to ${e.to||'now'}`;const sh=e=>`${String(e.from).slice(2)}–${e.to?String(e.to).slice(2):'now'}`.replace('–',' to ');
  const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'').split('.')[0]}catch(e){return ''}};
  const PL={youtube:'YouTube',youtu:'YouTube',soundcloud:'SoundCloud',mixcloud:'Mixcloud',boilerroom:'Boiler Room',bandcamp:'Bandcamp',instagram:'Instagram',open:'Spotify',spotify:'Spotify'};
  const ytId=u=>{const m=String(u||'').match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);return m?m[1]:null};
  const pretty=CCD.pretty;const TY=t=>({ep:'EP',lp:'Album',album:'Album',single:'Single',remix:'Remix',compilation:'Compilation',mix:'Mix'}[String(t||'').toLowerCase()]||(t?String(t)[0].toUpperCase()+String(t).slice(1):'Release'));
  const cov=(r,sz)=>r.dz?`<img src="${dz.cover(r.dz,sz||'medium')}" alt="" loading="lazy" onerror="this.remove()">`:'';
  const tile=r=>`<span class="ar-cv" style="--ec:${COL(r.era)}">${cov(r,'big')}<b>${esc(r.t)}</b></span>`;
  function take(j){const a=j.artist||{};A=a;ERAS=(j.eras||[]).map(e=>({from:e.from_year,to:e.to_year,label:e.label||'',sound:e.sound||'',src:e.source_name||''})).filter(e=>e.from);
    RELS=(j.rels||[]).map(r=>({t:r.title,ty:TY(r.release_type),y:r.year||(r.release_date?+String(r.release_date).slice(0,4):null),lab:r.label||'',bc:r.bandcamp_url||'',dz:r.deezer_album_id?String(r.deezer_album_id):'',tr:r.deezer_track_title||''}));
    GIGS=(j.gigs||[]).filter(g=>g.event_date).map(g=>({d:g.event_date,e:g.event_name,v:g.venue||'',c:g.city||'',src:g.source||''}));
    PRESS=(j.press||[]).map(x=>({d:x.date_published||'',p:x.publication||'',t:x.title,u:x.url}));
    VIDS=(j.vids||[]).filter(v=>v.url).map(v=>({id:ytId(v.url),t:v.title,k:v.kind||'',u:v.url}));AFF=j.aff||[];PHOTOS=(j.photos||[]).slice()}
  async function load(){let ok=false;
    try{const r=await fetch(`${root}data/a/${slug}.json`);if(r.ok){take(await r.json());ok=!!A.name}}catch(e){}
    if(!ok){try{const r=await fetch(`${root}data/artists.json`);if(r.ok){const all=await r.json();if(all[slug]){take(all[slug]);ok=!!A.name}}}catch(e){}}
    if(!ok){try{const [a]=await CCD.sb(`artists?slug=eq.${slug}&select=slug,name,based_city,genres,bio,instagram,spotify,soundcloud,website,photo_url,labels`);if(a){take({artist:a});ok=true}}catch(e){}}
    if(!ok&&fb.slug===slug){take(fb);ok=true}
    if(!ok)A={name:me?me[1]:slug,based_city:me?me[2]:'',genres:me?me[3]:[]};
    const lp=rphoto(me);if(lp&&me[4]==='L')PHOTOS.unshift(lp);else if(!PHOTOS.length&&(lp||A.photo_url))PHOTOS=[lp||A.photo_url];PHOTOS=[...new Set(PHOTOS)];
    if(!RELS.length){try{const ar=await dz.findArtist(pretty(A.name));if(ar){const al=await dz.jsonp('artist/'+ar.id+'/albums?limit=40');RELS=(al.data||[]).map(x=>({t:x.title,ty:TY(x.record_type),y:x.release_date?+x.release_date.slice(0,4):null,lab:'',bc:'',dz:String(x.id),tr:''}))}}catch(e){}}
    RELS.sort((a,b)=>(b.y||0)-(a.y||0));RELS.forEach(r=>r.era=eraOf(r.y));GIGS.forEach(g=>g.era=eraOf(+g.d.slice(0,4)));PRESS.forEach(p=>p.era=eraOf(+String(p.d).slice(0,4)||null));
    paint()}
  const name=()=>pretty(A.name||'');
  function paint(){const nm=name();document.title=nm+' · Cats Can Dance';const city=CCD.city(A.based_city||'');const g=(A.genres||[]).slice(0,3).join(', ');
    el.classList.toggle('noeras',ERAS.length<2);
    /* hero */
    Q('.ar-hph').innerHTML=PHOTOS[0]?`<img src="${PHOTOS[0]}" alt="${esc(nm)}" onerror="this.remove()">`:`<span class="ar-ini">${esc((nm[0]||'?').toUpperCase())}</span>`;
    Q('.ar-line').textContent=[city,g].filter(Boolean).join(' · ');Q('.ar-name').textContent=nm;
    /* bio and actions */
    const bio=A.bio||(ERAS.length?ERAS.map(e=>e.label||e.sound.split(',')[0]).join(', then ')+'.':'');Q('.ar-bt').textContent=bio;Q('.ar-bt').hidden=!bio;
    const links=[A.spotify&&['Spotify',A.spotify],A.soundcloud&&['SoundCloud',A.soundcloud],A.instagram&&['Instagram',/^http/.test(A.instagram)?A.instagram:'https://instagram.com/'+A.instagram.replace('@','')],A.website&&['Website',A.website],RELS.find(r=>r.bc)&&['Bandcamp',RELS.find(r=>r.bc).bc]].filter(Boolean);
    Q('.ar-acts').innerHTML=`<button class="btn two m" data-follow="${esc(nm)}" aria-pressed="false"><span class="lab">Follow</span></button><a class="btn one m" href="#book"><span class="lab">Book ${esc(nm)}</span></a>`;
    Q('.ar-links').innerHTML=links.map(([n,u])=>`<a href="${esc(u)}" target="_blank" rel="noopener">${n} ↗</a>`).join('');CCD.eyes.collect(Q('.ar-bio'));
    drawLatest();
    /* eras: the rail on desktop, cards on phones */
    rail();
    Q('.ar-bk').textContent='Book '+nm;Q('[data-askdate]').addEventListener('click',e=>{const o=Q('.ar-offer');o.hidden=!o.hidden;CCD.setLabel(e.currentTarget,o.hidden?'Ask for a date':'Close')});
    const ccd=(D.eps||[]).filter(x=>(x.l||[]).some(l=>CCD.norm(l)===CCD.norm(nm)));Q('.ar-ccd').innerHTML=ccd.length?`<span class="lbl">Played Cats Can Dance</span>`+ccd.map(x=>`<a href="${root}pages/episodes.html">Episode ${x.no} · ${esc(x.v)} ›</a>`).join(''):'';
    Q('.ar-photos').innerHTML=PHOTOS.length>1?`<span class="lbl">Photos</span><div>${PHOTOS.slice(0,6).map(u=>`<img src="${u}" alt="${esc(nm)}" loading="lazy" onerror="this.remove()">`).join('')}</div>`:'';
    drawPop();setEra(+((/era-(\d)/.exec(location.hash)||[])[1]||0)-1,'init');el.classList.add('ready')}
  /* eras: one thin line, each era as long as it lasted. Tap one and the page narrows to it and takes its colour. */
  function rail(){const box=Q('.ar-eras12');if(ERAS.length<2){box.hidden=true;return}box.hidden=false;const yr=new Date().getFullYear();const w=e=>Math.max(1,(e.to||yr)-e.from+1);
    box.innerHTML=`<div class="el-top"><span class="lbl">Their story, era by era</span><button class="el-all" data-era="-1" aria-pressed="true">All</button></div>`+
      `<div class="el-bar" role="group" aria-label="Eras">${ERAS.map((e,k)=>`<button data-era="${k}" aria-pressed="false" style="--ec:${COL(k)};flex:${w(e)} 1 0" aria-label="${esc(yrs(e)+', '+(e.label||e.sound.split(',')[0]))}"><i></i><span>${e.from}</span></button>`).join('')}<span class="el-end">now</span></div><p class="el-now" aria-live="polite"></p>`;
    box.addEventListener('click',e=>{const b=e.target.closest('[data-era]');if(b)setEra(+b.dataset.era,'click')})}
  function setEra(k,from){era=k;el.style.setProperty('--ec',COL(k));$$('[data-era]',el).forEach(b=>b.setAttribute('aria-pressed',+b.dataset.era===k));
    const e=ERAS[k];const ph=$('.ar-hph img',el);if(ph&&PHOTOS.length>1)ph.src=PHOTOS[Math.max(0,k)%PHOTOS.length];
    const nw=Q('.el-now');if(nw){const n=RELS.filter(r=>r.era===k).length;nw.innerHTML=e?`<b>${esc(e.label||e.sound.split(',')[0])}</b><span>${yrs(e)}${e.sound?' · '+esc(e.sound):''}${n?` · ${n} record${n>1?'s':''}`:''}</span>`:`<b>Every era</b><span>${esc(ERAS.map(x=>x.label||x.sound.split(',')[0]).join(', then '))}. Tap one to hear it.</span>`}
    drawRels();drawWatch();drawShows();drawPress();drawConn();drawFans();drawUp();drawMoments();
    if(from!=='focus'){const pool=RELS.filter(r=>k<0||r.era===k);const r=pool.find(x=>x.dz)||pool[0];if(r)setFocus(r,'era');else Q('.ar-focus').innerHTML=''}
    if(from==='click')history.replaceState(null,'','#'+slug+(k>=0?'&era-'+(k+1):''))}
  const show=(id,on)=>{const s=Q('#'+id);s.hidden=!on;return $('.ar-sb',s)};
  function setFocus(r,from){focus=r;if(from==='tile'&&era>=0&&r.era!==era)setEra(r.era,'focus');const f=Q('.ar-focus');f.style.setProperty('--ec',COL(r.era));
    f.innerHTML=`<div class="arf-a">${tile(r)}<span class="arf-rec" aria-hidden="true"></span></div><div class="arf-t"><span class="lbl">${esc(r.ty)}${r.y?' · '+r.y:''}${r.lab?' · '+esc(r.lab):''}</span><b>${esc(r.t)}</b>
      <div class="arf-b">${r.dz||r.bc?`<button class="btn two m" data-fp>${EY2}<span class="lab">${r.dz?'Play':'Play on Bandcamp'}</span></button>`:''}${r.dz?`<a class="btn one s" href="https://www.deezer.com/album/${r.dz}" target="_blank" rel="noopener">${EY1}<span class="lab">Deezer</span></a>`:''}${r.bc?`<a class="btn one s" href="${esc(r.bc)}" target="_blank" rel="noopener">${EY1}<span class="lab">Bandcamp</span></a>`:''}</div>
      <ol class="arf-tr"><li class="t-small mute">${r.dz?'Loading the tracklist':r.bc?'This one lives on Bandcamp.':'No streaming link on record for this one.'}</li></ol></div>`;
    CCD.eyes.collect(f);const fp=$('[data-fp]',f);fp&&fp.addEventListener('click',()=>playItem({r}));$$('.ar-rel',el).forEach(t=>t.classList.toggle('on',t.dataset.t===r.t));
    if(r.dz)dz.album(r.dz).then(al=>{if(focus!==r)return;const ts=(al.tracks&&al.tracks.data)||[];const ol=$('.arf-tr',f);
      ol.innerHTML=ts.slice(0,10).map((t,i)=>`<li><button data-i="${i}"${t.preview?'':' disabled'}><span>${String(i+1).padStart(2,'0')}</span><b>${esc(t.title)}</b><em>${Math.floor(t.duration/60)}:${String(t.duration%60).padStart(2,'0')}</em></button></li>`).join('');
      $$('button',ol).forEach(b=>b.addEventListener('click',()=>{const t=ts[+b.dataset.i];playItem({r,track:t.title,preview:t.preview})}))}).catch(()=>{if(focus===r)$('.arf-tr',f).innerHTML='<li class="t-small mute">The tracklist could not load here.</li>'});
    if(!deck.isPlaying()){now={r};paintNow();deck.reset()}}
  async function drawPop(){try{const r=await dz.artistTop(name());const rows=r.tracks.filter(t=>t.preview).slice(0,5);if(!rows.length)throw 0;const b=show('popular',true);
      b.innerHTML='<ol class="ar-pop">'+rows.map((x,i)=>`<li><button data-i="${i}"><span>${i+1}</span><img src="${x.album.cover_small||''}" alt="" onerror="this.style.visibility='hidden'"><b>${esc(x.title)}<em>${esc(x.album.title)}</em></b></button></li>`).join('')+'</ol>';
      $$('button',b).forEach(bt=>bt.addEventListener('click',()=>{const x=rows[+bt.dataset.i];const rr=RELS.find(q=>q.dz==x.album.id)||{t:x.album.title,ty:'Track',y:'',era:-1,dz:String(x.album.id)};playItem({r:rr,track:x.title,preview:x.preview})}))}catch(e){show('popular',false)}}
  function drawRels(){const pool=RELS.filter(r=>era<0||r.era===era);const types=[...new Set(RELS.map(r=>r.ty))];const list=pool.filter(r=>type==='all'||r.ty===type);
    const b=show('releases',RELS.length>0);if(!RELS.length)return;
    $('.ar-sn',Q('#releases')).innerHTML=types.length>1?`<span class="chips">${['all',...types].map(t=>`<button class="chip" aria-pressed="${t===type}" data-ty="${t}">${t==='all'?'All':({Remix:'Remixes',Mix:'Mixes',EP:'EPs'}[t]||t+'s')} ${pool.filter(r=>t==='all'||r.ty===t).length}</button>`).join('')}</span>`:'';
    b.innerHTML=`<div class="ar-rels">${(allRel?list:list.slice(0,PH()?6:12)).map(r=>`<button class="ar-rel${focus===r?' on':''}" data-t="${esc(r.t)}" style="--ec:${COL(r.era)}">${tile(r)}<span><b>${esc(r.t)}</b><em><i style="background:${COL(r.era)}"></i>${r.y||'Undated'} · ${esc(r.ty)}</em></span></button>`).join('')||'<p class="t-small mute">Nothing of this kind from these years.</p>'}</div>`+(list.length>(PH()?6:12)?`<button class="seeall" data-allrel>${EY1}<span class="lab">${allRel?'Fewer':'All '+list.length+' releases'}</span></button>`:'');
    CCD.eyes.collect(Q('#releases'))}
  el.addEventListener('click',e=>{const t=e.target.closest('[data-ty]');if(t){type=t.dataset.ty;drawRels();return}if(e.target.closest('[data-allrel]')){allRel=!allRel;drawRels();return}if(e.target.closest('[data-allshow]')){allShow=!allShow;drawShows();return}
    const c=e.target.closest('[data-conn]');if(c){connTab=c.dataset.conn;drawConn();return}const r=e.target.closest('.ar-rel');if(r){const x=RELS.find(q=>q.t===r.dataset.t);setFocus(x,'tile');if(x.dz||x.bc)playItem({r:x})}});
  function drawWatch(){const pool=VIDS;const b=show('watch',pool.length>0);if(!pool.length)return;$('.ar-sn',Q('#watch')).textContent=`${pool.length} videos and mixes`;
    const K=k=>({mix:'Mix',live_set:'Live set',music_video:'Video',interview:'Interview'}[k]||'Watch');const th=v=>v.id?`<img src="https://img.youtube.com/vi/${v.id}/mqdefault.jpg" alt="" loading="lazy" onerror="this.remove()">`:'';
    const f=pool.find(v=>v.id)||pool[0],rest=pool.filter(v=>v!==f).slice(0,10);
    b.innerHTML=`<a class="ar-wf" href="${esc(f.u)}" target="_blank" rel="noopener"><span class="ar-wt"><span class="ar-wb">${esc(PL[host(f.u)]||host(f.u)||'Watch')}</span>${th(f)}<i class="ar-wp"></i></span><span><span class="lbl">${K(f.k)}</span><b>${esc(f.t)}</b><em>${esc(PL[host(f.u)]||host(f.u))}</em></span></a>`+
      (rest.length?`<div class="ar-wr">${rest.map(v=>`<a href="${esc(v.u)}" target="_blank" rel="noopener"><span class="ar-wt"><span class="ar-wb">${esc(PL[host(v.u)]||host(v.u)||'Watch')}</span>${th(v)}<i class="ar-wp"></i></span><b>${esc(v.t)}</b><em>${K(v.k)} · ${esc(PL[host(v.u)]||host(v.u))}</em></a>`).join('')}</div>`:'')}
  function drawShows(){const today=new Date().toISOString().slice(0,10);const past=GIGS.filter(g=>g.d<today&&(era<0||g.era===era));const b=show('shows',past.length>0);if(!past.length)return;
    $('.ar-sn',Q('#shows')).textContent=`${past.length} past shows, newest first`;
    b.innerHTML=`<ol class="ar-shows">${(allShow?past:past.slice(0,8)).map(g=>{const d=new Date(g.d);return `<li><span class="ar-sd"><b><i style="background:${COL(g.era)}"></i>${d.getFullYear()}</b><em>${d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</em></span><span class="ar-st"><b>${g.src?`<a href="${esc(g.src)}" target="_blank" rel="noopener">${esc(g.e)}</a>`:esc(g.e)}</b><em>${esc([g.v,g.c].filter(Boolean).join(', '))}${g.src?' · '+esc(host(g.src)):''}</em></span><button class="btn one s" data-c="iwas" data-key="gig-${slug}-${g.d}">${EY1}<span class="lab">I was there</span></button></li>`}).join('')}</ol>`+(past.length>8?`<button class="seeall" data-allshow>${EY1}<span class="lab">${allShow?'Fewer':'All '+past.length+' shows'}</span></button>`:'');CCD.init(b)}
  function drawPress(){const p=PRESS.filter(x=>era<0||x.era===era);const b=show('press',p.length>0);if(!p.length)return;$('.ar-sn',Q('#press')).textContent=`${p.length} stories`;
    b.innerHTML=`<div class="ar-press">${p.slice(0,10).map(x=>`<a href="${esc(x.u)}" target="_blank" rel="noopener"><span class="lbl">${esc(x.p)}${x.d?' · '+String(x.d).slice(0,4):''}</span><b>${esc(x.t)} ↗</b></a>`).join('')}</div>`}
  function drawConn(){const by=k=>AFF.filter(a=>a.kind===k).map(a=>a.name);const LB={};RELS.forEach(r=>{if(!r.lab)return;const o=LB[r.lab]=LB[r.lab]||{n:0,a:9999,b:0};o.n++;if(r.y){o.a=Math.min(o.a,r.y);o.b=Math.max(o.b,r.y)}});const lbl=x=>{const o=LB[x];return o?`${x} · ${o.n} release${o.n>1?'s':''}${o.b?` · ${o.a===o.b?o.a:o.a+' to '+o.b}`:''}`:x};
    const tabs=[['labels','Labels',[...new Set([...Object.keys(LB).sort((a,b)=>LB[b].n-LB[a].n),...(Array.isArray(A.labels)?A.labels:String(A.labels||'').split(/\s*[,;]\s*/)).filter(Boolean),...by('label')])].map(lbl)],['worked','Worked with',by('collaborator')],['crews','Crews and bands',by('collective')],['fests','Festivals',by('festival')]].filter(t=>t[2].length);
    const b=show('connections',tabs.length>0);if(!tabs.length)return;if(!tabs.find(t=>t[0]===connTab))connTab=tabs[0][0];
    $('.ar-sn',Q('#connections')).innerHTML=`<span class="chips">${tabs.map(t=>`<button class="chip" data-conn="${t[0]}" aria-pressed="${t[0]===connTab}">${t[1]} ${t[2].length}</button>`).join('')}</span>`;
    b.innerHTML=`<div class="ar-conn">${tabs.find(t=>t[0]===connTab)[2].map(x=>{const hit=R.find(r=>CCD.norm(r[1])===CCD.norm(x));return hit?`<a href="#${hit[0]}">${hit[4]?`<img src="${rphoto(hit)}" alt="" onerror="this.remove()">`:''}<b>${esc(pretty(x))}</b><em>On Cats Can Dance ›</em></a>`:`<span><b>${esc(x)}</b></span>`}).join('')}</div>`}
  function drawFans(){const gs=new Set((A.genres||[]).map(x=>x.toLowerCase()));let f=R.filter(x=>x[0]!==slug&&x[4]==='L'&&x[3].some(g=>gs.has(g.toLowerCase())&&!/electronic/i.test(g)));if(f.length<4)f=R.filter(x=>x[0]!==slug&&x[4]==='L');
    const b=show('fans',f.length>0);b.innerHTML=`<div class="ar-fans">${f.slice(0,PH()?6:8).map(x=>{const sg=x[3].find(g=>gs.has(g.toLowerCase())&&!/electronic/i.test(g));return `<a href="#${x[0]}"><img src="${rphoto(x)}" alt="" loading="lazy"><b>${esc(pretty(x[1]))}</b><em>${esc(sg||CCD.city(x[2])||'')}</em></a>`}).join('')}</div>`}
  function drawUp(){const today=new Date().toISOString().slice(0,10);const nm=CCD.norm(name());const nights=(D.nights||[]).filter(n=>n.l.some(l=>CCD.norm(l.replace(/\s*\(live\)/i,''))===nm));const up=GIGS.filter(g=>g.d>=today);
    Q('.ar-up').innerHTML=`<b class="ar-bk">Playing next</b>`+(nights.length||up.length?nights.map(n=>`<a class="ar-un" href="${root}pages/night.html#${n.id}"><img src="${root}assets/img/${n.img}.webp" alt=""><span><b>${esc(n.t)}</b><em>${esc(n.d)}, ${esc(n.v)}, ${esc(n.c)}</em></span></a>`).join('')+up.map(g=>`<span class="ar-un"><span><b>${esc(g.e)}</b><em>${g.d}, ${esc([g.v,g.c].filter(Boolean).join(', '))}</em></span></span>`).join('')
      :`<p class="t-small mute">No dates announced. ${esc(name())}'s shows land here as soon as they're confirmed.</p>`)+`<button class="btn one m" data-remind2>${EY1}<span class="lab">Remind me when ${esc(name())} plays</span></button>`;
    const r=Q('[data-remind2]');r.addEventListener('click',()=>{CCD.done(r,'We\'ll tell you');r.classList.add('is-done')});CCD.eyes.collect(Q('.ar-up'))}

  function drawLatest(){const box=Q('.ar-latest');if(!box)return;const r=RELS.find(x=>x.y&&(x.dz||x.bc))||RELS[0];if(!r){box.innerHTML=`<span class="lbl17">Latest release</span><p class="t-small mute">No releases on record yet.</p>`;return}
    box.innerHTML=`<span class="lbl17">Latest release</span><div class="al17">${tile(r)}<div><b>${esc(r.t)}</b><span>${esc(r.ty)}${r.y?' · '+r.y:''}${r.lab?' · '+esc(r.lab):''}</span>${r.dz||r.bc?`<button class="btn two s" data-lp><span class="lab">${r.dz?'Play':'Play on Bandcamp'}</span></button>`:''}</div></div>`;
    const b=$('[data-lp]',box);b&&b.addEventListener('click',()=>{setFocus(r,'tile');playItem({r})})}
  let allMom=false;
  function drawMoments(){const pool=[...RELS.filter(r=>r.y).map(r=>({y:r.y,d:String(r.y),k:'Release',t:r.t,s:r.ty+(r.lab?' · '+r.lab:''),era:r.era,r})),...GIGS.map(g=>({y:+g.d.slice(0,4),d:g.d,k:'Show',t:g.e,s:[g.v,g.c].filter(Boolean).join(', '),era:g.era,u:g.src})),...PRESS.filter(p=>p.d).map(p=>({y:+String(p.d).slice(0,4),d:String(p.d),k:'Press',t:p.t,s:p.p,era:p.era,u:p.u}))].filter(m=>era<0||m.era===era).sort((a,b)=>b.d.localeCompare(a.d));
    const b=show('moments',pool.length>2);if(pool.length<3)return;$('.ar-sn',Q('#moments')).textContent=`${pool.length} moments${era>=0?' in this era':''}`;
    const fm=d=>d.length>4?new Date(d).toLocaleDateString('en-GB',{month:'short',year:'numeric'}):d;
    b.innerHTML=`<ol class="mo17">${(allMom?pool:pool.slice(0,8)).map(m=>`<li class="k-${m.k.toLowerCase()}" style="--ec:${COL(m.era)}"><span class="mo-d">${fm(m.d)}</span><i></i><span class="mo-t"><em>${m.k}</em>${m.u?`<a href="${esc(m.u)}" target="_blank" rel="noopener">${esc(m.t)}</a>`:m.r?`<button data-mr="${esc(m.t)}">${esc(m.t)}</button>`:`<b>${esc(m.t)}</b>`}<span>${esc(m.s||'')}</span></span></li>`).join('')}</ol>`+(pool.length>8?`<button class="more17" data-allmom>${allMom?'Fewer':'All '+pool.length+' moments'}${'<span class="arr" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8h10M9 4l4 4-4 4"/></svg></span>'}</button>`:'');
    $$('[data-mr]',b).forEach(x=>x.addEventListener('click',()=>{const r=RELS.find(q=>q.t===x.dataset.mr);if(r){setFocus(r,'tile');(r.dz||r.bc)&&playItem({r})}}));const am=$('[data-allmom]',b);am&&am.addEventListener('click',()=>{allMom=!allMom;drawMoments()})}
  /* the player along the bottom */
  const pl=Q('.ar-player'),rec=$('.ap-rec',pl),cv=$('.ap-cov',pl),pt=$('.ap-pt',pl),pp=$('.ap-pp',pl),src=$('.ap-src',pl),nx=$('.ap-next-era',pl),prog=$('.ap-prog i',pl);
  const deck=CCD.deck(pl,rec,{load:()=>loadNow(),onPlay:on=>{pp.setAttribute('aria-pressed',on);pp.setAttribute('aria-label',on?'Pause':'Play');el.classList.toggle('is-playing',on);pl.classList.add('on')}});
  async function bufFor(it){const r=it.r;try{if(it.preview)return{b:await dz.buf(it.preview),real:1};if(!r.dz)throw 0;const al=await dz.album(r.dz);const ts=(al.tracks&&al.tracks.data)||[];const t=ts.find(x=>x.title===r.tr)||ts.find(x=>x.preview);if(!t||!t.preview)throw 0;it.track=t.title;return{b:await dz.buf(t.preview),real:1}}
    catch(e){return{b:await AU.artistLoop({id:'a-'+slug+(it.track||r.t),g:A.genres}),real:0}}}
  async function loadNow(){if(!now)now={r:focus||RELS.find(x=>x.dz)||RELS[0]||{t:name(),ty:'',era:-1}};const it=now;pl.classList.add('loading');const o=await bufFor(it);pl.classList.remove('loading');it.real=o.real;paintNow();return o.b}
  function paintNow(){if(!now)return;const r=now.r;cv.innerHTML=cov(r,'small');pl.style.setProperty('--ec',COL(r.era));$('b',pt).textContent=now.track||r.tr||r.t;
    $('.t-data',pt).textContent=`${name().toUpperCase()} · ${String(r.t).toUpperCase()}${r.y?' · '+r.y:''}${now.real===0?' · PREVIEW BLOCKED HERE, OUR LOOP STANDS IN':now.real?' · 30 SEC PREVIEW':''}`;
    const bc=!r.dz&&r.bc;src.textContent=bc?'Bandcamp ↗':r.dz?'Deezer ↗':'';src.href=bc?r.bc:r.dz?`https://www.deezer.com/album/${r.dz}`:'#';src.hidden=!(r.dz||r.bc);nx.hidden=ERAS.length<2}
  async function playItem(it){if(!it.r.dz&&it.r.bc&&!it.preview){now=it;paintNow();window.open(it.r.bc,'_blank','noopener');return}now=it;paintNow();pl.classList.add('on','loading');const o=await bufFor(it);pl.classList.remove('loading');it.real=o.real;paintNow();deck.setBuffer(o.b,true)}
  pp.addEventListener('click',()=>deck.toggle());
  (function pr(){const p=parseFloat(getComputedStyle(pl).getPropertyValue('--prog'))||0;prog.style.width=(p*100).toFixed(1)+'%';requestAnimationFrame(pr)})();
  function startHere(){const k=0;setEra(k,'click');const r=RELS.filter(x=>x.era===k&&x.dz).pop()||RELS.find(x=>x.era===k);r&&(setFocus(r,'start'),playItem({r}))}
  nx.addEventListener('click',()=>{const cur=now?now.r.era:era;const k=((cur<0?-1:cur)+1)%ERAS.length;setEra(k,'click');const r=RELS.filter(x=>x.era===k&&x.dz).pop()||RELS.find(x=>x.era===k);r&&(setFocus(r,'start'),playItem({r}))});
  addEventListener('hashchange',()=>{const s2=location.hash.replace('#','').split('&')[0].toLowerCase();if(s2&&s2!==slug&&R.some(x=>x[0]===s2))location.reload()});
  load()});


/* ================= THE MAIN BUTTON IN REACH: on phones, once the hero has gone by, the page's main action sits above the tabs ================= */
document.addEventListener('DOMContentLoaded',()=>{const a=document.querySelector('.act12');if(!a)return;const h=document.querySelector('.h11h'),lk=a.querySelector('a'),t=lk.getAttribute('href')==='#try'?document.querySelector('#try'):null;let hv=true,tv=false;
  a.removeAttribute('aria-hidden');lk.removeAttribute('tabindex');const up=()=>a.classList.toggle('on',!hv&&!tv);
  h&&new IntersectionObserver(e=>{hv=e[0].isIntersecting;up()}).observe(h);t&&new IntersectionObserver(e=>{tv=e[0].isIntersecting;up()},{threshold:.12}).observe(t)});
document.addEventListener('DOMContentLoaded',()=>CCD.init());
})();
/* ===== round 15: things you can do right on the front page ===== */
CCD.def('going13',el=>{el.addEventListener('click',()=>{const on=el.getAttribute('aria-pressed')!=='true';el.setAttribute('aria-pressed',on);const l=el.querySelector('.lab');if(l)l.textContent=on?'Going ✓':"I'm going";
  try{const c=CCD.audio.ctx();if(c&&on){const g=c.createGain();g.gain.value=.5;g.connect(c.destination);CCD.audio.voice(c,g,'clap',c.currentTime)}}catch(e){}})});
CCD.def('miniinv',el=>{const i=el.querySelector('input'),b=el.querySelector('.mi13-card b'),n=el.querySelector('.mi13-card i');let k=0,tm=null;
  i.addEventListener('input',()=>{b.textContent=i.value.trim()||'Your party';clearTimeout(tm);tm=setTimeout(()=>{k=Math.min(k+1+Math.floor(Math.random()*3),40);n.textContent=k+' going';n.classList.remove('pop');void n.offsetWidth;n.classList.add('pop')},500)})});
CCD.def('minibeat',el=>{const cells=[...el.querySelectorAll('.mb13-g button')],play=el.querySelector('[data-play]'),names=['kick','clap','hat'];let tm=null,j=0;
  cells.forEach(c=>c.addEventListener('click',()=>{const on=c.getAttribute('aria-pressed')!=='true';c.setAttribute('aria-pressed',on);if(on&&!tm){const a=CCD.audio.ctx();if(a){const g=a.createGain();g.gain.value=.6;g.connect(a.destination);CCD.audio.voice(a,g,names[+c.dataset.r],a.currentTime)}}}));
  const stop=()=>{clearInterval(tm);tm=null;cells.forEach(c=>c.classList.remove('now'));play.setAttribute('aria-pressed','false');play.querySelector('.lab').textContent='Play'};
  play.addEventListener('click',()=>{if(tm)return stop();const a=CCD.audio.ctx();if(!a)return;const g=a.createGain();g.gain.value=.6;g.connect(a.destination);j=0;play.setAttribute('aria-pressed','true');play.querySelector('.lab').textContent='Stop';
    tm=setInterval(()=>{cells.forEach(c=>c.classList.toggle('now',+c.dataset.j===j));cells.filter(c=>+c.dataset.j===j&&c.getAttribute('aria-pressed')==='true').forEach(c=>CCD.audio.voice(a,g,names[+c.dataset.r],a.currentTime));j=(j+1)%8},60000/122/2)});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&tm)stop()})});
/* ===== round 16: on a phone, any row of four or more filter chips folds into one dropdown ===== */
(()=>{const PH=()=>innerWidth<600;const label=b=>{const c=b.querySelector('.cnt');let t=[...b.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim().replace(/\s+/g,' ');if(!t)t=b.textContent.trim().replace(/\s+/g,' ');return c?t.replace(c.textContent,'').trim()+' · '+c.textContent:t};
  const fold=g=>{const bs=[...g.querySelectorAll(':scope > button, :scope > .chip')];if(bs.length<4)return;let w=g._csel;
    if(!w||!w.isConnected){w=document.createElement('label');w.className='csel';const nm=g.getAttribute('aria-label')||'Filter';w.innerHTML=`<span class="vh">${CCD.esc(nm)}</span><select></select>`;g.before(w);g._csel=w;g.classList.add('csel-on');
      w.querySelector('select').addEventListener('change',e=>{const b=g.querySelectorAll(':scope > button, :scope > .chip')[+e.target.value];b&&b.click()})}
    const s=w.querySelector('select'),html=bs.map((b,i)=>`<option value="${i}"${b.getAttribute('aria-pressed')==='true'||b.getAttribute('aria-selected')==='true'?' selected':''}>${CCD.esc(label(b))}</option>`).join('');if(s._h!==html){s.innerHTML=html;s._h=html}};
  let tm=null;const scan=()=>{if(!PH())return;document.querySelectorAll('main .chips, main .pk-tabs').forEach(fold)};
  document.addEventListener('DOMContentLoaded',()=>{scan();new MutationObserver(()=>{clearTimeout(tm);tm=setTimeout(scan,60)}).observe(document.querySelector('main')||document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-pressed','aria-selected']})})})();

/* ===== round 17 ===== */
(()=>{const {$,$$}=CCD;

/* every page opens at the top, including artist-to-artist links that reload */
try{history.scrollRestoration='manual'}catch(e){}
addEventListener('pageshow',()=>{const h=decodeURIComponent(location.hash.slice(1));if(!h||!document.getElementById(h))scrollTo(0,0)});
/* one tap makes the invite */
document.addEventListener('click',e=>{const b=e.target.closest('[data-make]');if(!b)return;b.dispatchEvent(new CustomEvent('ccd:held',{bubbles:true}));CCD.done&&CCD.done(b,'Invite made')});
/* nights by day: tonight and tomorrow by name, past days hidden, city and day filters */
CCD.def('nights17',el=>{const lim=+el.dataset.limit||0;const today=new Date();today.setHours(0,0,0,0);const dd=s=>{const d=new Date(s+'T00:00:00');return Math.round((d-today)/864e5)};
  $$('.nd17',el).forEach(g=>{const n=dd(g.dataset.date);g.dataset.past=n<0?1:0;const b=$('.nd17-h b',g);if(n===0)b.textContent='Tonight · '+b.textContent;else if(n===1)b.textContent='Tomorrow · '+b.textContent});
  let city='all',day='all';const draw=()=>{let shown=0;$$('.nd17',el).forEach(g=>{let k=0;$$('.nr',g).forEach(r=>{const ok=g.dataset.past!=='1'&&(city==='all'||r.dataset.city===city)&&(day==='all'||/fri|sat|sun/.test(r.dataset.day))&&(!lim||shown<lim);r.hidden=!ok;if(ok){k++;shown++}});g.hidden=!k;const s=$('.nd17-h span',g);if(s)s.textContent=k+' night'+(k>1?'s':'')});$('.n17-e',el).hidden=shown>0};
  el.addEventListener('click',e=>{const c=e.target.closest('.c17 .chip');if(!c)return;const grp=c.parentElement;$$('.chip',grp).forEach(x=>x.setAttribute('aria-pressed',x===c));if(grp.classList.contains('nf-city'))city=c.dataset.v;else day=c.dataset.v;draw()});draw()});
/* artists on the home page: filter by sound, a short grid */
CCD.def('faces17',el=>{const n=()=>innerWidth<600?6:8;let s='all';const draw=()=>{let k=0;$$('.fa17',el).forEach(f=>{const ok=(s==='all'||f.dataset.g.includes(s))&&k<n();f.hidden=!ok;if(ok)k++})};
  el.addEventListener('click',e=>{const c=e.target.closest('.c17 .chip');if(!c)return;$$('.c17 .chip',el).forEach(x=>x.setAttribute('aria-pressed',x===c));s=c.dataset.v;draw()});draw()});

})();
