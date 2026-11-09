import { ButtonLink, Cat, SectionHead } from "@ccd/ui";

/**
 * Placeholder until the front page (board W39-Artists) is built in phase 3 of build-plan-final40.
 * It links to the parts that exist on this branch.
 */
export default function Home() {
  return (
    <main className="k-root">
      <section className="k-wrap py-24">
        <SectionHead title="Every artist, and everything they put out." sub="The front page is next. The artist page and the kit are ready to look at." />
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ButtonLink variant="key" size="l" href="/weird-sounding-dude">See an artist page</ButtonLink>
          <ButtonLink size="l" href="/kit">The kit</ButtonLink>
          <Cat name="lime" height={72} />
        </div>
      </section>
    </main>
  );
}
