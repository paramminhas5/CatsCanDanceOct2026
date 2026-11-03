import type { GetStaticProps } from "next";
import BookDesk, { type BookDeskProps } from "@/pages/BookDesk";
import { getDeskArtists } from "@/lib/booking-desk-server";
import { todayIST } from "@/lib/nights";

export default BookDesk;

// The roster ships in the HTML. Dates, gigs and settings refresh every 10 minutes.
export const getStaticProps: GetStaticProps<BookDeskProps> = async () => {
  const { artists, live } = await getDeskArtists();
  return { props: { artists, live, updated: todayIST() }, revalidate: 600 };
};
