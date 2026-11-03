import type { GetStaticProps } from "next";
import Tour, { type TourProps } from "@/pages/Tour";
import { loadTourBoard } from "@/lib/tour";
import { todayIST } from "@/lib/nights";

export default Tour;

// On tour (Strays). Built here so the list ships in the HTML; refreshed every 10 minutes.
export const getStaticProps: GetStaticProps<TourProps> = async () => {
  const { stops, live } = await loadTourBoard();
  return { props: { stops, live, updated: todayIST() }, revalidate: 600 };
};
