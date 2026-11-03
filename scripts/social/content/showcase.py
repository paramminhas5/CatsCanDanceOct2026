# Design system showcase: one or two slides per world, used for sign-off.
import json, diagrams as D
P=[
dict(id="kit-discover", bucket="discover", num="DSC / 001", slides=[
  dict(type="cover", kicker="Friday Fresh / 06.11", title="Five records *to dig*", sub="Global and South Asian. House, garage, breaks.", cat="cat-raver.png"),
  dict(type="sleeve", n=1, artist="Nikki Nair", title="Majestic Animals EP", format="EP", label="Hyperdub", date="16 Oct 2026", origin="Atlanta", sound="Breaks and electro with heavy, wonky bass.", why="His second EP for Hyperdub in a year."),
  dict(type="sleeve", n=2, artist="Sandunes", title="Hand of Thought", format="LP", label="Karigar Records", date="27 Mar 2026", origin="Mumbai", sound="Clarinet, strings and plucked bass.", why="The third era of one of India's most restless producers.")]),
dict(id="kit-artist", bucket="artist", num="ART / 001", slides=[
  dict(type="artist", kicker="Artist / Atlanta, USA", name="Nikki Nair", line="Tennessee-born, Atlanta-based producer and DJ", tags=["Breaks","Electro","Bass"]),
  dict(type="liner", kicker="Start here", heading="Side A", rows=[["A1","Majestic Animals EP (Hyperdub, 2026)"],["A2","Nagoya EP (Hyperdub, 2025)"],["B1","Set the Roof, with Hudson Mohawke (2023)"]], source="CCD artist database")]),
dict(id="kit-label", bucket="label", num="LBL / 001", slides=[
  dict(type="record", kicker="Label we love", name="Qilla Records", ring="NEW DELHI / FOUNDED BY KOHRA", est="EST. 2011", city="NEW DELHI"),
  dict(type="liner", kicker="Qilla Records", heading="On the roster", rows=[["001","Kohra, who started it in 2011"],["002","Midnight Traffic, Hyderabad"],["003","Hybrid Protokol, Kolkata"]], source="CCD artist database")]),
dict(id="kit-news", bucket="news", num="WIRE / 001", slides=[
  dict(type="masthead", issue="NO. 01 / BENGALURU", date="WEEK OF 09.11.26", items=["Headline one goes here","Headline two goes here","Headline three goes here"]),
  dict(type="news", tag="Tour", date="09.11", headline="Sample headline for a scene story", body="Two plain lines on what happened and why it matters to people who go out in Bengaluru.", source="publication name")]),
dict(id="kit-learn", bucket="learn", num="SCH / P01", slides=[
  dict(type="cover", kicker="Producer basics / 4 steps", title="Make the bass *duck*", sub="Sidechain compression. Why house records pump."),
  dict(type="step", n="3", of="4", lcd="THRESHOLD", heading="Threshold *down*", body="Start around 4:1. Pull the threshold down until the bass dips on every kick.", diagram=D.sidechain()),
  dict(type="cta", heading="Try it *tonight*", body="Full lesson in CCD School. Link in bio.", action="Save for the studio", cat="cat-headphones.png")]),
dict(id="kit-nights", bucket="nights", num="EP / 05", slides=[
  dict(type="ticket", big="05", line1="Wed 25.11", line2="THE HUMMING TREE / INDIRANAGAR", stub="ADMIT ONE CAT"),
  dict(type="text", kicker="Episode 5", heading="Lineup *next week*", paras=["Turn on post notifications so you hear first."])]),
dict(id="kit-build", bucket="build", num="LOG / 001", slides=[
  dict(type="cover", kicker="What we're building", title="Every fact *sourced*", sub="A proper home for South Asian electronic artists."),
  dict(type="log", kicker="This week", heading="Build log", lines=["artist pages: eras, releases, gigs","every fact links to its source","artists can claim their page","going live on catscandance.com soon"])]),
]
json.dump(P, open('/tmp/kit.json','w'))
