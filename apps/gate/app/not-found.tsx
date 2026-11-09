import { ButtonLink, Cat } from "@ccd/ui";

export default function NotFound() {
  return (
    <main className="k-root"><section className="k-wrap grid gap-5 py-24">
      <p className="k-m">404</p>
      <h1 className="k-d text-[48px] md:text-[88px]">Not on the list.</h1>
      <p className="k-b max-w-[44ch] text-[17px]">This page is not here, or the link is old.</p>
      <div className="flex items-center gap-3"><ButtonLink variant="key" href="/">Back to Host</ButtonLink><Cat name="yellow" height={80} move="still" /></div>
    </section></main>
  );
}
