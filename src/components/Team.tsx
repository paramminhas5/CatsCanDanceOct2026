import catDj from "@/assets/cat-dj-hero.svg";
import catDancer from "@/assets/cat-dancer.svg";
import catLeft from "@/assets/cat-left.svg";
import catRight from "@/assets/cat-right.svg";
import catHeadphones from "@/assets/cat-headphones.png";
import { imgUrl } from "@/lib/img";
import PartnerContactDialog from "@/components/PartnerContactDialog";

const founders = [
  { name: "Param Minhas", role: "Co-founder. Plays as Merman.", img: catDj, bg: "bg-magenta", text: "text-cream" },
  { name: "Satwik Harisenany", role: "Co-founder. Plays as Sartdawg.", img: catDancer, bg: "bg-acid-yellow", text: "text-ink" },
];

const roles = [
  { name: "Music", desc: "Lineups, guest bookings, playlists.", bg: "bg-lime", text: "text-ink", img: catHeadphones },
  { name: "Design", desc: "Posters, merch, the site.", bg: "bg-orange", text: "text-ink", img: catLeft },
  { name: "Door and ops", desc: "Guest list, door, the venue on the night.", bg: "bg-electric-blue", text: "text-cream", img: catRight },
  { name: "Photo and video", desc: "Shoot the nights, cut the recaps.", bg: "bg-cream", text: "text-ink", img: catDancer },
];

const Team = () => (
  <section id="team" className="relative bg-cream border-b-4 border-ink py-12 md:py-20 bg-grain overflow-hidden">
    <div className="container">
      <p className="font-display text-magenta text-lg md:text-xl mb-3">/ WHO RUNS IT</p>
      <h2 className="font-display text-ink text-4xl md:text-6xl leading-[0.9] mb-8">
        TWO OF US,<br/>FOR NOW.
      </h2>

      {/* Co-founders */}
      <div className="grid sm:grid-cols-2 gap-5 mb-12">
        {founders.map((f) => (
          <div
            key={f.name}
            className={`${f.bg} ${f.text} border-4 border-ink chunk-shadow-lg hover:-translate-y-1 transition-transform`}
          >
            <div className="aspect-[4/3] bg-cream border-b-4 border-ink p-6 grid place-items-center">
              <img src={imgUrl(f.img)} alt="" className="max-h-48 w-auto object-contain wiggle" loading="lazy" decoding="async" />
            </div>
            <div className="p-5">
              <p className="font-display text-2xl md:text-3xl leading-tight">{f.name.toUpperCase()}</p>
              <p className="font-medium opacity-90 mt-1">{f.role}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Hiring grid */}
      <p className="font-display text-magenta text-lg md:text-xl mb-3">/ HELP OUT</p>
      <h3 className="font-display text-ink text-3xl md:text-5xl leading-[0.9] mb-6">
        WANT TO HELP?
      </h3>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((r) => (
          <PartnerContactDialog
            key={r.name}
            kind="team"
            defaultReason={r.name}
            defaultMessage={`Hi! I'd like to help with ${r.name.toLowerCase()}.\n\nA bit about me: `}
            trigger={
              <button
                type="button"
                className={`${r.bg} ${r.text} border-4 border-ink chunk-shadow p-5 hover:-translate-y-1 transition-transform block text-left w-full`}
              >
                <p className="font-display text-xl md:text-2xl leading-tight mb-2">{r.name.toUpperCase()}</p>
                <p className="font-medium text-sm md:text-base opacity-90 mb-3">{r.desc}</p>
                <span className="font-display text-sm underline decoration-2 underline-offset-4">GET IN TOUCH →</span>
              </button>
            }
          />
        ))}
      </div>

      <p className="mt-8 max-w-2xl text-ink/70 font-medium">
        Something else?{" "}
        <PartnerContactDialog
          kind="team"
          defaultReason="Other"
          trigger={
            <button type="button" className="underline decoration-magenta decoration-4 underline-offset-4">
              say hi
            </button>
          }
        />
        .
      </p>
    </div>
  </section>
);

export default Team;
