import math
FONT = """
@font-face{font-family:Bowlby;src:url(../node_modules/@fontsource/bowlby-one/files/bowlby-one-latin-400-normal.woff2)}
@font-face{font-family:Grotesk;font-weight:500;src:url(../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2)}
@font-face{font-family:Grotesk;font-weight:700;src:url(../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2)}
@font-face{font-family:Mono;font-weight:700;src:url(../node_modules/@fontsource/space-mono/files/space-mono-latin-700-normal.woff2)}
:root{--ink:#020617;--cream:#e7e5e4;--paper:#f5f3ee;--red:#dc2626;--acid:#b6ef36;--blue:#2563eb;--orange:#f97316}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden}
body{position:relative;font-family:Grotesk,sans-serif}
.a{position:absolute}
.bowl{font-family:Bowlby;text-transform:uppercase;line-height:.88}
.mono{font-family:Mono;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.cut{filter:drop-shadow(4px 0 0 #fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0 -4px 0 #fff) drop-shadow(10px 10px 0 var(--ink))}
.cutd{filter:drop-shadow(4px 0 0 var(--cream)) drop-shadow(-4px 0 0 var(--cream)) drop-shadow(0 4px 0 var(--cream)) drop-shadow(0 -4px 0 var(--cream)) drop-shadow(10px 10px 0 var(--red))}
"""
def page(name, css, body):
    open(name+'.html','w').write('<!doctype html><meta charset=utf-8><style>'+FONT+css+'</style><body>'+body)

# sidechain envelope svg
def wave(w,h,color,beats=4,fill=True):
    pts=[]; n=400
    for i in range(n+1):
        t=i/n*beats; ph=t%1
        v=1-0.88*math.exp(-ph/0.22)
        pts.append((i/n*w, h-(v*h*0.9)))
    d='M0,%d '%h+' '.join('L%.1f,%.1f'%p for p in pts)+' L%d,%d Z'%(w,h)
    return '<svg width="%d" height="%d" viewBox="0 0 %d %d"><path d="%s" fill="%s" stroke="%s" stroke-width="6" stroke-linejoin="round"/></svg>'%(w,h,w,h,d,color if fill else 'none',color)

