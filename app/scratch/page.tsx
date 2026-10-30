import type { Metadata } from "next";
import { RpcForm } from "../form";

export const metadata: Metadata = { title: "Scratch", description: "Drops and streetwear from the Cats Can Dance crew. Not live yet." };

export default function Page() {
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <span className="tag">Wear</span>
          <h1 style={{ fontSize: "clamp(40px,8vw,96px)", margin: "14px 0 16px" }}>Scratch</h1>
          <p style={{ fontSize: 20, maxWidth: "50ch" }}>Drops and streetwear from the Cats Can Dance crew. Not live yet. Leave your email and we will tell you when it is.</p>
          <RpcForm
            fn="signup"
            hidden={{ p_source: "scratch" }}
            fields={[{ name: "p_email", label: "Email", type: "email", required: true }]}
            submit="Tell me"
            done="Done. We will email you when Scratch is live."
          />
        </div>
      </section>
    </main>
  );
}
