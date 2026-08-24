// Same stroke-icon convention as src/components/nav/nav-icons.tsx.
type IconProps = { className?: string };

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function PartyHallIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 20 12 4l8 16" />
      <path d="M7.5 13h9M6 16.5h12" />
    </svg>
  );
}

export function CinemaIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="6" width="17" height="12" rx="1.2" />
      <path d="M8 6l-2 3.5M14 6l-2 3.5M20 6l-2 3.5" />
    </svg>
  );
}

export function GrillIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <ellipse cx="12" cy="9" rx="7.5" ry="2.2" />
      <path d="M6 9v4.5c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V9" />
      <path d="M12 15.7V20M9 20h6" />
    </svg>
  );
}