# ---------------- A: GIG POSTER (ink, huge type, sticker cat) ----------------
A_CSS = """
body{background:var(--ink);color:var(--cream)}
.dots{inset:0;background-image:radial-gradient(circle,var(--red) 0 5px,transparent 6px);background-size:26px 26px;-webkit-mask-image:radial-gradient(ellipse at 100% 0%,#000 0,transparent 62%);mask-image:radial-gradient(ellipse at 100% 0%,#000 0,transparent 62%);opacity:.9}
.top{left:54px;right:54px;top:54px;display:flex;justify-content:space-between;font-size:26px}
.top b{color:var(--acid)}
.stamp{border:5px solid var(--acid);color:var(--acid);padding:10px 20px;font-size:28px;transform:rotate(-6deg)}
"""
body = lambda x: x
page('A1', A_CSS, """
<div class="a dots"></div>
<div class="a top mono"><span>CCD / Discover</span><b>No. 01</b></div>
<img class="a" src="art/nikki.jpg" style="left:300px;top:150px;width:700px;height:700px;object-fit:cover;border:12px solid var(--cream);box-shadow:20px 20px 0 var(--red);transform:rotate(3.5deg)">
<div class="a bowl" style="left:44px;top:700px;font-size:262px;color:var(--cream);text-shadow:10px 10px 0 var(--ink)">Nikki<br>Nair</div>
<div class="a bowl" style="left:44px;top:1170px;font-size:56px;background:var(--acid);color:var(--ink);padding:16px 26px 8px;transform:rotate(-2deg)">Majestic Animals EP</div>
<div class="a mono" style="left:54px;top:1272px;font-size:26px;color:var(--cream)">Hyperdub &nbsp;/&nbsp; Out 16 Oct</div>
<img class="a cutd" src="../assets/cats/cat-cap.png" style="left:130px;top:150px;width:330px;transform:rotate(-8deg)">
<div class="a stamp mono" style="right:60px;top:1010px">New record</div>
""")
page('A2', A_CSS, """
<div class="a dots"></div>
<div class="a top mono"><span>CCD School / Lesson</span><b>No. 03</b></div>
<div class="a bowl" style="left:44px;top:150px;font-size:250px;color:var(--cream)">Duck<br>the<br><span style="color:var(--acid)">bass</span></div>
<div class="a" style="left:0;top:860px;width:1080px;height:310px;background:var(--cream);border-block:8px solid var(--acid)"></div>
<div class="a" style="left:40px;top:860px">"""+wave(1000,290,'#020617')+"""</div>
<div class="a mono" style="left:54px;top:1200px;font-size:26px;color:var(--cream)">Kick hits, bass gets out of the way.</div>
<div class="a mono" style="left:54px;top:1262px;font-size:26px;color:var(--acid)">Swipe for the 3 steps &rarr;</div>
<img class="a cutd" src="../assets/cats/cat-headphones.png" style="right:60px;top:200px;width:310px;transform:rotate(7deg)">
""")
page('A3', A_CSS+".sw{left:-40px;top:1010px;width:1200px;background:var(--acid);color:var(--ink);border-block:8px solid var(--ink);transform:rotate(-4deg);padding:14px 0;white-space:nowrap;font-size:78px}", """
<div class="a dots"></div>
<div class="a top mono"><span>CCD Nights / Episode 5</span><b>Humming Tree</b></div>
<img class="a" src="../assets/disco-ball.png" style="left:620px;top:90px;width:360px;filter:drop-shadow(12px 12px 0 var(--red))">
<div class="a bowl" style="left:30px;top:240px;font-size:520px;color:var(--cream);letter-spacing:-8px">25</div>
<div class="a bowl" style="left:30px;top:640px;font-size:520px;color:var(--red);letter-spacing:-8px;-webkit-text-stroke:0">11</div>
<div class="a sw bowl">Clear your Wednesday &nbsp;*&nbsp; Clear your Wednesday</div>
<img class="a cutd" src="../assets/cats/cat-handstand.png" style="right:70px;top:700px;width:300px;transform:rotate(-6deg)">
<div class="a mono" style="left:54px;top:1230px;font-size:26px;color:var(--cream)">Lineup next week</div>
<div class="a mono" style="left:54px;top:1278px;font-size:26px;color:var(--acid)">Follow so you don't miss it</div>
""")

