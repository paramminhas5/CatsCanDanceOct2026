exec(open('gen.py').read().split('# ---------------- A:')[0])
BASE="body{background:var(--ink);color:var(--cream)}"
covers=['eerie','sijya','or','anish','gandhi','lowvol','naya','suchi']

# I1 RECORD STORE: you are over the crate, one sleeve lifted out
sl=''.join('<div class="a" style="left:%dpx;top:%dpx;width:250px;height:250px;overflow:hidden;border:6px solid var(--ink);transform:rotate(%sdeg)"><img src="art/%s.jpg" style="width:100%%;height:100%%;object-fit:cover"></div>'%(-20+i*215,1010+(i%2)*14,[-2,1,-1,2,-1][i],covers[i]) for i in range(5))
wall=''.join('<img class="a" src="art/%s.jpg" style="left:%dpx;top:%dpx;width:160px;height:160px;object-fit:cover;filter:brightness(.45) saturate(.8);border:4px solid #0b1226">'%(covers[i%8],i*170-30,300+ (i%2)*8) for i in range(7))
page('I1', BASE+".glow{inset:0;background:radial-gradient(ellipse at 50% 18%,rgba(249,115,22,.45),transparent 60%)}.crate{left:-10px;top:1180px;width:1100px;height:200px;background:repeating-linear-gradient(90deg,#9a3412 0 120px,#7c2d12 120px 124px);border-top:10px solid var(--ink)}", """
<div class="a glow"></div>"""+wall+"""
<div class="a" style="left:0;top:470px;width:1080px;height:10px;background:var(--cream);opacity:.5"></div>
<div class="a" style="left:60px;top:0;width:6px;height:90px;background:var(--cream)"></div><div class="a" style="left:1014px;top:0;width:6px;height:90px;background:var(--cream)"></div>
<div class="a bowl" style="left:60px;top:90px;width:960px;background:var(--cream);color:var(--ink);border:8px solid var(--ink);box-shadow:12px 12px 0 var(--red);padding:22px 0 14px;text-align:center;font-size:92px">New arrivals</div>
<img class="a" src="art/nikki.jpg" style="left:190px;top:470px;width:700px;height:700px;object-fit:cover;border:10px solid var(--cream);box-shadow:22px 22px 0 rgba(2,6,23,.9);transform:rotate(-3deg)">
<div class="a bowl" style="left:760px;top:430px;width:200px;height:200px;border-radius:50%;background:var(--acid);color:var(--ink);display:flex;align-items:center;justify-content:center;text-align:center;font-size:44px;transform:rotate(12deg);border:6px solid var(--ink)">New<br>in</div>
"""+sl+"""
<div class="a crate"></div>
<div class="a" style="left:60px;top:1130px;width:520px;background:var(--cream);color:var(--ink);border:6px solid var(--ink);box-shadow:10px 10px 0 var(--acid);padding:16px 22px;transform:rotate(-2deg)">
 <div class="mono" style="font-size:20px;color:var(--red)">Staff pick</div>
 <div class="bowl" style="font-size:54px;margin-top:6px">Nikki Nair</div>
 <div class="mono" style="font-size:20px;margin-top:8px">Majestic Animals EP</div>
 <div class="mono" style="font-size:18px;margin-top:4px;opacity:.6">Hyperdub / 16 Oct</div></div>
<img class="a cutd" src="../assets/cats/cat-headphones.png" style="right:40px;top:1040px;width:300px;transform:rotate(5deg)">
<div class="a mono" style="left:54px;top:1305px;font-size:22px;color:var(--cream)">CCD Record Shop / Crate 01</div>
""")

# I2 GIG: LED wall, beams, DJ cat, crowd
beams=''.join('<div class="a" style="left:%dpx;top:-40px;width:260px;height:1100px;background:linear-gradient(180deg,%s,transparent 85%%);clip-path:polygon(45%% 0,55%% 0,100%% 100%%,0 100%%);transform-origin:50%% 0;transform:rotate(%sdeg);mix-blend-mode:screen;opacity:.55"></div>'%(x,c,r) for x,c,r in [(60,'#dc2626',-24),(280,'#2563eb',-9),(540,'#b6ef36',10),(760,'#dc2626',26)])
crowd=''
import random
random.seed(4)
for row,(y,col,sc) in enumerate([(1010,'#0b1226',.8),(1110,'#04070f',1.0)]):
    for i in range(-1,10):
        x=i*125+random.randint(-20,20)+(60 if row else 0); s=sc*random.uniform(.9,1.15); h=random.choice([0,0,1])
        crowd+='<div class="a" style="left:%dpx;top:%dpx;width:%dpx;height:%dpx;background:%s;border-radius:50%%"></div><div class="a" style="left:%dpx;top:%dpx;width:%dpx;height:400px;background:%s;border-radius:110px 110px 0 0"></div>'%(x+30,y,int(90*s),int(90*s),col,x-20,y+int(80*s),int(190*s),col)
        if h:
            crowd+='<div class="a" style="left:%dpx;top:%dpx;width:30px;height:120px;background:%s;border-radius:15px;transform:rotate(%sdeg)"></div>'%(x+int(150*s),y-70,col,random.choice([-12,14]))
        if random.random()<.5:
            crowd+='<div class="a" style="left:%dpx;top:%dpx;width:26px;height:44px;background:var(--acid);border-radius:4px;box-shadow:0 0 30px var(--acid)"></div>'%(x+int(135*s),y-140)
