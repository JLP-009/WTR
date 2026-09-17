interface ClubLogoProps {
  size?: number;
  className?: string;
}

export default function ClubLogo({ size = 40, className = '' }: ClubLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Warangal Trading Ring"
      className={className}
    >
      {/* Outer ring */}
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      {/* Inner ring */}
      <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      {/* Shield body */}
      <path
        d="M20 8L28 12V20C28 24.4 24.4 28.4 20 30C15.6 28.4 12 24.4 12 20V12L20 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Inner mark */}
      <path
        d="M17 20L19.5 22.5L23 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
