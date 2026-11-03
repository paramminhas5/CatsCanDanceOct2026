# SVG diagrams for Learn posts. Dark panel, brand colours.
INK='#020617'; CREAM='#e7e5e4'; ACID='#b6ef36'; RED='#dc2626'; BLUE='#2563eb'
F="font-family:Mono,monospace;font-weight:700"

def sidechain():
    W,H=960,380; s=[f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg"><rect width="{W}" height="{H}" fill="{INK}"/>']
    s.append(f'<text x="30" y="50" fill="{ACID}" style="{F};font-size:24px">KICK</text>')
    beats=[110,320,530,740]
    for x in beats: s.append(f'<rect x="{x}" y="70" width="60" height="60" fill="{ACID}"/>')
    s.append(f'<text x="30" y="200" fill="{CREAM}" style="{F};font-size:24px">BASS</text>')
    pts=[]
    for i,x in enumerate(beats):
        nxt = beats[i+1] if i+1<len(beats) else 950
        pts += [(x,215),(x+8,330),(x+40,300),(x+90,240),(min(x+140,nxt),218),(nxt-2,215)]
    d='M30 215 L110 215 '+' '.join(f'L{x} {y}' for x,y in pts)
    s.append(f'<path d="{d}" fill="none" stroke="{CREAM}" stroke-width="8" stroke-linejoin="round"/>')
    s.append(f'<text x="560" y="365" fill="{ACID}" style="{F};font-size:22px">THE DIP = ROOM FOR THE KICK</text></svg>')
    return ''.join(s)

def knob(cx,cy,val,label,col):
    import math
    a=math.radians(-135+270*val)
    x2=cx+38*math.sin(a); y2=cy-38*math.cos(a)
    return (f'<circle cx="{cx}" cy="{cy}" r="48" fill="{CREAM}" stroke="{col}" stroke-width="8"/>'
            f'<line x1="{cx}" y1="{cy}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>'
            f'<text x="{cx}" y="{cy+82}" fill="{CREAM}" text-anchor="middle" style="{F};font-size:20px">{label}</text>')

def dj_eq():
    W,H=960,420; s=[f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg"><rect width="{W}" height="{H}" fill="{INK}"/>']
    s.append(f'<text x="150" y="44" fill="{ACID}" text-anchor="middle" style="{F};font-size:24px">OUTGOING</text>')
    s.append(f'<text x="810" y="44" fill="{ACID}" text-anchor="middle" style="{F};font-size:24px">INCOMING</text>')
    for i,(lab,a,b) in enumerate([('HIGH',.5,.5),('MID',.5,.5),('LOW',.5,0.0)]):
        y=90+i*112
        s.append(knob(150,y+10,a,lab,ACID if lab!='LOW' else ACID))
        s.append(knob(810,y+10,b,lab,RED if lab=='LOW' else ACID))
    s.append(f'<text x="480" y="300" fill="{CREAM}" text-anchor="middle" style="{F};font-size:24px">ON THE ONE:</text>')
    s.append(f'<text x="480" y="336" fill="{ACID}" text-anchor="middle" style="{F};font-size:24px">SWAP THE LOWS</text>')
    s.append(f'<path d="M260 330 L700 330" stroke="{ACID}" stroke-width="6" marker-end="url(#a)"/><defs><marker id="a" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="{ACID}"/></marker></defs></svg>')
    return ''.join(s)

def hpf():
    import math
    W,H=960,380; s=[f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg"><rect width="{W}" height="{H}" fill="{INK}"/>']
    def X(f): return 40+880*(math.log10(f)-math.log10(20))/(math.log10(20000)-math.log10(20))
    for f,l in [(20,'20'),(100,'100'),(1000,'1k'),(10000,'10k')]:
        s.append(f'<line x1="{X(f):.0f}" y1="40" x2="{X(f):.0f}" y2="310" stroke="#ffffff22" stroke-width="2"/><text x="{X(f):.0f}" y="350" fill="{CREAM}" text-anchor="middle" style="{F};font-size:22px">{l}</text>')
    pts=[]
    for i in range(0,200):
        f=20*10**(3*i/199); g=1/math.sqrt(1+(100/f)**4); y=300-220*g
        pts.append(f'{X(f):.1f},{y:.1f}')
    s.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{ACID}" stroke-width="8"/>')
    s.append(f'<rect x="40" y="40" width="{X(100)-40:.0f}" height="270" fill="{RED}" opacity=".25"/>')
    s.append(f'<text x="{X(100)+16:.0f}" y="130" fill="{ACID}" style="{F};font-size:24px">HIGH-PASS ~100 Hz</text>')
    s.append(f'<text x="52" y="290" fill="{CREAM}" style="{F};font-size:20px">MUD</text></svg>')
    return ''.join(s)

def phrase():
    W,H=960,400; s=[f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg"><rect width="{W}" height="{H}" fill="{INK}"/>']
    s.append(f'<text x="30" y="56" fill="{CREAM}" style="{F};font-size:22px">OUTGOING</text>')
    s.append(f'<text x="30" y="216" fill="{CREAM}" style="{F};font-size:22px">INCOMING</text>')
    x0=190; bw=23
    for b in range(32):
        x=x0+b*bw
        s.append(f'<rect x="{x}" y="80" width="{bw-4}" height="70" fill="{ACID if b<16 else "#ffffff33"}"/>')
        s.append(f'<rect x="{x}" y="240" width="{bw-4}" height="70" fill="{"#ffffff33" if b<16 else ACID}"/>')
    for b in [0,8,16,24,32]:
        x=x0+b*bw-2
        s.append(f'<line x1="{x}" y1="70" x2="{x}" y2="325" stroke="{CREAM}" stroke-width="{6 if b in (0,16,32) else 2}"/>')
    s.append(f'<text x="{x0}" y="365" fill="{CREAM}" style="{F};font-size:20px">BAR 1</text>')
    s.append(f'<text x="{x0+16*bw}" y="365" fill="{ACID}" style="{F};font-size:20px">BAR 17: OUTRO MEETS INTRO</text>')
    s.append(f'<text x="{x0+16*bw}" y="216" fill="{ACID}" style="{F};font-size:20px">START HERE</text></svg>')
    return ''.join(s)
