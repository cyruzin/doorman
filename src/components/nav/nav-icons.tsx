// Simple stroke icons using currentColor — they inherit the nav link's text
// color automatically, so no separate light/dark variants are needed.
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

export function HomeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function NoticesIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 5.5h16a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9l-4 3.5V16H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" />
      <path d="M7.5 9.5h9M7.5 12.5h6" />
    </svg>
  );
}

export function ResidentsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 20c0-3.6 2.5-6.5 5.5-6.5s5.5 2.9 5.5 6.5" />
      <circle cx="17" cy="8" r="2.3" />
      <path d="M15.2 13.8c2.4.6 4.3 3 4.3 6.2" />
    </svg>
  );
}

export function ApartmentsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4.5" y="3" width="15" height="18" rx="1.2" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2" />
    </svg>
  );
}

export function MezaninoIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.2" />
      <path d="M3.5 13h17" />
      <path d="M7 13V8.5M12 13V8.5M17 13V8.5" />
    </svg>
  );
}

export function SchedulingIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="1.2" />
      <path d="M3.5 9h17M8 3v3M16 3v3" />
      <path d="M8 13h2M8 16.5h2M14 13h2M14 16.5h2" />
    </svg>
  );
}

export function ReportsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9 13h6M9 16.5h6" />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c0-4 3.1-7.2 7-7.2s7 3.2 7 7.2" />
    </svg>
  );
}

export function BackupsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <ellipse cx="12" cy="5.2" rx="7" ry="2.4" />
      <path d="M5 5.2v5.8c0 1.3 3.1 2.4 7 2.4s7-1.1 7-2.4V5.2" />
      <path d="M5 11v5.8c0 1.3 3.1 2.4 7 2.4s7-1.1 7-2.4V11" />
    </svg>
  );
}
