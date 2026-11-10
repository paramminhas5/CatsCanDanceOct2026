import type { GetStaticProps } from "next";
import Home3 from "@/suite/home3/Home3";
import { getHomeData, type HomeData } from "@/lib/home";

// The home v3 (plan ccd/v3-redesign.md; canvas board Main). Home2 stays in src/suite/home2 for parts it shares.
export default Home3;

export const getStaticProps: GetStaticProps<HomeData> = async () => {
  const data = await getHomeData();
  return { props: data, revalidate: 600 };
};
