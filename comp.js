/* Components, batch A part 1: eye buttons. Needs lab.js. */
(()=>{
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const css=getComputedStyle(document.documentElement);
const ms=n=>parseFloat(css.getPropertyValue(n));
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const EY2='<span class="eyes"><i class="eye"></i><i class="eye"></i></span>';
const EY1='<span class="eyes xs"><i class="eye"></i><i class="eye"></i></span>';

/* ---------- state strips ---------- */
const TWO=[
  ['rest','','I\'m going','Round pupils. It watches your pointer and blinks now and then.'],
  ['hover','is-hover','I\'m going','Pupils narrow to slits. It\'s ready.'],
  ['focus','is-focus','I\'m going','Keyboard focus: eyes go wide and look straight at you, inside the ring.'],
  ['pressed','is-pressed','I\'m going','A squint for the moment your finger is down.'],
  ['loading','is-loading','Saving','Pupils go wide and chase something only it can see.'],
  ['done','is-done','You\'re going','A slow blink, then half-closed. Cats blink slowly at people they trust.'],
  ['error','is-error','Try again','Slits and a short hiss. The line underneath says what went wrong.'],
  ['disabled','is-disabled','Book','Asleep. Reach for it and the eyes peek open while the reason appears.']
];
const ONE=[
  ['rest','','Share','The eye is the dot. Round pupil.'],
  ['hover','is-hover','Share','Slit, and the outline turns ink.'],
  ['focus','is-focus','Share','Wide eye, looking at you.'],
  ['pressed','is-pressed','Share','Squint.'],
  ['on','is-on','Saved','A toggle that\'s on: ink fill, the eye flips to ink on black.'],
  ['loading','is-loading','Saving','Pupil circles the eye.'],
  ['error','is-error','Try again','Slit and a hiss.'],
  ['disabled','is-disabled','Save','Asleep, with the reason one reach away.']
];
const SEE=[
  ['rest','','Round eye, count in mono.'],
  ['hover','is-hover','The arrow slides out and the eye turns to look at it.'],
  ['focus','is-focus','Ring, arrow showing, eye wide.'],
  ['pressed','is-pressed','A small press.'],
  ['empty','is-empty','Nothing to see yet. It says so, and the eye looks down.']
];
const tile=(k,inner,txt)=>`<div class="st"><div class="bx">${inner}</div><span class="k">${k}</span><p>${txt}</p></div>`;
$('#st-two').innerHTML=TWO.map(([k,c,l,t])=>tile(k,`<span class="btn two m ${c}" ${c==='is-disabled'?'aria-disabled="true"':''}>${EY2}<span class="lab">${l}</span></span>`,t)).join('');
$('#st-one').innerHTML=ONE.map(([k,c,l,t])=>tile(k,`<span class="btn one m ${c}">${EY1}<span class="lab">${l}</span></span>`,t)).join('');
$('#st-see').innerHTML=SEE.map(([k,c,t])=>tile(k,`<span class="seeall ${c}">${EY1}<span class="lab">${c==='is-empty'?'None yet':'All nights'}</span>${c==='is-empty'?'':'<span class="cnt">17</span><span class="arr"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8h10M9 4l4 4-4 4"/></svg></span>'}</span>`,t)).join('');
// focus tiles also get the slit-off look; error tiles hiss now and then so the behaviour is visible
setInterval(()=>{if(RM)return;$$('.st .is-error').forEach(b=>{b.classList.remove('is-hiss');void b.offsetWidth;b.classList.add('is-hiss')})},3200);
// done tiles slow-blink now and then
setInterval(()=>{if(RM)return;$$('.st .is-done,.mood.is-done').forEach(b=>{b.classList.remove('is-blink');void b.offsetWidth;b.classList.add('is-blink')})},4200);
// disabled tiles peek now and then
setInterval(()=>{$$('.st .is-disabled,.mood.is-disabled').forEach(b=>peek(b))},5200);
CCD.eyes.collect();

function peek(b){CCD.peek(b)}
/* ---------- toggles ---------- */
$$('[data-toggle]').forEach(b=>{b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>{const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);$('.lab',b).textContent=on?'Saved':'Save'})});
const fail=$('#failToggle');fail.addEventListener('click',()=>fail.setAttribute('aria-pressed',fail.getAttribute('aria-pressed')!=='true'));

/* ---------- the live two-eye button ---------- */
const go=$('#liveGo'),gm=$('#goMsg');let busy=false;
const setLab=(b,t)=>{const l=$('.lab',b);l.style.opacity=0;setTimeout(()=>{l.textContent=t;l.style.opacity=1},ms('--d-quick'))};
go.addEventListener('click',()=>{
  if(busy)return;
  if(go.classList.contains('is-done')){go.classList.remove('is-done','is-blink');setLab(go,go.dataset.label);gm.textContent='';return}
  busy=true;go.classList.add('is-loading');go.setAttribute('aria-busy','true');setLab(go,go.dataset.busy);gm.textContent='';
  setTimeout(()=>{
    go.classList.remove('is-loading');go.removeAttribute('aria-busy');busy=false;
    if(fail.getAttribute('aria-pressed')==='true'){
      fail.setAttribute('aria-pressed','false');
      go.classList.add('is-error');go.classList.remove('is-hiss');void go.offsetWidth;go.classList.add('is-hiss');setLab(go,'Try again');
      gm.classList.remove('quiet');gm.textContent='That didn\'t go through. Nothing was saved.';
      setTimeout(()=>{go.classList.remove('is-error','is-hiss');setLab(go,go.dataset.label);gm.textContent=''},3000);
    }else{
      go.classList.add('is-done','is-blink');setLab(go,go.dataset.done);
      gm.classList.add('quiet');gm.textContent='You\'re on the list for Somad Lab. Tap again to undo.';
      setTimeout(()=>go.classList.remove('is-blink'),ms('--d-scene'));
    }
  },1300);
});

/* ---------- small things ---------- */
const wn=$('#worldNote');const names={shared:'shared, ink and eyeshine',nights:'Nights',host:'Host',artists:'Artists',school:'School'};
new MutationObserver(()=>{const w=['nights','host','artists','school'].find(k=>document.body.classList.contains('w-'+k))||'shared';wn.textContent='Wearing: '+names[w]+'. Change it in the bar.'}).observe(document.body,{attributes:true,attributeFilter:['class']});
wn.textContent='Wearing: '+names.shared+'. Change it in the bar.';
$('.cx .toc').addEventListener('click',e=>{const b=e.target.closest('[data-to]');if(b)document.getElementById(b.dataset.to).scrollIntoView({behavior:RM?'auto':'smooth'})});
// the mood board: loading chases, error hisses
setInterval(()=>{if(RM)return;const m=$('.mood.is-error .eyes');if(m){m.classList.remove('is-hiss');void m.offsetWidth;m.classList.add('is-hiss')}},3600);
})();
