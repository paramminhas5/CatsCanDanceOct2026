/**
 * The Gate mark and wordmark (docs/platform-split.md, section 3).
 * Mark: a yellow laminate (rounded rectangle with a slot for the lanyard) carrying a black G.
 * Wordmark: GATE in Anton with the yellow-black stripe cutting through the bar of the A.
 * Both are inline SVG so they ship with no extra request and inherit nothing they should not.
 */
import { PRODUCTS } from "@ccd/brand";

export function GateMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <rect x="6" y="2" width="52" height="60" rx="10" fill="#ffe600" />
      <rect x="22" y="8" width="20" height="5" rx="2.5" fill="#0a0a0a" />
      <text x="32" y="52" textAnchor="middle" fontFamily="Anton, 'Bebas Neue', Impact, sans-serif" fontSize="38" fill="#0a0a0a">G</text>
    </svg>
  );
}

export function GateWordmark({ height = 28, className, label = PRODUCTS.gate.name }: { height?: number; className?: string; label?: string }) {
  // 4 letters at ~0.55em width each in Anton: a 100 x 36 box reads at any size.
  const width = Math.round(height * (100 / 36));
  const id = "gate-stripe";
  return (
    <svg width={width} height={height} viewBox="0 0 100 36" className={className} role="img" aria-label={label} focusable="false">
      <defs>
        <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="4" height="8" fill="#ffe600" />
          <rect x="4" width="4" height="8" fill="#0a0a0a" />
        </pattern>
      </defs>
      <text x="0" y="33" fontFamily="Anton, 'Bebas Neue', Impact, sans-serif" fontSize="40" letterSpacing="1" fill="currentColor">
        GATE
      </text>
      {/* the stripe through the bar of the A */}
      <rect x="28" y="20" width="22" height="5" fill={`url(#${id})`} />
    </svg>
  );
}
