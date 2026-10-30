/**
 * MarqueeBySlot — renders a Marquee for a named slot, or nothing.
 * Currently returns null for all slots (marquees are admin-managed content).
 * When Supabase is connected, this can fetch from site_settings.
 */
import Marquee from "@/components/Marquee";
import { useMarquees, type MarqueeSlotId } from "@/hooks/useMarquees";

const MarqueeBySlot = ({ id }: { id: MarqueeSlotId }) => {
  const items = useMarquees(id);
  if (!items || items.length === 0) return null;
  return <Marquee bg="bg-magenta" items={items} />;
};

export default MarqueeBySlot;
