/* CCD object: the logo coin and its four forms (WebGL). Part of the Opus library. */
(()=>{
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const ms=n=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n));
const COL={shared:'#F2F1EE',nights:'#3B78FF',host:'#FFE600',artists:'#B6EF36',school:'#FF4D8D'};

const FS=`precision highp float;
uniform vec2 uC;uniform float uTime,uR,uShape,uSq,uSpin,uPulse,uHue,uKnob,uTex;uniform vec3 uA,uB,uBg;uniform sampler2D uLogo;
const float PI=3.14159265;
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);vec4 norm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
mat3 rY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
mat3 rX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
void mball(inout vec3 col,vec2 d,float r,float aa){float a=1.-smoothstep(1.-aa,1.+aa,r);if(a<=0.)return;float z=sqrt(max(0.,1.-min(r*r,1.)));vec3 n=vec3(d,z);mat3 Rm=rY(uSpin*.55)*rX(-.22);vec3 q=Rm*n;float lat=asin(clamp(q.y,-1.,1.));float lon=atan(q.z,q.x);float N=18.;float fr=(lat/PI+.5)*N;float row=floor(fr);float latc=((row+.5)/N-.5)*PI;float M=max(4.,floor(2.*N*cos(latc)+.5));float fc=(lon/(2.*PI)+.5)*M;float ci=floor(fc);float lonc=((ci+.5)/M-.5)*2.*PI;vec2 cell=vec2(fract(fc),fract(fr));float grout=smoothstep(0.,.09,min(min(cell.x,1.-cell.x),min(cell.y,1.-cell.y)));vec3 fq=vec3(cos(latc)*cos(lonc),sin(latc),cos(latc)*sin(lonc));vec3 fn=fq*Rm;vec3 rf=reflect(vec3(0.,0.,-1.),fn);float h=hash(vec2(row,ci));vec3 env=mix(vec3(.04,.045,.06),vec3(.5,.53,.6),smoothstep(-.7,.9,rf.y));vec3 L1=normalize(vec3(-.6,.7,.4)),L2=normalize(vec3(.7,.25,.6)),L3=normalize(vec3(.1,-.8,.5));float s1=pow(max(dot(rf,L1),0.),22.),s2=pow(max(dot(rf,L2),0.),30.),s3=pow(max(dot(rf,L3),0.),18.);vec3 c=env*(.55+.6*h);c+=uA*s1*3.2+vec3(1.)*s2*1.7+uB*s3*2.;c+=uA*.1*(.5+.5*h);float tw=step(.955,fract(h*17.+floor(uTime*3.+h*7.)*.371));c+=vec3(1.)*tw*.5;c*=.3+.7*grout;c*=.5+.5*z;col=mix(col,c,a);}
void stamp(inout vec3 col,vec2 d,float r,float ang,float aa){if(r>1.2)return;float ring=abs(r-.955)-.022;float m=1.-smoothstep(-aa,aa,ring);if(uTex>.5){vec2 uv=(rot(.22)*d)/.74*.5+.5;vec4 tx=texture2D(uLogo,vec2(uv.x,1.-uv.y));float lm=tx.r*tx.a*(1.-smoothstep(.7,.73,r));m=max(m,lm);}float da=fract(ang/(2.*PI)*44.+uSpin*.05);float dash=(1.-smoothstep(.022-aa,.022+aa,abs(r-.855)))*step(abs(da-.5),.3);float thin=1.-smoothstep(.004,.004+aa,abs(r-.76));m=max(m,max(dash,thin*.7));float ink=.62+.38*smoothstep(-.55,.25,snoise(vec3(d*4.5,2.)));ink*=.86+.14*snoise(vec3(d*38.,5.));col+=uA*exp(-max(ring,0.)*13.)*.16;col=mix(col,uA,m*ink);}
void record(inout vec3 col,vec2 d,float r,float ang,float aa){float a=1.-smoothstep(1.-aa,1.+aa,r);if(a<=0.)return;vec3 rc=vec3(.028,.028,.032);float g=sin(r*uR*1.1)*.5+.5;rc+=g*.02*smoothstep(.38,.42,r);float gaps=0.;gaps+=1.-smoothstep(0.,.005,abs(r-.52));gaps+=1.-smoothstep(0.,.005,abs(r-.64));gaps+=1.-smoothstep(0.,.005,abs(r-.76));gaps+=1.-smoothstep(0.,.005,abs(r-.87));rc*=1.-gaps*.65;float sheen=pow(abs(sin(ang+.75)),16.)+.55*pow(abs(sin(ang-.85)),28.);vec3 irid=mix(uA,uB,smoothstep(.45,.98,r));rc+=sheen*irid*.42*smoothstep(.38,.44,r)*(.55+.45*g);rc+=smoothstep(.965,.995,r)*.09;float lab=1.-smoothstep(.37-aa,.37+aa,r);vec2 luv=(rot(-uSpin)*d)/.36*.5+.5;vec3 lc=vec3(.94,.93,.9);if(uTex>.5){vec4 tx=texture2D(uLogo,vec2(luv.x,1.-luv.y));lc=mix(vec3(.02),tx.rgb,tx.a);}lc=mix(lc,uA,1.-smoothstep(.004,.012,abs(r-.36)));rc=mix(rc,lc,lab);rc=mix(rc,uBg,1.-smoothstep(.016-aa,.016+aa,r));col=mix(col,rc,a);}
void knob(inout vec3 col,vec2 d,float r,float ang,float aa){if(r>1.1)return;float a0=atan(d.x,d.y);float t=(a0+2.356)/4.712;float sweep=step(-.01,t)*step(t,1.01);float lit=step(t,uKnob+.012);float tk=abs(fract(t*20.+.5)-.5)/20.*4.712*r;float tick=(1.-smoothstep(.006,.006+aa,tk))*(1.-smoothstep(.032,.032+aa,abs(r-.955)))*sweep;col=mix(col,mix(vec3(.3),uA,lit),tick);float arc=(1.-smoothstep(.007,.007+aa,abs(r-.865)))*sweep;col=mix(col,mix(vec3(.17),uA,lit),arc);col+=uA*.1*lit*sweep*exp(-abs(r-.865)*26.);float shd=1.-smoothstep(.6,1.,length(d-vec2(.05,-.09)));col*=1.-.6*shd;float body=1.-smoothstep(.74-aa,.74+aa,r);vec2 dn=d/max(r,.001);float nl=dot(dn,normalize(vec2(-.5,.7)));float kn=.5+.5*sin(ang*80.);vec3 side=mix(vec3(.42,.41,.39),vec3(.78,.77,.74),kn)*(.5+.5*(nl*.5+.5));float capm=1.-smoothstep(.62-aa,.62+aa,r);float sheen=pow(abs(sin(ang-.95)),10.)*.55+pow(abs(sin(ang+.62)),22.)*.4;vec3 cap=vec3(.9,.89,.86)*(.8+.2*sheen);cap-=.07*smoothstep(.25,.62,r);cap+=.012*sin(r*uR*.9);vec3 kb=mix(side,cap,capm);float th=-2.356+4.712*uKnob;float al=dot(d,vec2(sin(th),cos(th))),pe=dot(d,vec2(cos(th),-sin(th)));float ind=(1.-smoothstep(.028-aa,.028+aa,abs(pe)))*smoothstep(.2-aa,.2+aa,al)*(1.-smoothstep(.56-aa,.56+aa,al));kb=mix(kb,uA,ind);col=mix(col,kb,body);}
void coin(inout vec3 col,vec2 d,float r,float ang,float aa){float a=1.-smoothstep(1.-aa,1.+aa,r);if(a<=0.)return;vec2 dn=d/max(r,.001);float nl=dot(dn,normalize(vec2(-.5,.7)));float sheen=pow(abs(sin(ang+.75+uSpin*.21)),10.)*.6+pow(abs(sin(ang-.9-uSpin*.13)),24.)*.5;float reed=.5+.5*sin(ang*150.);vec3 rim=mix(vec3(.13,.13,.15),vec3(.8,.8,.84),.5+.5*nl)*(.74+.26*reed);rim+=mix(uA,uB,.5+.5*sin(ang*2.+uHue))*sheen*.75;rim+=.2*(1.-smoothstep(0.,.012,abs(r-.985)))*max(nl,0.);vec2 uv=(rot(-uSpin)*d)/.92*.5+.5;vec3 face=vec3(.03,.03,.035);if(uTex>.5){vec4 tx=texture2D(uLogo,vec2(uv.x,1.-uv.y));face=mix(face,mix(vec3(.95,.94,.91),uA,.06),tx.r*tx.a);}face+=vec3(.06)*pow(abs(sin(ang+.75)),14.)*smoothstep(.2,.86,r);vec3 c=mix(face,rim,smoothstep(.885-aa,.885+aa,r));c=mix(c,mix(uA,uB,.5+.5*sin(uHue)),(1.-smoothstep(.003,.011,abs(r-.885)))*.9);col=mix(col,c,a);}
void main(){vec2 p=gl_FragCoord.xy;vec2 d0=(p-uC)/uR;float r0=length(d0);
  vec2 d=d0;d.x/=max(uSq,.03);float r=length(d);float ang=atan(d.y,d.x);float aa=1.5/uR;
  vec3 col=uBg;
  if(r<1.3){if(uShape<1.5)mball(col,d,r,aa);else if(uShape<2.5)stamp(col,d,r,ang,aa);else if(uShape<3.5)record(col,d,r,ang,aa);else if(uShape<4.5)knob(col,d,r,ang,aa);else coin(col,d,r,ang,aa);}
  float cov=1.-smoothstep(1.-aa,1.+aa,r);
  float glow=(.1+.05*uPulse)*exp(-r0*r0*2.4);
  vec3 g=uA*glow;
  gl_FragColor=vec4(col*cov+g*(1.-cov),cov);}`;
