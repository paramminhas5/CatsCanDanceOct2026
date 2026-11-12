/**
 * The kit: every @ccd/ui piece on one page, for review against the canvas boards.
 * Not indexed. The numbers shown are labelled as examples.
 */
import type { Metadata } from "next";
import {
  ButtonLink, Button, Pill, Tag, ExampleTag, Tabs, SectionHead, Keycap, Led, EqBars, Readout, Record, Sleeve,
  Plinth, Arm, Passport, Knob, Sticker, Marquee, Cat, Icon,
} from "@ccd/ui";

export const metadata: Metadata = { title: "Kit", robots: { index: false, follow: false } };

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="k-wrap pt-16">
      <p className="k-m mb-5">{title}</p>
      {children}
    </section>
  );
}

export default function Kit() {
  return (
    <main className="k-root pb-10">
      <section className="k-wrap pt-12">
        <SectionHead title="The kit" sub="Every piece of the suite look, drawn in CSS. Reduced motion stops all of it." right={<ExampleTag>Example values</ExampleTag>} />
      </section>
      <Block title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink variant="key" size="l" href="#">Key, large</ButtonLink>
          <ButtonLink variant="key" href="#">Key</ButtonLink>
          <ButtonLink variant="key" size="s" href="#">Key, small</ButtonLink>
          <ButtonLink size="l" href="#"><Icon name="inbox" size={17} />Ghost</ButtonLink>
          <Button>Ghost button</Button>
          <Button disabled>Disabled</Button>
          <ButtonLink icon href="#" aria-label="Share"><Icon name="share" size={18} /></ButtonLink>
        </div>
      </Block>
      <Block title="Pills, tags, status">
        <div className="flex flex-wrap items-center gap-3">
          <Pill on>All 68</Pill><Pill>Albums 19</Pill><Pill>EPs 5</Pill><Tag>DJ</Tag><Tag>New</Tag><ExampleTag />
          <Led>Open to bookings</Led><Led state="off">No date yet</Led><Led state="warn">No signal</Led><EqBars />
        </div>
      </Block>
      <Block title="Tabs">
        <Tabs label="Artist" current="#music" items={[{ href: "#overview", label: "Overview" }, { href: "#music", label: "Music", count: 68 }, { href: "#shows", label: "Shows", count: 15 }, { href: "#shop", label: "Shop" }]} />
      </Block>
      <Block title="Readout">
        <div className="max-w-[620px]"><Readout cells={[{ value: 68, label: "Records" }, { value: 15, label: "Shows" }, { value: 7, label: "Cities" }, { value: 48, label: "Labels" }]} /></div>
      </Block>
      <Block title="Record, sleeve, turntable">
        <div className="grid items-center gap-10 md:grid-cols-[auto_auto_1fr]">
          <Record size={220} line1="Profound" line2="Armoony" />
          <div className="w-[240px] pr-12"><Sleeve title="Living Dust" label="Movement Recordings" fontSize={36} /></div>
          <Plinth className="relative h-[300px] max-w-[560px] overflow-hidden">
            <div className="absolute left-8 top-8 w-[230px]"><Sleeve title="Profound Concept" label="Armoony Records" out fontSize={34} /></div>
            <Arm style={{ left: 330, top: 30, height: 200 }} />
          </Plinth>
        </div>
      </Block>
      <Block title="Passport">
        <div className="max-w-[600px]">
          <Passport summary="7 cities" stamps={[
            { city: "Bengaluru", count: 5, colour: "#1f5fd6", shape: "round" }, { city: "Amsterdam", count: 5, colour: "#c2185b" },
            { city: "Delhi", count: 1, colour: "#2e7d32", shape: "double" }, { city: "Dubai", count: 1, colour: "#6a1b9a", shape: "round" },
            { city: "Hyderabad", count: 1, colour: "#e65100" }, { city: "Glasgow", count: 1, colour: "#00695c", shape: "double" },
          ]} />
        </div>
      </Block>
      <Block title="Knob, keycaps, sticker">
        <div className="flex flex-wrap items-center gap-10">
          <Knob size={180} label="Offer" />
          <div className="grid w-[360px] grid-cols-3 gap-2.5"><Keycap pressed sub="set">Club</Keycap><Keycap sub="set">Festival</Keycap><Keycap sub="party">Private</Keycap></div>
          <div className="relative h-[110px] w-[110px]"><Sticker style={{ left: 8, top: 8 }}>New EP<br />11 Sep</Sticker></div>
        </div>
      </Block>
      <Block title="Cats, one per screen">
        <div className="flex flex-wrap items-end gap-10"><Cat name="lime" height={120} /><Cat name="dance" height={120} move="sway" /><Cat name="yellow" height={120} /><Cat name="pink" height={120} /></div>
      </Block>
      <section className="pt-16">
        <p className="k-m k-wrap mb-5">Marquee</p>
        <Marquee label="Labels" items={["Movement Recordings", "The Soundgarden", "Mango Alley", "Stripped Recordings", "UV", "LAIKA Sounds"]} />
      </section>
    </main>
  );
}
