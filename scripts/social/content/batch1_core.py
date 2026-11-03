# Batch 1 (4 to 18 Nov 2026): posts that come from CCD's own data and CCD School.
# Research-led posts (Discover, Label, News) are in batch1_research.py.
import diagrams as D

SCHOOL = "CCD School"
TAGS_LEARN = "#musicproduction #djtips #ableton #bangalore #catscandance"

POSTS = [
# ---------- CCD NIGHTS: Episode 5 ladder ----------
dict(id="2026-11-04-nights-ep5-tease", date="2026-11-04", bucket="nights", num="EPISODE 05",
  title="Episode 5 tease (T-21)",
  slides=[dict(type="poster", kicker="Cats Can Dance / Episode 5", title="25.11", sub="Wednesday at The Humming Tree, Bengaluru.\nLineup soon.", cat="cat-dancer.png")],
  caption="Episode 5.\n\nWednesday 25 November. The Humming Tree, Indiranagar.\n\nLineup next week. Turn on post notifications so you hear first.\n\n#catscandance #bangalore #bengalurunightlife #housemusic #ukgarage",
  sources=["CCD events table: episode-5"], needs=[]),

dict(id="2026-11-11-nights-ep5-lineup", date="2026-11-11", bucket="nights", num="EPISODE 05",
  title="Episode 5 lineup announce (T-14)",
  slides=[dict(type="poster", kicker="Episode 5 / 25.11 / The Humming Tree", title="[LINEUP]", sub="Doors [TIME]. Free list. Link in bio."),
          dict(type="text", kicker="How it works", heading="Free list, *limited*", paras=["Put your name down on catscandance.com. Two per person.", "Pets welcome is not a joke. Ask us."])],
  caption="Episode 5 lineup.\n\n[LINEUP, one per line]\n\nWednesday 25 November, The Humming Tree. Doors [TIME].\nFree list is open. Link in bio.\n\n#catscandance #bangalore #bengalurunightlife",
  sources=["CCD events table: episode-5"], needs=["Lineup", "Door time", "Is the free list live on the site?", "Pets at Humming Tree: yes or no"]),

dict(id="2026-11-18-nights-ep5-spotlight", date="2026-11-18", bucket="nights", num="EPISODE 05",
  title="Episode 5 artist spotlight (T-7)",
  slides=[dict(type="cover", kicker="One week to Episode 5", title="Meet *[ARTIST]*", sub="[One line on their sound]"),
          dict(type="facts", kicker="Before you come", heading="Start with these", facts=[["Track", "[track]"], ["Mix", "[mix]"], ["Plays", "Episode 5, 25.11"]])],
  caption="One week out. [ARTIST] plays Episode 5.\n\n[Two lines on what they play and one track to start with.]\n\nWednesday 25 November, The Humming Tree. Free list in bio.\n\n#catscandance #bangalore",
  sources=[], needs=["Which artist to spotlight", "Their track and mix links"]),

# ---------- LEARN (CCD School) ----------
dict(id="2026-11-05-learn-sidechain", date="2026-11-05", bucket="learn", num="PRODUCER 01",
  title="Make the bass duck under the kick",
  slides=[
    dict(type="cover", kicker="Producer basics / 4 steps", title="Make the bass *duck*", sub="Sidechain compression. The reason house records pump.", cat="cat-dj-hero.png"),
    dict(type="step", n="1", heading="Compressor on the *bass*", body="Not on the kick. The bass is the part that moves out of the way."),
    dict(type="step", n="2", heading="Feed it the kick", body="Open the compressor's sidechain, switch it on, and pick your kick track as the source. In Ableton that is Sidechain, then Audio From."),
    dict(type="step", n="3", heading="Threshold down", body="Start around 4:1. Pull the threshold down until the bass dips every time the kick hits. Watch the gain reduction meter move.", diagram=D.sidechain()),
    dict(type="step", n="4", heading="Release sets the groove", body="Short release and the bass snaps back. Longer release and the whole track breathes. Move it slowly while the loop plays and stop when it grooves."),
    dict(type="cta", heading="Try it *tonight*", body="Full lesson in CCD School. Link in bio.", action="SAVE THIS FOR THE STUDIO"),
  ],
  caption="Make the bass duck under the kick.\n\n1. Put a compressor on the bass, not the kick.\n2. Turn on its sidechain and feed it the kick.\n3. Start around 4:1 and pull the threshold down until the bass dips on every kick.\n4. Use release to set the feel. Short snaps back, longer breathes.\n\nIt clears the low end so the kick hits clean. Full lesson in CCD School, link in bio.\n\n" + TAGS_LEARN,
  sources=["CCD School lesson: Make the bass duck under the kick (build.ts)"], needs=[]),

dict(id="2026-11-08-learn-dj-eq", date="2026-11-08", bucket="learn", num="DJ 01",
  title="EQ mixing: one bassline at a time",
  slides=[
    dict(type="cover", kicker="DJ basics / EQ mixing", title="One bass *at a time*", sub="The EQ move that makes blends sound clean.", cat="cat-headphones-dance.png"),
    dict(type="step", n="1", heading="Kill the low on the new track", body="Before the incoming track goes in, turn its low EQ all the way down."),
    dict(type="step", n="2", heading="Bring it in on top", body="Beatmatch, then open the fader. You hear its hats and percussion riding over the track that is playing."),
    dict(type="step", n="3", heading="Swap the lows on the one", body="At the start of a phrase, drop the low on the outgoing track and bring the incoming low back up. Both hands, same moment.", diagram=D.dj_eq()),
    dict(type="text", kicker="Why", heading="Two basslines is *mud*", paras=["Two kicks and two basslines at once fight each other and the floor loses the groove.", "One bass at a time keeps the blend tight even on a small system."]),
    dict(type="cta", heading="Practise the *swap*", body="The EQ Mixing lesson in CCD School walks you through it. Link in bio.", action="SAVE FOR YOUR NEXT SESSION"),
  ],
  caption="One bassline at a time.\n\nKill the low on the incoming track, bring it in on the mids and highs, then swap the lows at the start of a phrase. Drop one, raise the other, same moment.\n\nTwo basslines together turn to mud. One at a time keeps the blend clean.\n\nEQ Mixing is a lesson in CCD School. Link in bio.\n\n" + TAGS_LEARN,
  sources=["CCD School DJ lesson: EQ Mixing (missions-dj.ts)"], needs=[]),

dict(id="2026-11-12-learn-hpf", date="2026-11-12", bucket="learn", num="PRODUCER 02",
  title="Clean up with EQ: high-pass",
  slides=[
    dict(type="cover", kicker="Producer basics / mixing", title="Why your mix is *muddy*", sub="Low end you never asked for, stacking up in every part.", cat="cat-raver.png"),
    dict(type="step", n="1", heading="Find the parts that don't need lows", body="Pads, vocals, hats, guitars, most synths. Only the kick and bass really need the bottom."),
    dict(type="step", n="2", heading="High-pass them", body="Put an EQ on each and turn on a high-pass filter. Start around 100 Hz and move it until the part starts to thin, then back off a little.", diagram=D.hpf()),
    dict(type="step", n="3", heading="Judge it in the mix", body="A part that sounds thin on solo often sits perfectly with everything else playing. Un-solo before you decide."),
    dict(type="step", n="4", heading="Sweep for harsh spots", body="Boost a narrow band, sweep slowly until something hurts, then cut it a few dB."),
    dict(type="cta", heading="Clean mix, *louder kick*", body="Clean up with EQ is a step in CCD School's build-a-track path. Link in bio.", action="SAVE THIS"),
  ],
  caption="Most muddy mixes come from low end stacking up in parts that don't need it.\n\nHigh-pass everything that isn't kick or bass. Start around 100 Hz, raise it until the part thins, then back off. Judge it with the full mix playing, not on solo.\n\nThen sweep for anything harsh and cut it a few dB.\n\nFrom CCD School. Link in bio.\n\n" + TAGS_LEARN,
  sources=["CCD School lesson: Clean up with EQ (build.ts)"], needs=[]),

dict(id="2026-11-15-learn-phrasing", date="2026-11-15", bucket="learn", num="DJ 02",
  title="Mix on the phrase",
  slides=[
    dict(type="cover", kicker="DJ basics / structure", title="Mix on the *phrase*", sub="Why some blends feel right and some feel off, even when the beats match.", cat="cat-dj-hero.png"),
    dict(type="step", n="1", heading="Count in bars", body="Four beats is a bar. Dance music moves in blocks of 8, 16 and 32 bars. Something changes at the start of each block."),
    dict(type="step", n="2", heading="Find the outro", body="Watch the waveform of the playing track. The outro usually starts at the top of a 16 or 32 bar block."),
    dict(type="step", n="3", heading="Start the new track there", body="Drop the incoming track on beat 1 of that block, so its intro runs under the outgoing outro.", diagram=D.phrase()),
    dict(type="text", kicker="The result", heading="Changes land *together*", paras=["Both tracks change at the same moment, so the mix sounds like one record.", "Start a bar early or late and the drops and breaks land in odd places."]),
    dict(type="cta", heading="Count it *out loud*", body="More DJ lessons in CCD School. Link in bio.", action="SAVE THIS"),
  ],
  caption="Mix on the phrase.\n\nFour beats is a bar. House and techno move in blocks of 8, 16 and 32 bars. Start the incoming track on beat 1 of the outgoing track's outro block, so intro runs under outro and both tracks change together.\n\nBeats matching isn't enough. Phrases matching is what makes a blend feel like one record.\n\nFrom CCD School. Link in bio.\n\n" + TAGS_LEARN,
  sources=["CCD School DJ lessons: Reading Waveforms, The Long Mix and Blend"], needs=[]),

# ---------- ARTIST SHOWCASE (from the CCD artist database, sourced) ----------
dict(id="2026-11-07-artist-nikki-nair", date="2026-11-07", bucket="artist", num="ARTIST 01",
  title="Nikki Nair",
  slides=[
    dict(type="artist", kicker="Artist / Atlanta, USA", name="Nikki Nair", city="Tennessee-born, Atlanta-based producer and DJ", tags=["Breaks", "Electro", "Bass", "Garage"]),
    dict(type="facts", kicker="The short version", heading="Why we rate him", facts=[
      ["Sound", "Breakbeat and electro with heavy bass, out of the US Southeast."],
      ["Label", "Runs his own, n goes to infinity, since 2022."],
      ["2023", "Set the Roof, a mini-album with Hudson Mohawke."],
      ["2026", "Majestic Animals EP, out on Hyperdub in October."]]),
    dict(type="facts", kicker="Start here", heading="Three to play", facts=[
      ["New", "Majestic Animals EP (Hyperdub, 2026)"],
      ["Last year", "Nagoya EP (Hyperdub, 2025)"],
      ["Single", "Groundhogs (Hyperdub, 2026)"]]),
    dict(type="cta", heading="Press *play*", body="Majestic Animals EP. Out now on Hyperdub.", action="FOLLOW @NIKKI__NAIR"),
  ],
  caption="Nikki Nair.\n\nTennessee-born, Atlanta-based. Breakbeat and electro with heavy bass from the US Southeast, with UK influences. Runs his own label, n goes to infinity. Made Set the Roof with Hudson Mohawke in 2023.\n\nStart with the Majestic Animals EP, out on Hyperdub in October.\n\n@nikki__nair\n\n#breakbeat #electro #hyperdub #southasianartists #catscandance",
  tagged=["nikki__nair"],
  sources=["CCD artists: nikki-nair bio", "Beatportal: beatportal.com/features/introducing-nikki-nair/", "Deezer album 1078809822 (Majestic Animals EP, Hyperdub, 2026-10-16)", "Deezer album 840764662 (Nagoya, Hyperdub, 2025-11-07)"], needs=[]),

dict(id="2026-11-16-artist-sandunes", date="2026-11-16", bucket="artist", num="ARTIST 02",
  title="Sandunes: three eras",
  slides=[
    dict(type="artist", kicker="Artist / Mumbai", name="Sandunes", city="Sanaya Ardeshir. Producer, composer, pianist.", tags=["Electronica", "Glitch", "Downtempo"]),
    dict(type="facts", kicker="Era 1 / 2012 to 2018", heading="Piano and glitch", facts=[["Sound", "Glitchy, mid-tempo post-dubstep, led by piano."]], source="Rolling Stone India"),
    dict(type="facts", kicker="Era 2 / 2019 to 2022", heading="Dreamy pop", facts=[["Sound", "Dreamy pop over hi-hat rhythms and airy synths."]], source="Resident Advisor"),
    dict(type="facts", kicker="Era 3 / 2023 on", heading="Clarinet and strings", facts=[["Sound", "Clarinet, strings and plucked bass."], ["Album", "Hand of Thought, Karigar Records, March 2026."]], source="Wild City, MusicBrainz"),
    dict(type="cta", heading="Hear *all three*", body="Start with Hand of Thought, then go back to the early piano records.", action="FOLLOW @SANDUNESMUSIC"),
  ],
  caption="Sandunes, in three eras.\n\n2012 to 2018: glitchy, piano-led post-dubstep.\n2019 to 2022: dreamy pop over hi-hats and airy synths.\n2023 on: clarinet, strings and plucked bass, leading to Hand of Thought on Karigar Records this March.\n\nStart wherever you like.\n\n@sandunesmusic\n\n#sandunes #indianelectronicmusic #mumbai #catscandance",
  tagged=["sandunesmusic"],
  sources=["Rolling Stone India: rollingstoneindia.com/?p=41411", "Resident Advisor: ja.ra.co/reviews/24218", "Wild City: thewildcity.com/news/20319", "MusicBrainz release 7b23cb2a (Hand of Thought, Karigar, 2026-03-27)"], needs=[]),

# ---------- BUILDING CCD (honest: these features are not live yet) ----------
dict(id="2026-11-10-build-artist-db", date="2026-11-10", bucket="build", num="BUILD LOG 01",
  title="Building the South Asian artist database",
  slides=[
    dict(type="cover", kicker="What we're building", title="Every fact *sourced*", sub="A proper home for South Asian electronic artists.", cat="cat-streetwear.png"),
    dict(type="text", kicker="The problem", heading="The big databases *miss us*", paras=["Most music databases barely know Indian electronic artists. Wrong photos, missing releases, mixed-up names.", "So we started our own."]),
    dict(type="text", kicker="What's on a page", heading="More than gig dates", paras=["Eras of their sound, releases you can play, gigs, labels, press, and who they connect to.", "Every line links to where it came from."]),
    dict(type="cta", heading="Artists: *claim your page*", body="Pages go live on catscandance.com soon. DM us if you want yours checked first.", action="DM US"),
  ],
  caption="Something we've been building.\n\nA database of South Asian electronic artists, at home and in the diaspora, where every fact is sourced. Eras, releases you can play, gigs, labels, press and connections between artists.\n\nPages go live on catscandance.com soon. Artists, DM us if you want yours checked first.\n\n#indianelectronicmusic #southasianmusic #catscandance",
  sources=["ccd/artist-gaps.md, ccd/artist-page-v3.md"], needs=["OK to talk about artist pages before PR #11 is merged and live?"]),

dict(id="2026-11-17-build-find", date="2026-11-17", bucket="build", num="BUILD LOG 02",
  title="Find: every good night in one place",
  slides=[
    dict(type="cover", kicker="What we're building", title="Every good night, *one list*", sub="Find, on catscandance.com.", cat="cat-raver.png"),
    dict(type="text", kicker="How it works", heading="By day, *your filters*", paras=["Pick the night, the city and the sound. Save the ones you like. Add them to your calendar.", "No Bollywood nights. We check them."]),
    dict(type="text", kicker="Going?", heading="Find your *crew*", paras=["Say you're going and meet people heading to the same night.", "CCD nights are pinned at the top."]),
    dict(type="cta", heading="Coming *soon*", body="Turn on notifications and we'll tell you when it's live.", action="FOLLOW FOR LAUNCH"),
  ],
  caption="Another thing we're building: Find.\n\nEvery good electronic night in Bengaluru in one list, by day. Filter by night, city and sound, save the ones you like, add them to your calendar. Say you're going and meet people heading to the same night.\n\nComing to catscandance.com soon.\n\n#bengalurunightlife #bangalore #catscandance",
  sources=["ccd/find.md, ccd/going-and-crews.md"], needs=["OK to talk about Find before PR #8 is merged and live?"]),
]

for _p in POSTS:
    if _p["bucket"] == "learn":
        _p["needs"] = _p["needs"] + ["CCD School link for the bio (learn.catscandance.com is not attached yet)"]