const SHAPE={ball:1,stamp:2,record:3,dial:4,coin:6};
const FNAME={coin:'Coin',ball:'Mirror ball',record:'Record',stamp:'Stamp',dial:'Dial'};
function hex3(h){h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.substr(i,2),16)/255)}
class Obj{
  constructor(cv,opt={}){this.opt=opt;this.cv=cv;this.hint=opt.hint||null;this.form=opt.form||'coin';this.next=null;this.col=hex3(opt.color||COL.shared);this.tcol=this.col.slice();this.sq=1;this.phase=0;this.spin=0;this.vel=RM?0:.35;this.knob=.6;this.t0=performance.now();this.on=true;
    const gl=cv.getContext('webgl',{premultipliedAlpha:true,alpha:true,antialias:false});this.gl=gl;if(!gl){cv.parentElement.classList.add('nogl');return}
    const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){console.error(gl.getShaderInfoLog(o));return null}return o};
    const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);gl.useProgram(pr);
    const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    this.U={};['uC','uTime','uR','uShape','uSq','uSpin','uPulse','uHue','uKnob','uTex','uA','uB','uBg','uLogo'].forEach(n=>this.U[n]=gl.getUniformLocation(pr,n));gl.uniform1f(this.U.uTex,0);
    const img=new Image();img.onload=()=>{const tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tx);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(k=>gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR));[gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(k=>gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE));gl.uniform1i(this.U.uLogo,0);gl.uniform1f(this.U.uTex,1)};img.src=(opt.root||'')+'assets/img/logo.png';
    new IntersectionObserver(es=>{this.on=es[0].isIntersecting}).observe(cv);
    let drag=null;cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,s:this.spin,moved:false};cv.setPointerCapture(e.pointerId)});
    cv.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>4)drag.moved=true;this.spin=drag.s+dx*.02;this.vel=dx*.002});
    cv.addEventListener('pointerup',()=>{if(drag&&!drag.moved)this.cycle();drag=null;if(!RM)this.vel=Math.max(.35,Math.abs(this.vel))});
    cv.parentElement.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.cycle()}});
  }
  cycle(){const order=['coin','ball','record','stamp','dial'];const i=(order.indexOf(this.next||this.form)+1)%order.length;const f=order[i];if(this.opt.onCycle)this.opt.onCycle(f);else this.to(f,COL[{coin:'shared',ball:'nights',record:'artists',stamp:'host',dial:'school'}[f]])}
  to(f,c){if(f===this.form&&!this.next){this.tcol=hex3(c);return}this.next=f;this.tcol=hex3(c);if(RM){this.form=f;this.next=null;this.col=this.tcol.slice();this.label();return}this.phase=performance.now()}
  label(){if(this.hint)this.hint.textContent=FNAME[this.form]+' · tap to flip'}
  frame(now){const gl=this.gl;if(!gl||!this.on)return;const cv=this.cv;const dpr=Math.min(2,devicePixelRatio||1);const w=Math.round(cv.clientWidth*dpr),h=Math.round(cv.clientHeight*dpr);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;gl.viewport(0,0,w,h)}
    if(this.next){const F=ms('--d-flip'),t=(now-this.phase)/F;if(t<.5){const k=t/.5;this.sq=Math.cos(k*Math.PI/2)}else{if(this.form!==this.next){this.form=this.next;this.label()}const k=Math.min(1,(t-.5)/.5);const sp=1+Math.sin(k*Math.PI)*.12*(1-k);this.sq=Math.sin(k*Math.PI/2)*sp;if(t>=1){this.next=null;this.sq=1}}}
    for(let i=0;i<3;i++)this.col[i]+=(this.tcol[i]-this.col[i])*.08;
    this.spin+=this.vel*(1/60);if(!RM&&Math.abs(this.vel)>.35)this.vel*=.97;
    this.knob=this.knobFix!=null?this.knobFix:RM?.6:.5+.35*Math.sin(now/1400);
    const U=this.U,ti=(now-this.t0)/1000;gl.uniform2f(U.uC,w/2,h/2);this.pulse=(this.pulse||0)*.9;gl.uniform1f(U.uR,Math.min(w,h)*.40*(1+.045*this.pulse));gl.uniform1f(U.uTime,ti);gl.uniform1f(U.uShape,SHAPE[this.form]);gl.uniform1f(U.uSq,this.sq);gl.uniform1f(U.uSpin,this.spin);gl.uniform1f(U.uPulse,this.pulse);gl.uniform1f(U.uHue,ti*.3);gl.uniform1f(U.uKnob,this.knob);
    const a=this.col;gl.uniform3f(U.uA,a[0],a[1],a[2]);gl.uniform3f(U.uB,.95,.94,.93);gl.uniform3f(U.uBg,12/255,13/255,15/255);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3)}
}

const all=new Set();const _c=Obj.prototype.constructor;
(function loop(now){all.forEach(o=>o.frame(now));requestAnimationFrame(loop)})(performance.now());
addEventListener('scroll',()=>{if(!RM)all.forEach(o=>o.spin+=.004)},{passive:true});
window.CCD=window.CCD||{};CCD.Obj=class extends Obj{constructor(cv,opt){super(cv,opt);all.add(this)}};CCD.COL=COL;
})();
