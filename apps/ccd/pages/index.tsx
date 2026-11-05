import type { GetStaticProps } from "next";
import Index from "@/pages/Index";
import { getHomeData, type HomeData } from "@/lib/home";

export default Index;

// The home ships with real data in the HTML: next Episode, this week's nights, the roster, the tour.
export const getStaticProps: GetStaticProps<HomeData> = async () => {
  const data = await getHomeData();
  return { props: data, revalidate: 600 };
};
