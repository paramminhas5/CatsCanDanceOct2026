import Link from "next/link";
import { Mark } from "@/components/Mark";
import { NAME, ccd, gate, CONTACT_EMAIL } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-bone">
      <div className="wrap grid gap-8 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="grid gap-3 content-start">
          <span className="inline-flex items-center gap-2"><Mark size={22} /><span className="wordmark text-[15px]">{NAME}</span></span>
          <p className="max-w-[36ch] text-sm text-graphite">Sourced pages for South Asian electronic artists, kept up to date, with booking built in. A Cats Can Dance product.</p>
        </div>
        <nav aria-label="Pages" className="grid content-start gap-2 text-sm">
          <span className="kicker">Pages</span>
          <Link href="/artists" className="hover:underline">All artists</Link>
          <Link href="/tour" className="hover:underline">On tour</Link>
          <Link href="/bookings" className="hover:underline">Your bookings</Link>
          <Link href="/claim" className="hover:underline">Claim your page</Link>
        </nav>
        <nav aria-label="Cats Can Dance" className="grid content-start gap-2 text-sm">
          <span className="kicker">Cats Can Dance</span>
          <a href={ccd.home()} className="hover:underline">Nights</a>
          <a href={ccd.whatsOn()} className="hover:underline">What&apos;s on</a>
          <a href={gate.home()} className="hover:underline">Host a night</a>
        </nav>
        <div className="grid content-start gap-2 text-sm">
          <span className="kicker">Talk to us</span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline">{CONTACT_EMAIL}</a>
          <a href="/llms.txt" className="hover:underline">Data for assistants</a>
          <p className="text-mute">Every fact on an artist page links to its source. Previews from Deezer.</p>
        </div>
      </div>
    </footer>
  );
}
