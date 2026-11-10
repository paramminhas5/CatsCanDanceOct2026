import type { GetStaticProps } from "next";
import Home4 from "@/suite/home4/Home4";
import { getHomeData, type HomeData } from "@/lib/home";

// The home v4 (round 3, 10 Nov 2026): rotating colour stage, the week ring, visual feature grids. Home3 and Home2 stay for parts they share.
export default Home4;

export const getStaticProps: GetStaticProps<HomeData> = async () => {
  const data = await getHomeData();
  return { props: data, revalidate: 600 };
};
