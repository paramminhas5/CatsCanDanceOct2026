/** The suite's line icons: 24 grid, round caps, stroke 1.9. Decorative unless given a label. */
const P = {
  chev: <path d="M9 6l6 6-6 6" />,
  back: <path d="M15 6l-6 6 6 6" />,
  play: <path d="M8 5.5v13l11-6.5z" fill="currentColor" />,
  plus: <path d="M12 5v14M5 12h14" />,
  share: <path d="M12 4v11M7 9l5-5 5 5M5 20h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  cal: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M4 13h5l1 2h4l1-2h5" />
    </>
  ),
} as const;

export type IconName = keyof typeof P;

export function Icon({ name, size = 16, stroke = 1.9, label }: { name: IconName; size?: number; stroke?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {P[name]}
    </svg>
  );
}
