import { getStory } from "@/lib/home";

export { default } from "@/pages/ForArtists";

export async function getStaticProps() {
  const story = await getStory().catch(() => null);
  return { props: { story }, revalidate: 600 };
}
