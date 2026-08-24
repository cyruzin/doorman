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

export function GameRoomIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="8" width="18" height="9" rx="3" />
      <path d="M7 12.5h3M8.5 11v3" />
      <circle cx="15" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function GymIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 12h1.5M18.5 12H20" />
      <rect x="5.5" y="9.5" width="2" height="5" rx="0.6" />
      <rect x="16.5" y="9.5" width="2" height="5" rx="0.6" />
      <path d="M7.5 12h9" />
    </svg>
  );
}

export function KidsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="6" r="2.3" />
      <path d="M6 20l2.5-7h7L18 20" />
      <path d="M8.5 13l-2-3.5M15.5 13l2-3.5" />
    </svg>
  );
}
