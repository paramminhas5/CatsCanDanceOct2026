import Link from "next/link";
import { Wordmark } from "@/components/Mark";
import type { Member } from "@/lib/auth";

const LINKS = [
  { href: "/artists", label: "Artists" },
  { href: "/tour", label: "On tour" },
  { href: "/bookings", label: "Bookings" },
];

/** The app's own nav: wordmark, three links, the account. Sits under the Cats Can Dance banner. */
export default function Nav({ member }: { member: Member | null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="wrap flex h-14 items-center justify-between gap-4">
        <Link href="/" className="rounded-md" aria-label="Home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="btn btn-quiet btn-sm hidden sm:inline-flex">{l.label}</Link>
          ))}
          <Link href="/artists" className="btn btn-quiet btn-sm sm:hidden">Artists</Link>
          <Link href="/tour" className="btn btn-quiet btn-sm sm:hidden">Tour</Link>
          {member ? (
            <Link href="/bookings" className="btn btn-secondary btn-sm">{member.display_name?.split(" ")[0] || "Your desk"}</Link>
          ) : (
            <Link href="/sign-in" className="btn btn-secondary btn-sm">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