page('I2', BASE+".haze{inset:0;background:radial-gradient(ellipse at 50% 38%,rgba(37,99,235,.35),transparent 60%)}.scan{background:repeating-linear-gradient(0deg,rgba(2,6,23,.28) 0 3px,transparent 3px 7px)}", """
<div class="a haze"></div>"""+beams+"""
<div class="a mono" style="left:54px;top:48px;font-size:24px;color:var(--acid)">CCD Discover / Live</div>
<div class="a bowl" style="left:50px;top:90px;font-size:150px;text-shadow:10px 10px 0 var(--red)">Nikki Nair</div>
<div class="a" style="left:190px;top:330px;width:700px;height:420px;border:12px solid var(--cream);box-shadow:0 0 90px rgba(182,239,54,.35);overflow:hidden"><img src="art/nikki.jpg" style="width:100%;height:100%;object-fit:cover"><div class="a scan" style="inset:0"></div></div>
<div class="a" style="left:190px;top:770px;width:700px;display:flex;justify-content:space-between" class="mono"><span class="mono" style="font-size:26px;color:var(--acid)">Now playing</span><span class="mono" style="font-size:26px">Majestic Animals EP</span></div>
<img class="a" src="../assets/cat-dj-hero.png" style="left:340px;top:780px;width:400px;filter:drop-shadow(0 0 40px rgba(220,38,38,.6))">
<img class="a" src="../assets/disco-ball.png" style="left:860px;top:-20px;width:170px;filter:drop-shadow(8px 8px 0 var(--red))">
"""+crowd+"""
<div class="a mono" style="left:54px;top:1292px;font-size:24px;color:var(--cream)">Hyperdub &nbsp;/&nbsp; Out 16 Oct</div>
""")

# I3 LISTENING SESSION: lamp, speakers, turntable, rug
def speaker(x):
    return ('<div class="a" style="left:%dpx;top:560px;width:250px;height:560px;background:#1b2440;border:8px solid var(--cream);box-shadow:14px 14px 0 var(--ink)"></div>'
     '<div class="a" style="left:%dpx;top:610px;width:90px;height:90px;border-radius:50%%;background:var(--cream);border:8px solid var(--ink);margin-left:62px"></div>'
     '<div class="a" style="left:%dpx;top:740px;width:190px;height:190px;border-radius:50%%;background:repeating-radial-gradient(circle,#020617 0 10px,#334155 10px 14px);border:8px solid var(--cream);margin-left:32px"></div>')%(x,x,x)
arcs=''.join('<div class="a" style="left:%dpx;top:%dpx;width:%dpx;height:%dpx;border-radius:50%%;border:6px solid var(--acid);opacity:%s;clip-path:inset(0 0 0 50%%)"></div>'%(1080-40-r*2+ (0), 835-r, r*2, r*2, o) for r,o in [(120,.8),(200,.5),(280,.3)])
page('I3', BASE+".lamp{inset:0;background:radial-gradient(circle at 14% 18%,rgba(249,115,22,.6),transparent 46%)}", """
<div class="a lamp"></div>
<div class="a" style="left:96px;top:0;width:6px;height:150px;background:var(--cream)"></div>
<div class="a" style="left:30px;top:150px;width:140px;height:120px;background:var(--orange);border-radius:70px 70px 8px 8px;border:6px solid var(--ink);box-shadow:0 0 90px 40px rgba(249,115,22,.55)"></div>
<div class="a mono" style="right:54px;top:64px;font-size:34px;color:var(--acid);text-shadow:0 0 18px var(--acid);text-align:right;line-height:1.5">Listening<br>session 01</div>
<div class="a" style="left:0;top:520px;width:1080px;height:12px;background:var(--cream);opacity:.35"></div>
"""+speaker(40)+speaker(790)+"""
<img class="a" src="art/nikki.jpg" style="left:560px;top:610px;width:210px;height:210px;object-fit:cover;border:6px solid var(--cream);box-shadow:10px 10px 0 var(--red);display:none">
<div class="a" style="left:300px;top:840px;width:480px;height:290px;background:#1b2440;border:8px solid var(--cream);box-shadow:14px 14px 0 var(--ink)"></div>
<div class="a" style="left:330px;top:860px;width:250px;height:250px;border-radius:50%;background:repeating-radial-gradient(circle,#0c1226 0 3px,#04070f 3px 7px);border:6px solid var(--cream);box-shadow:8px 8px 0 var(--red)"></div>
<img class="a" src="art/nikki.jpg" style="left:402px;top:932px;width:106px;height:106px;object-fit:cover;border-radius:50%;border:5px solid var(--ink)">
<div class="a" style="left:640px;top:880px;width:12px;height:150px;background:var(--cream);border-radius:6px;transform:rotate(28deg);transform-origin:50% 0"></div>
<div class="a" style="left:612px;top:860px;width:64px;height:64px;border-radius:50%;background:var(--acid);border:6px solid var(--ink)"></div>
<div class="a" style="left:60px;top:150px;width:600px;opacity:0"></div>
<img class="a" src="art/nikki.jpg" style="left:350px;top:170px;width:380px;height:380px;object-fit:cover;border:10px solid var(--cream);box-shadow:16px 16px 0 var(--red);transform:rotate(-3deg)">
<div class="a" style="left:0;top:1180px;width:1080px;height:170px;background:repeating-linear-gradient(90deg,var(--red) 0 90px,var(--cream) 90px 100px,var(--ink) 100px 190px,var(--cream) 190px 200px)"></div>
<img class="a cutd" src="../assets/cats/cat-headphones.png" style="right:50px;top:960px;width:260px;transform:rotate(-4deg)">
<div class="a" style="left:54px;top:1230px;width:560px;background:var(--cream);color:var(--ink);border:6px solid var(--ink);box-shadow:10px 10px 0 var(--acid);padding:14px 22px">
 <div class="bowl" style="font-size:50px">Nikki Nair</div><div class="mono" style="font-size:20px;margin-top:8px">Majestic Animals EP / Hyperdub</div></div>
""")
