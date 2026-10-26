import React from 'react';

/**
 * L2gether Brand Logo Component
 * Custom interlocking L + 2 infinity code loop with luminous gradients
 */
export default function Logo({
  size = 'md', // 'sm' (24px), 'md' (32px), 'lg' (40px), 'xl' (50px)
  showText = true,
  subtitle = null,
  className = ''
}) {
  const sizeMap = {
    sm: { icon: 24, font: '1.05rem', subFont: '0.65rem', radius: 7 },
    md: { icon: 32, font: '1.25rem', subFont: '0.72rem', radius: 9 },
    lg: { icon: 40, font: '1.5rem', subFont: '0.8rem', radius: 12 },
    xl: { icon: 52, font: '1.85rem', subFont: '0.85rem', radius: 14 }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`l2gether-brand-logo ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '0.5rem' : '0.65rem',
        textDecoration: 'none',
        userSelect: 'none'
      }}
    >
      {/* SVG Vector Mark */}
      <div
        className="brand-icon-wrapper"
        style={{
          width: currentSize.icon,
          height: currentSize.icon,
          borderRadius: currentSize.radius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
          position: 'relative'
        }}
      >
        <svg
          viewBox="0 0 64 64"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block' }}
        >
          <defs>
            <linearGradient id={`bgG_${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E1B4B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            <linearGradient id={`lGrad_${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="45%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>

            <linearGradient id={`twoGrad_${size}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>

            <filter id={`glow_${size}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Badge Background */}
          <rect width="64" height="64" rx="16" fill={`url(#bgG_${size})`} stroke="#334155" strokeWidth="1.5" />

          {/* Connected Loops */}
          <g filter={`url(#glow_${size})`}>
            {/* L-Flow Loop */}
            <path
              d="M18 16 C18 14.5 19.5 13.5 21 14.5 L24 16.5 C26 18 26 21 26 24 L26 36 C26 40 29 43 33 43 L45 43 C47 43 48 45 47 47 L45 49 C43.5 50.5 41 51 38 51 L25 51 C19.5 51 15 46.5 15 41 L15 19 C15 17.5 16.5 16 18 16 Z"
              fill={`url(#lGrad_${size})`}
            />

            {/* 2-Flow Infinity Arch */}
            <path
              d="M32 15 C38 15 46 18 47 25 C48 31 42 36 37 40 L34 42 C38 42 45 41 49 39 C50.5 38.5 52 40 51 41.5 L49.5 43.5 C46.5 47 41 49 35 49 C33 49 31 48 31 46 C31 43.5 33 41 36 38.5 C41 34.5 43 31.5 42 27 C41 22.5 36.5 20 32 20 C28.5 20 25.5 21.5 24 23.5 L21.5 21 C24 17.5 27.5 15 32 15 Z"
              fill={`url(#twoGrad_${size})`}
            />

            {/* Synced Nodes */}
            <circle cx="33" cy="43" r="3" fill="#FFFFFF" />
            <circle cx="33" cy="43" r="5" stroke="#38BDF8" strokeWidth="1.2" opacity="0.8" />
            <circle cx="47" cy="25" r="2.5" fill="#FFFFFF" />
          </g>
        </svg>
      </div>

      {/* Typography Brand Text */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span
            style={{
              fontSize: currentSize.font,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'baseline'
            }}
          >
            L<span
              style={{
                background: 'linear-gradient(135deg, #38BDF8 0%, #6366F1 50%, #EC4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 900
              }}
            >
              2
            </span>gether
          </span>

          {subtitle && (
            <span
              style={{
                fontSize: currentSize.subFont,
                color: 'var(--text-muted)',
                fontWeight: 500,
                marginTop: '1px',
                letterSpacing: '0.01em'
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
