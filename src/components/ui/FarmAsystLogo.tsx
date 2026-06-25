/**
 * FarmAsystLogo — brand mark for FarmAsyst North
 *
 * Design concept: A stylised poultry chick body formed from a rising
 * seed/sprout shape, with a fintech trend-line arc cutting through the top.
 * Conveys: farming (seed + chick silhouette), growth (sprout), data-driven
 * agri-fintech (upward line graph arc), and northern Ghana (warm earth green).
 *
 * Usage:
 *   <FarmAsystLogo size={36} />           // icon only (for sidebar mark)
 *   <FarmAsystLogo size={36} wordmark />   // icon + "FarmAsyst North" text
 *   <FarmAsystLogo size={36} aiMode />     // teal tint for AI widget
 */

import React from 'react';

interface FarmAsystLogoProps {
  /** Height (and width) of the icon in pixels. Default 36. */
  size?: number;
  /** Show "FarmAsyst / North" wordmark beside the mark. Default false. */
  wordmark?: boolean;
  /** Teal AI-mode tint instead of the standard harvest green. Default false. */
  aiMode?: boolean;
  /** Extra className on the wrapper. */
  className?: string;
  style?: React.CSSProperties;
}

export function FarmAsystLogoMark({
  size = 36,
  aiMode = false,
}: Pick<FarmAsystLogoProps, 'size' | 'aiMode'>) {
  const primary = aiMode ? '#0D8E8E' : '#4A7C2F';
  const accent  = aiMode ? '#47BFBF' : '#A8C86A';
  const light   = aiMode ? '#E0F5F5' : '#F0F7E0';
  const s = size;

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="FarmAsyst North"
      role="img"
    >
      {/* ── Background rounded square ── */}
      <rect width="40" height="40" rx="9" fill={primary} />

      {/* ── Seed / body shape — teardrop pointing up ── */}
      {/* Wide base = chick body; narrow top = sprouting seed tip */}
      <path
        d="M20 8 C14 8 10 13 10 19 C10 25 14 30 20 32 C26 30 30 25 30 19 C30 13 26 8 20 8 Z"
        fill={light}
        opacity="0.18"
      />

      {/* ── Chick body — filled ellipse ── */}
      <ellipse cx="20" cy="23" rx="7" ry="6" fill={light} />

      {/* ── Chick head ── */}
      <circle cx="20" cy="15.5" r="4" fill={light} />

      {/* ── Beak ── */}
      <path
        d="M21.6 15.2 L23.4 16.0 L21.6 16.8 Z"
        fill={accent}
      />

      {/* ── Eye ── */}
      <circle cx="18.8" cy="14.8" r="0.8" fill={primary} />

      {/* ── Wing hint — right side curve ── */}
      <path
        d="M26.2 21 Q29 19 28 24"
        stroke={accent}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Fintech trend-line arc across the top of body ── */}
      {/* Represents data / agri-finance going upward */}
      <path
        d="M11 26 L14 23 L17 24.5 L20 21 L23 22.5 L26 19 L29 20"
        stroke={accent}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.85"
      />

      {/* ── Sprout line — thin stalk at top of head ── */}
      <line x1="20" y1="11.5" x2="20" y2="8" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
      {/* Leaf left */}
      <path d="M20 9.5 Q17 8 16 10 Q18 10.5 20 9.5 Z" fill={accent} />
      {/* Leaf right */}
      <path d="M20 9.5 Q23 8 24 10 Q22 10.5 20 9.5 Z" fill={accent} />

      {/* ── Feet ── */}
      <line x1="17.5" y1="29" x2="16" y2="33" stroke={accent} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="22.5" y1="29" x2="24" y2="33" stroke={accent} strokeWidth="1.3" strokeLinecap="round" />
      {/* Toes */}
      <line x1="16" y1="33" x2="14.2" y2="33.8" stroke={accent} strokeWidth="1.1" strokeLinecap="round" />
      <line x1="16" y1="33" x2="16.5" y2="34.5" stroke={accent} strokeWidth="1.1" strokeLinecap="round" />
      <line x1="24" y1="33" x2="25.8" y2="33.8" stroke={accent} strokeWidth="1.1" strokeLinecap="round" />
      <line x1="24" y1="33" x2="23.5" y2="34.5" stroke={accent} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export default function FarmAsystLogo({
  size = 36,
  wordmark = false,
  aiMode = false,
  className = '',
  style,
}: FarmAsystLogoProps) {
  const primary = aiMode ? '#0D8E8E' : '#4A7C2F';

  if (!wordmark) {
    return <FarmAsystLogoMark size={size} aiMode={aiMode} />;
  }

  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: 10, ...style }}
    >
      <FarmAsystLogoMark size={size} aiMode={aiMode} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span
          style={{
            fontFamily: 'var(--font-display, "Inter", sans-serif)',
            fontWeight: 700,
            fontSize: size * 0.44,
            color: primary,
            letterSpacing: '-0.02em',
          }}
        >
          FarmAsyst
        </span>
        <span
          style={{
            fontFamily: 'var(--font-display, "Inter", sans-serif)',
            fontWeight: 500,
            fontSize: size * 0.30,
            color: '#888',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          North
        </span>
      </div>
    </div>
  );
}
