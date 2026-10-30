import type { Metadata } from "next";
import Link from "next/link";
import { RpcForm } from "../../form";
import { getArtist } from "@/lib/db";

export const metadata: Metadata = { title: "Join Litter or claim your profile", description: "Artists: add your profile or claim the one we made. We check every request." };

export default async function Join({ searchParams }: { searchParams: { claim?: string } }) {
  const a = searchParams.claim ? await getArtist(searchParams.claim) : null;
  const claim = !!a;
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <p className="muted" style={{ margin: 0 }}><Link href="/litter">Litter</Link></p>
          <h1 style={{ fontSize: "clamp(36px,7vw,80px)", margin: "12px 0 16px" }}>{claim ? `Claim ${a!.name}` : "Join Litter"}</h1>
          <p style={{ maxWidth: "52ch", fontSize: 19 }}>
            {claim
              ? "Add the links you want on the profile and the email we should reach you on. We check it is you before anything changes."
              : "Add at least one link: Instagram, SoundCloud or a mix. We listen before we list."}
          </p>
          <RpcForm
            fn="submit_artist"
            hidden={{ p_kind: claim ? "claim" : "new", p_artist_slug: claim ? a!.slug : "" }}
            fields={[
              { name: "p_name", label: "Artist name", required: true },
              { name: "p_email", label: "Email (private)", type: "email", required: true },
              { name: "p_city", label: "City" },
              { name: "p_genres", label: "Genres", placeholder: "House, Disco" },
              { name: "p_instagram", label: "Instagram" },
              { name: "p_soundcloud", label: "SoundCloud", type: "url" },
              { name: "p_mix_url", label: "A 30 to 60 minute mix", type: "url" },
              { name: "p_bio", label: "One line about you", type: "textarea" },
            ]}
            submit="Send for review"
            done="Received. We will listen and email you."
          />
        </div>
      </section>
    </main>
  );
}
