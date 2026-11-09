import { ButtonLink, Cat } from "@ccd/ui";

/** Shown in place of a page that needs a session. */
export default function NeedSignIn({ next, title, line }: { next: string; title: string; line: string }) {
  return (
    <section className="k-wrap grid max-w-[760px] justify-items-start gap-5 py-20">
      <Cat name="yellow" height={110} />
      <h1 className="k-d text-[44px] md:text-[60px]">{title}</h1>
      <p className="k-b text-[18px]">{line}</p>
      <ButtonLink variant="key" size="l" href={`/sign-in?next=${encodeURIComponent(next)}`}>Sign in</ButtonLink>
    </section>
  );
}
