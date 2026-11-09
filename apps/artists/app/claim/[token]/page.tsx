/** A claim invite from CCD (/claim/<token>). Shows who it is for; the claim itself needs sign-in. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClaimInvite from "@/components/ClaimInvite";
import { isUuid } from "@/lib/db";

export const metadata: Metadata = { title: "Claim your page", robots: { index: false, follow: false } };

export default async function ClaimToken({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isUuid(token)) notFound();
  return (
    <main className="k-root">
      <section className="k-wrap max-w-[720px] py-16"><ClaimInvite token={token} /></section>
    </main>
  );
}
