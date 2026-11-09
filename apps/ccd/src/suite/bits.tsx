/** Small pieces the Nights suite pages share. */
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function dayLabel(iso: string | null | undefined) {
  if (!iso) return "Date to come";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
}
export const city = (c: string | null | undefined) => (c ?? "").split(",")[0].trim();
