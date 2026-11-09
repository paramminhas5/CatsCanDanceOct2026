import type { GetStaticProps } from "next";
import HomeSuite from "@/suite/HomeSuite";
import { getHomeData, type HomeData } from "@/lib/home";

// The home on the suite look (board W39-Home). The live-look home stays in src/pages/Index.tsx as the later theme.
export default HomeSuite;

export const getStaticProps: GetStaticProps<HomeData> = async () => {
  const data = await getHomeData();
  return { props: data, revalidate: 600 };
};
