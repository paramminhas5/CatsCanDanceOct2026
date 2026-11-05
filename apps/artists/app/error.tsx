"use client";
import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="wrap grid gap-5 py-24 md:py-32">
      <p className="kicker">Something broke</p>
      <h1 className="display text-5xl md:text-7xl">That did not load.</h1>
      <p className="max-w-[44ch] text-graphite">Try again. If it keeps happening, the database may be slow. Nothing you did caused it.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
        <Link href="/" className="btn btn-secondary">Home</Link>
      </div>
    </main>
  );
}
