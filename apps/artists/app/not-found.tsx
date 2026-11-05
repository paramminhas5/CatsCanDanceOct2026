import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap grid gap-5 py-24 md:py-32">
      <p className="kicker">404</p>
      <h1 className="display text-5xl md:text-7xl">Nothing on this <span className="mark">bill</span>.</h1>
      <p className="max-w-[44ch] text-graphite">The page you asked for is not here. The artist may not be on the roster yet, or the link is old.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/artists" className="btn btn-primary">All artists</Link>
        <Link href="/tour" className="btn btn-secondary">On tour</Link>
      </div>
    </main>
  );
}
