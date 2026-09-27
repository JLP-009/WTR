interface ClubLogoProps {
  size?: number;
  className?: string;
}

export default function ClubLogo({ size = 40, className = '' }: ClubLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Warangal Trading Ring 2.0"
      width={size}
      height={size}
      className={`object-contain inline-block shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}