# ---------------- B: ZINE / RECORD LABEL (cream paper, grid, tactile) ----------------
B_CSS = """
body{background:var(--paper);color:var(--ink)}
body:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(2,6,23,.07) 2px,transparent 2px),linear-gradient(90deg,rgba(2,6,23,.07) 2px,transparent 2px);background-size:54px 54px}
.frame{inset:30px;border:7px solid var(--ink)}
.bar{left:30px;right:30px;top:30px;height:74px;background:var(--ink);color:var(--paper);display:flex;align-items:center;justify-content:space-between;padding:0 28px;font-size:25px}
.bar b{color:var(--acid)}
.box{border:6px solid var(--ink);background:var(--paper);box-shadow:12px 12px 0 var(--ink)}
.row{display:flex;justify-content:space-between;border-bottom:4px solid var(--ink);padding:16px 0;font-size:26px}
.row span:first-child{opacity:.55}
"""
page('B1', B_CSS, """
<div class="a frame"></div>
<div class="a bar mono"><span>CCD Record Club</span><b>Pick 1 of 4</b></div>
<img class="a" src="art/nikki.jpg" style="left:84px;top:170px;width:560px;height:560px;object-fit:cover;border:7px solid var(--ink);box-shadow:16px 16px 0 var(--red)">
<div class="a box" style="left:690px;top:170px;width:310px;padding:6px 24px;box-shadow:12px 12px 0 var(--acid)">
 <div class="row mono"><span>Artist</span></div><div class="mono" style="font-size:30px;padding:10px 0 16px">Nikki Nair</div>
 <div class="row mono"><span>Label</span></div><div class="mono" style="font-size:30px;padding:10px 0 16px">Hyperdub</div>
 <div class="mono" style="font-size:24px;padding:12px 0 12px;opacity:.55">Out</div><div class="mono" style="font-size:30px;padding:0 0 16px">16 Oct</div>
</div>
<img class="a cut" src="../assets/cats/cat-headphones.png" style="left:720px;top:560px;width:250px;transform:rotate(6deg)">
<div class="a bowl" style="left:84px;top:790px;font-size:118px;line-height:.92">Majestic<br>Animals EP</div>
<div class="a" style="left:84px;top:1110px;width:912px;border-top:7px solid var(--ink);padding-top:22px;display:flex;justify-content:space-between;font-size:25px" ><span class="mono">New this week</span><span class="mono" style="background:var(--acid);padding:6px 14px">Send to a friend who'd love it</span></div>
<div class="a mono" style="left:84px;top:1200px;font-size:22px;opacity:.55">catscandance.com</div>
""")
page('B2', B_CSS, """
<div class="a frame"></div>
<div class="a bar mono"><span>CCD School / Worksheet</span><b>Lesson 03</b></div>
<div class="a bowl" style="left:84px;top:150px;font-size:124px">Sidechain<br>in 3 steps</div>
<div class="a box" style="left:84px;top:560px;width:912px;height:300px;padding:10px;box-shadow:14px 14px 0 var(--red)">"""+wave(890,270,'#2563eb')+"""
 <div class="a mono" style="left:20px;top:14px;font-size:22px">Bass volume over 4 beats</div></div>
<div class="a" style="left:84px;top:920px;width:912px;display:grid;grid-template-columns:repeat(3,1fr);gap:22px">
 <div class="box" style="padding:20px"><div class="bowl" style="font-size:90px;color:var(--red)">1</div><div class="mono" style="font-size:22px;margin-top:10px">Put a compressor on the bass</div></div>
 <div class="box" style="padding:20px"><div class="bowl" style="font-size:90px;color:var(--blue)">2</div><div class="mono" style="font-size:22px;margin-top:10px">Feed it the kick</div></div>
 <div class="box" style="padding:20px"><div class="bowl" style="font-size:90px;color:var(--ink)">3</div><div class="mono" style="font-size:22px;margin-top:10px">Set the release</div></div>
</div>
<img class="a cut" src="../assets/cats/cat-cap.png" style="right:70px;top:1150px;width:200px;transform:rotate(8deg)">
<div class="a mono" style="left:84px;top:1240px;font-size:24px;background:var(--acid);padding:8px 16px">Save this for your next session</div>
""")
page('B3', B_CSS, """
<div class="a frame"></div>
<div class="a bar mono"><span>CCD Nights</span><b>Admit one</b></div>
<div class="a" style="left:84px;top:170px;width:912px;height:760px;background:var(--cream);border:7px solid var(--ink);box-shadow:16px 16px 0 var(--ink);transform:rotate(-1.5deg)">
 <div class="a bowl" style="left:40px;top:40px;font-size:130px;color:var(--red)">Episode</div>
 <div class="a bowl" style="left:40px;top:150px;font-size:520px;line-height:.8">05</div>
 <div class="a" style="right:230px;top:0;bottom:0;border-left:6px dashed var(--ink)"></div>
 <div class="a mono" style="right:44px;top:70px;font-size:26px;writing-mode:vertical-rl;transform:rotate(180deg);height:620px">Clear your Wednesday</div>
 <div class="a mono" style="left:40px;bottom:50px;font-size:34px">Wed 25.11 &nbsp;/&nbsp; Humming Tree</div>
</div>
<img class="a cut" src="../assets/cats/cat-handstand.png" style="right:70px;top:960px;width:250px;transform:rotate(-7deg)">
<div class="a bowl" style="left:84px;top:1010px;font-size:96px">Lineup<br>next week</div>
<div class="a mono" style="left:84px;top:1240px;font-size:24px;background:var(--acid);padding:8px 16px">Follow so you don't miss it</div>
""")

