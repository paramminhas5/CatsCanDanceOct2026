import type { Metadata } from "next";
import Link from "next/link";
import { RpcForm } from "../../form";

export const metadata: Metadata = { title: "Submit an event to Prowl", description: "Promoters and venues: send us your next night. We check every submission before it goes live." };

export default function SubmitEvent() {
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <p className="muted" style={{ margin: 0 }}><Link href="/prowl">Prowl</Link></p>
          <h1 style={{ fontSize: "clamp(36px,7vw,80px)", margin: "12px 0 16px" }}>Submit an event</h1>
          <p style={{ maxWidth: "52ch", fontSize: 19 }}>
            Underground dance music only. Include a link to the event page or tickets. We check every submission and tell you if it goes up.
          </p>
          <RpcForm
            fn="submit_event"
            fields={[
              { name: "p_title", label: "Event name", required: true },
              { name: "p_url", label: "Link to event page or tickets", type: "url", required: true, placeholder: "https://" },
              { name: "p_date", label: "Date", type: "date", required: true },
              { name: "p_time", label: "Start time", placeholder: "10 PM" },
              { name: "p_venue", label: "Venue" },
              { name: "p_city", label: "City", placeholder: "Bengaluru" },
              { name: "p_description", label: "Lineup and a line about the night", type: "textarea" },
              { name: "p_email", label: "Your email", type: "email", required: true },
            ]}
            submit="Send for review"
            done="Received. We check every event and will email you if it goes up."
          />
        </div>
      </section>
    </main>
  );
}
