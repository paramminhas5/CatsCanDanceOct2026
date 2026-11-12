/**
 * Contracts (board F38-A-Contract). Drawn, and switched off until Param turns them on (with deposits).
 * The page says so plainly and shows what will be in one, so nothing pretends to work.
 */
import { ButtonLink } from "@ccd/ui";

const FIELDS = ["The date, the venue and the set time", "The fee, and when it is paid", "Travel, stay and the rider", "What happens if either side cancels"];

export default function Contract() {
  return (
    <div className="grid gap-10 md:grid-cols-[1fr_440px]">
      <div>
        <h1 className="k-d text-[44px] md:text-[56px]">Contracts</h1>
        <p className="k-b mt-2 max-w-[560px] text-[17px]">One contract per booking, signed by both of you in the thread, with the deposit held until the night. This switches on soon. Until then, agree the terms in the booking thread.</p>
        <div className="mt-6"><ButtonLink href="/bookings">Open your bookings</ButtonLink></div>
      </div>
      <figure className="k-paper relative m-0 rounded-[16px] p-7 text-[#141414]" style={{ transform: "rotate(1deg)" }} aria-label="What a contract will hold">
        <span className="k-m !text-[#141414]">Booking contract</span>
        <ul className="mt-4 grid list-none gap-3 p-0 text-[15px]">
          {FIELDS.map((f) => <li key={f} className="border-b border-black/10 pb-3">{f}</li>)}
        </ul>
        <div className="mt-6 grid grid-cols-2 gap-6 text-[13px]"><span className="border-t border-black/40 pt-2">Artist</span><span className="border-t border-black/40 pt-2">Promoter</span></div>
        <span className="absolute -right-3 -top-3 rotate-6 rounded-md border-2 px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest" style={{ borderColor: "#b45309", color: "#b45309", background: "#f2efe7" }}>Coming soon</span>
      </figure>
    </div>
  );
}
