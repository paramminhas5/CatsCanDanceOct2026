import { SuiteNav } from "@ccd/ui";
import type { Member } from "@/lib/auth";

/** The suite nav for Artists. The account button opens the artist side when signed in. */
export default function Nav({ member }: { member: Member | null }) {
  return <SuiteNav current="artists" account={member ? { href: "/me", label: member.display_name?.split(" ")[0] || "Your page" } : { href: "/sign-in", label: "Sign in" }} cta={{ href: "/artists?mode=book", label: "Book an artist" }}
    sub={[{ href: "/artists", label: "Discover" }, { href: "/tour", label: "On tour" }, { href: "/following", label: "Following" }, { href: "/bookings", label: "Bookings" }, { href: "/me", label: member ? "Your page" : "For artists" }]} />;
}
