import Link from "next/link";
import { GateMark, GateWordmark } from "@/components/brand/Mark";

/**
 * Gate's own nav, under the Cats Can Dance banner. Four links and one primary button.
 * Server component: the account state comes from the layout.
 */
export function Nav({ signedIn, name }: { signedIn: boolean; name?: string | null }) {
  return (
    <header className="border-b border-line bg-black">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4" aria-label="Gate">
        <Link href="/" className="flex items-center gap-2.5 text-text" aria-label="Gate home">
          <GateMark size={30} />
          <GateWordmark height={22} />
        </Link>
        <ul className="ml-auto hidden items-center gap-1 sm:flex">
          {[["/promote", "Promote"], ["/door", "Door"], ["/promoters", "Promoters"], ["/#plans", "Plans"]].map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="inline-flex min-h-11 items-center rounded-button px-3 text-[15px] font-medium text-muted hover:text-text">
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href={signedIn ? "/promote" : "/sign-in"} className="btn btn-sm btn-primary ml-auto sm:ml-2">
          {signedIn ? (name ? name.split(" ")[0] : "Your nights") : "Sign in"}
        </Link>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="stripe h-2" aria-hidden="true" />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-8 text-sm text-muted">
        <span className="text-text">Gate, by Cats Can Dance.</span>
        <Link href="/promote" className="hover:text-text">Run your night</Link>
        <Link href="/door" className="hover:text-text">Open the door</Link>
        <Link href="/promoters" className="hover:text-text">Promoters</Link>
        <Link href="/submit" className="hover:text-text">Send us a night</Link>
        <a href="mailto:hello@catscandance.com" className="hover:text-text">hello@catscandance.com</a>
        <span className="ml-auto">Bengaluru</span>
      </div>
    </footer>
  );
}
