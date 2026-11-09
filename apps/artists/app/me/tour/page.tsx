import TourPost from "@/components/TourPost";
import { getMember } from "@/lib/auth";

export default async function MeTour() {
  const m = await getMember();
  return (
    <div className="grid max-w-[1000px] gap-6">
      <div>
        <h1 className="k-d text-[44px] md:text-[56px]">Put a tour up</h1>
        <p className="k-b mt-2 text-[17px]">Add each city and the dates. Mark the nights you are free so promoters there can ask for them.</p>
      </div>
      <TourPost act={m?.display_name ?? ""} email={m?.email ?? ""} instagram="" />
    </div>
  );
}
