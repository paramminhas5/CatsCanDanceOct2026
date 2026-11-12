/**
 * The mark: an acid rounded square with an ink "H" cut like a marquee letter. Works at 16px and as
 * an app icon. The letter comes from the product name, so a rename changes it too.
 */
import { NAME } from "@/lib/site";

export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  const letter = NAME.trim().charAt(0).toUpperCase() || "H";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className} focusable="false">
      <rect width="64" height="64" rx="16" fill="#b6ef36" />
      {letter === "H" ? (
        <path d="M17 12h10v17h10V12h10v40H37V38H27v14H17z" fill="#0a0a0c" />
      ) : (
        <text x="32" y="46" textAnchor="middle" fontFamily="Bricolage Grotesque, Inter Tight, system-ui, sans-serif" fontWeight="800" fontSize="40" fill="#0a0a0c">{letter}</text>
      )}
      {/* The marquee bulbs along the crossbar. */}
      <g fill="#b6ef36">
        <circle cx="26" cy="33.5" r="1.4" /><circle cx="32" cy="33.5" r="1.4" /><circle cx="38" cy="33.5" r="1.4" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark size={26} />
      <span className="wordmark text-[17px] leading-none">{NAME}</span>
    </span>
  );
}
