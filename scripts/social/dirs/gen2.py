exec(open('gen.py').read().split('# ---------------- A:')[0])
BASE="""
body{background:var(--ink);color:var(--cream)}
.top{left:54px;right:54px;top:48px;display:flex;justify-content:space-between;font-size:26px}
.top b{color:var(--acid)}
"""
# V1 The Sleeve: the cover is the post
page('V1', BASE, """
<img class="a" src="art/nikki.jpg" style="left:0;top:0;width:1080px;height:1080px;object-fit:cover">
<div class="a mono" style="left:40px;top:40px;font-size:24px;background:var(--ink);color:var(--cream);padding:8px 14px">CCD / Discover</div>
<div class="a mono" style="right:40px;top:44px;font-size:26px;background:var(--acid);color:var(--ink);padding:8px 16px;transform:rotate(4deg)">New record</div>
<div class="a" style="left:0;top:1080px;width:1080px;height:270px;background:var(--ink);border-top:10px solid var(--acid)"></div>
<div class="a bowl" style="left:44px;top:1124px;font-size:104px;color:var(--cream)">Nikki Nair</div>
<div class="a mono" style="left:48px;top:1244px;font-size:30px;color:var(--acid)">Majestic Animals EP</div>
<div class="a mono" style="left:48px;top:1292px;font-size:24px;color:var(--cream);opacity:.8">Hyperdub &nbsp;/&nbsp; Out 16 Oct</div>
<img class="a cutd" src="../assets/cats/cat-headphones.png" style="right:50px;top:960px;width:300px;transform:rotate(6deg)">
""")
# V2 Why it's here: taste and context, a CCD line on every pick
page('V2', BASE+".dots{inset:0;background-image:radial-gradient(circle,var(--red) 0 5px,transparent 6px);background-size:26px 26px;-webkit-mask-image:radial-gradient(ellipse at 100% 0%,#000 0,transparent 55%);mask-image:radial-gradient(ellipse at 100% 0%,#000 0,transparent 55%)}", """
<div class="a dots"></div>
<div class="a top mono"><span>CCD / Discover</span><b>Pick of the week</b></div>
<img class="a" src="art/nikki.jpg" style="left:54px;top:130px;width:520px;height:520px;object-fit:cover;border:10px solid var(--cream);box-shadow:18px 18px 0 var(--red);transform:rotate(-2.5deg)">
<img class="a cutd" src="../assets/cats/cat-cap.png" style="left:640px;top:170px;width:340px;transform:rotate(7deg)">
<div class="a mono" style="left:630px;top:560px;font-size:26px;line-height:1.7">Hyperdub<br><span style="color:var(--acid)">Out 16 Oct</span></div>
<div class="a bowl" style="left:50px;top:720px;font-size:150px">Nikki Nair</div>
<div class="a mono" style="left:54px;top:870px;font-size:34px;color:var(--acid)">Majestic Animals EP</div>
<div class="a" style="left:54px;top:960px;width:972px;background:var(--cream);color:var(--ink);border:6px solid var(--cream);box-shadow:14px 14px 0 var(--acid);padding:26px 32px 30px">
 <div class="mono" style="font-size:22px;color:var(--red)">Why it's here</div>
 <div style="font:700 38px/1.25 Grotesk;margin-top:12px">Chosen by CCD for the weirder side of the dancefloor. Play it loud, then tell us what you heard.</div>
</div>
<div class="a mono" style="left:54px;top:1292px;font-size:22px;opacity:.8">Save for your next set &nbsp;&bull;&nbsp; Send to a friend</div>
""")
# V3 Now playing: a player, so it feels like pressing play
page('V3', BASE+".disc{left:150px;top:110px;width:780px;height:780px;border-radius:50%;background:repeating-radial-gradient(circle at 50% 50%,#0c1226 0 3px,#050914 3px 7px);box-shadow:16px 16px 0 var(--red);border:8px solid var(--cream)}.sheen{left:150px;top:110px;width:780px;height:780px;border-radius:50%;background:conic-gradient(from 20deg,transparent 0 12%,rgba(255,255,255,.16) 18%,transparent 26% 62%,rgba(255,255,255,.12) 70%,transparent 78%)}", """
<div class="a top mono"><span>Now playing</span><b>CCD / Discover</b></div>
<div class="a disc"></div><div class="a sheen"></div>
<img class="a" src="art/nikki.jpg" style="left:360px;top:320px;width:360px;height:360px;border-radius:50%;object-fit:cover;border:8px solid var(--ink)">
<div class="a" style="left:520px;top:480px;width:40px;height:40px;border-radius:50%;background:var(--cream);border:6px solid var(--ink)"></div>
<img class="a cutd" src="../assets/cats/cat-headphones.png" style="left:30px;top:640px;width:270px;transform:rotate(-8deg)">
<div class="a mono" style="right:60px;top:790px;font-size:26px;background:var(--acid);color:var(--ink);padding:8px 16px;transform:rotate(-4deg)">New record</div>
<div class="a bowl" style="left:54px;top:945px;font-size:76px;white-space:nowrap">Majestic Animals EP</div>
<div class="a mono" style="left:56px;top:1040px;font-size:30px;color:var(--acid)">Nikki Nair</div>
<div class="a" style="left:54px;top:1112px;width:972px;height:14px;border-radius:7px;background:rgba(231,229,228,.25)"></div>
<div class="a" style="left:54px;top:1112px;width:370px;height:14px;border-radius:7px;background:var(--acid)"></div>
<div class="a" style="left:410px;top:1100px;width:38px;height:38px;border-radius:50%;background:var(--cream);border:6px solid var(--ink)"></div>
<div class="a mono" style="left:54px;top:1150px;font-size:22px;opacity:.8">Hyperdub</div><div class="a mono" style="right:54px;top:1150px;font-size:22px;opacity:.8">Out 16 Oct</div>
<div class="a" style="left:424px;top:1210px;width:120px;height:120px;border-radius:50%;background:var(--acid);border:6px solid var(--cream)"></div>
<div class="a" style="left:468px;top:1244px;border-left:48px solid var(--ink);border-block:26px solid transparent"></div>
<div class="a bowl" style="left:300px;top:1246px;font-size:50px">&laquo;</div><div class="a bowl" style="left:590px;top:1246px;font-size:50px">&raquo;</div>
""")