# ---------------- C: COLOUR FIELD (one flat colour, one giant word, almost no clutter) ----------------
C_CSS = """
.sm{font-size:26px}
.corner{left:54px;top:54px;right:54px;display:flex;justify-content:space-between}
"""
page('C1', C_CSS+"body{background:var(--blue);color:var(--cream)}", """
<div class="a corner mono sm"><span>CCD</span><span>Discover</span></div>
<div class="a bowl" style="left:-40px;top:120px;font-size:300px;color:var(--cream);letter-spacing:-6px;white-space:nowrap">Nikki</div>
<div class="a bowl" style="left:-40px;top:400px;font-size:300px;color:var(--ink);letter-spacing:-6px;white-space:nowrap">Nair</div>
<img class="a" src="art/nikki.jpg" style="left:54px;top:760px;width:480px;height:480px;object-fit:cover;border:8px solid var(--cream);box-shadow:14px 14px 0 var(--ink)">
<div class="a" style="left:590px;top:790px">
 <div class="mono" style="font-size:34px;color:var(--acid)">New record</div>
 <div class="bowl" style="font-size:64px;margin-top:16px">Majestic<br>Animals EP</div>
 <div class="mono sm" style="margin-top:22px">Hyperdub &nbsp;/&nbsp; 16 Oct</div></div>
<img class="a cut" src="../assets/cats/cat-headphones.png" style="right:40px;top:1060px;width:230px;transform:rotate(-10deg)">
""")
page('C2', C_CSS+"body{background:var(--acid);color:var(--ink)}", """
<div class="a corner mono sm"><span>CCD School</span><span>Lesson 03</span></div>
<div class="a bowl" style="left:-30px;top:110px;font-size:330px;letter-spacing:-6px;white-space:nowrap">Duck</div>
<div class="a" style="left:0;top:470px">"""+wave(1080,400,'#020617')+"""</div>
<div class="a bowl" style="left:54px;top:900px;font-size:140px;white-space:nowrap">the bass</div>
<div class="a mono sm" style="left:54px;top:1190px">Kick hits, bass gets out of the way.</div>
<div class="a mono sm" style="left:54px;top:1240px;background:var(--ink);color:var(--acid);padding:8px 16px">3 steps &rarr; swipe</div>
<img class="a cut" src="../assets/cats/cat-cap.png" style="right:30px;top:1020px;width:270px;transform:rotate(9deg)">
""")
page('C3', C_CSS+"body{background:var(--red);color:var(--cream)}", """
<div class="a corner mono sm"><span>CCD Nights</span><span>Humming Tree</span></div>
<div class="a bowl" style="left:-30px;top:110px;font-size:760px;letter-spacing:-18px;white-space:nowrap">25</div>
<div class="a bowl" style="left:-30px;top:640px;font-size:760px;letter-spacing:-18px;color:var(--ink);white-space:nowrap">11</div>
<img class="a" src="../assets/disco-ball.png" style="right:30px;top:90px;width:250px;filter:drop-shadow(10px 10px 0 var(--ink))">
<div class="a bowl" style="left:54px;top:1150px;font-size:70px">Clear your Wednesday</div>
<div class="a mono sm" style="left:54px;top:1262px;color:var(--acid)">Episode 5 &nbsp;/&nbsp; Lineup next week</div>
<img class="a cut" src="../assets/cats/cat-handstand.png" style="right:30px;top:830px;width:260px;transform:rotate(-8deg)">
""")
