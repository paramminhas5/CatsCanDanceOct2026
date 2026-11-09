import { ButtonLink, Cat } from "@ccd/ui";

export default function NotFound() {
  return (
    <main className="k-root">
      <section className="k-wrap grid gap-5 py-24 md:py-32">
        <p className="k-m">404</p>
        <h1 className="k-d text-[48px] md:text-[88px]">Nothing on this bill.</h1>
        <p className="k-b max-w-[44ch] text-[17px]">The page you asked for is not here. The artist may not be on the roster yet, or the link is old.</p>
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink variant="key" href="/">Back to Artists</ButtonLink>
          <Cat name="lime" height={72} move="still" />
        </div>
      </section>
    </main>
  );
}
