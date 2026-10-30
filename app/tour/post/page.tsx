import type { Metadata } from "next";
import Link from "next/link";
import { RpcForm } from "../../form";

export const metadata: Metadata = { title: "Post tour dates", description: "Artists: tell promoters where and when you are free to play." };

export default function PostDates() {
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <p className="muted" style={{ margin: 0 }}><Link href="/tour">Tour</Link></p>
          <h1 style={{ fontSize: "clamp(36px,7vw,80px)", margin: "12px 0 16px" }}>Post tour dates</h1>
          <p style={{ maxWidth: "52ch", fontSize: 19 }}>
            One city and one window per post, up to 60 days. Post again for each city. Dates drop off once they pass.
          </p>
          <RpcForm
            fn="submit_dates"
            fields={[
              { name: "p_artist_name", label: "Artist name", required: true },
              { name: "p_email", label: "Email (private)", type: "email", required: true },
              { name: "p_city", label: "City", required: true },
              { name: "p_from", label: "From", type: "date", required: true },
              { name: "p_to", label: "To", type: "date", required: true },
              { name: "p_note", label: "Note for promoters", placeholder: "Open to club nights, B2B, afters" },
            ]}
            submit="Post dates"
            done="Received. We check it and it goes up on Tour."
          />
        </div>
      </section>
    </main>
  );
}
