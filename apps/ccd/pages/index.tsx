import type { GetStaticProps } from "next";
import Home2 from "@/suite/home2/Home2";
import { getHomeData, type HomeData } from "@/lib/home";

// The home (plan ccd/v2-plan.md, section 3). The live-look home stays in src/pages/Index.tsx as the later theme.
export default Home2;

export const getStaticProps: GetStaticProps<HomeData> = async () => {
  const data = await getHomeData();
  return { props: data, revalidate: 600 };
};
