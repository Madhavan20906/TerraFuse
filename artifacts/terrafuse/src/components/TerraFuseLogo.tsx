import React from 'react';

interface TerraFuseLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const TerraFuseLogo: React.FC<TerraFuseLogoProps> = ({
  size = 32,
  className = '',
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 180 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="tfLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#041F17" />
            <stop offset="50%" stop-color="#063226" />
            <stop offset="100%" stop-color="#02140F" />
          </linearGradient>

          <linearGradient id="tfTerraGrad" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stop-color="#34D399" />
            <stop offset="50%" stop-color="#10B981" />
            <stop offset="100%" stop-color="#047857" />
          </linearGradient>

          <linearGradient id="tfFuseGrad" x1="0%" y1="30%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38BDF8" />
            <stop offset="50%" stop-color="#06B6D4" />
            <stop offset="100%" stop-color="#0D9488" />
          </linearGradient>

          <filter id="tfSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Squircle Base with Emerald Border */}
        <rect
          x="3"
          y="3"
          width="174"
          height="174"
          rx="44"
          fill="url(#tfLogoBg)"
          stroke="#10B981"
          strokeOpacity="0.45"
          strokeWidth="5"
        />

        {/* Subtle Shield Perimeter Arc */}
        <path
          d="M42 54C42 42 66 34 90 34C114 34 138 42 138 54V98C138 126 112 144 90 152C68 144 42 126 42 98V54Z"
          stroke="url(#tfFuseGrad)"
          strokeWidth="3"
          strokeOpacity="0.28"
          strokeDasharray="5 5"
          fill="none"
        />

        {/* Left / Lower Leaf & Circular Loop (Terra) */}
        <path
          d="M90 42C64 42 48 64 48 90C48 116 68 134 90 134C108 134 122 122 124 104C125 94 116 86 106 86C96 86 88 94 88 104C88 110 82 116 74 114C64 111 58 102 58 90C58 72 72 58 90 58C108 58 122 72 122 90"
          stroke="url(#tfTerraGrad)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#tfSoftGlow)"
        />

        {/* Right / Upper Protective Interlock (Fuse & Shield) */}
        <path
          d="M90 42C116 42 132 64 132 90C132 116 114 134 90 134"
          stroke="url(#tfFuseGrad)"
          strokeWidth="11"
          strokeLinecap="round"
        />

        {/* Organic Central Vein / Spark Node */}
        <path d="M74 106L106 74" stroke="#6EE7B7" strokeWidth="7" strokeLinecap="round" />

        {/* Central Decision Fusion Core */}
        <circle cx="90" cy="90" r="8" fill="#F0FDF4" stroke="#10B981" strokeWidth="3" />
        <circle cx="90" cy="90" r="3.5" fill="#047857" />
      </svg>

      {showText && (
        <span className="font-bold tracking-tight text-[17px] text-foreground">
          terra<span className="text-emerald-500">fuse</span>
        </span>
      )}
    </div>
  );
};
export default TerraFuseLogo;
