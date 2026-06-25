/**
 * FarmAsyst North — Brand Logo Mark
 *
 * Concept: A stylised hen (poultry) whose body doubles as a rising bar-chart,
 * anchored by a wheat stalk. Captures the AgriFinTech identity — farming +
 * data intelligence + northern Ghana smallholder focus.
 *
 * Usage:
 *   <FarmAsystLogoMark size={36} />          — icon-only (sidebar, mobile bar, AI widget)
 *   <FarmAsystLogoMark size={52} />          — login page hero
 *   <FarmAsystLogoMark size={36} variant="ai" />  — AI teal variant
 */

interface LogoMarkProps {
  size?: number;
  variant?: 'default' | 'ai' | 'white';
  className?: string;
  style?: React.CSSProperties;
}

export function FarmAsystLogoMark({
  size = 36,
  variant = 'default',
  className = '',
  style,
}: LogoMarkProps) {
  // Colour palettes
  const palettes = {
    default: {
      bg: '#4A7C2F',
      body: '#fff',
      accent: '#F5A623',   // harvest gold — comb, beak, feet
      bars: '#A8D878',     // light green bars
      barTop: '#fff',
    },
    ai: {
      bg: '#0D6E8E',       // teal — AI mode
      body: '#fff',
      accent: '#4DD9AC',
      bars: '#B3EAD9',
      barTop: '#fff',
    },
    white: {
      bg: 'transparent',
      body: '#4A7C2F',
      accent: '#F5A623',
      bars: '#4A7C2F',
      barTop: '#4A7C2F',
    },
  };

  const p = palettes[variant];
  const r = size * 0.22;  // corner radius ~22%

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="FarmAsyst North"
    >
      {/* Background tile */}
      <rect width="40" height="40" rx={r * (40 / size)} fill={p.bg} />

      {/* ── Wheat stalk (left, subtle) ── */}
      {/* stem */}
      <line x1="9" y1="32" x2="9" y2="18" stroke={p.accent} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      {/* grains */}
      <ellipse cx="9" cy="17" rx="2.2" ry="1.3" fill={p.accent} opacity="0.7" transform="rotate(-15 9 17)" />
      <ellipse cx="7.5" cy="20" rx="1.8" ry="1.1" fill={p.accent} opacity="0.55" transform="rotate(20 7.5 20)" />
      <ellipse cx="10.5" cy="20" rx="1.8" ry="1.1" fill={p.accent} opacity="0.55" transform="rotate(-20 10.5 20)" />

      {/* ── Rising bar chart (body of the hen, right side) ── */}
      {/* bar 1 — short */}
      <rect x="17" y="26" width="4" height="6" rx="1" fill={p.bars} opacity="0.8" />
      {/* bar 2 — medium */}
      <rect x="22.5" y="22" width="4" height="10" rx="1" fill={p.bars} opacity="0.9" />
      {/* bar 3 — tall */}
      <rect x="28" y="17" width="4" height="15" rx="1" fill={p.body} />

      {/* ── Hen silhouette overlay on bars ── */}
      {/* body */}
      <ellipse cx="24" cy="24" rx="8" ry="6.5" fill={p.bg} opacity="0.18" />

      {/* head */}
      <circle cx="30.5" cy="15.5" r="3.8" fill={p.body} />

      {/* comb */}
      <path d="M29 12.5 Q29.5 10.5 30.5 11.5 Q31 9.5 31.5 11.5 Q32 10 32.5 12" stroke={p.accent} strokeWidth="1.3" fill="none" strokeLinecap="round" />

      {/* beak */}
      <path d="M33.8 15.8 L35.5 16.2 L33.6 17" fill={p.accent} />

      {/* wattle */}
      <ellipse cx="33.2" cy="17.2" rx="0.9" ry="1.2" fill={p.accent} opacity="0.9" />

      {/* eye */}
      <circle cx="31.2" cy="15" r="0.7" fill={p.bg} />

      {/* wing sweep */}
      <path d="M23 21 Q27 17.5 32 18.5" stroke={p.body} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.85" />

      {/* tail feathers */}
      <path d="M16 22 Q13 18 14.5 15" stroke={p.body} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M16.5 23 Q12.5 20 13.5 17" stroke={p.body} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" />

      {/* feet */}
      <path d="M22 32 L21 35 M22 32 L23 35 M22 32 L20.5 35" stroke={p.accent} strokeWidth="1" strokeLinecap="round" />
      <path d="M27 32 L26 35 M27 32 L28 35 M27 32 L25.5 35" stroke={p.accent} strokeWidth="1" strokeLinecap="round" />

      {/* chart upward-trend line (fintech signal) */}
      <polyline
        points="17,29 19,26 22,24 26,21 30,18"
        stroke={p.accent}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}

/** Full wordmark: icon + "FarmAsyst" + "North" stacked */
interface LogoFullProps {
  size?: number;
  variant?: 'default' | 'ai' | 'white';
  showSub?: boolean;
}

export function FarmAsystLogo({ size = 36, variant = 'default', showSub = true }: LogoFullProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <FarmAsystLogoMark size={size} variant={variant} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{
          fontFamily: 'var(--font-display, sans-serif)',
          fontWeight: 700,
          fontSize: size * 0.44,
          color: variant === 'white' ? '#4A7C2F' : '#fff',
          letterSpacing: '-0.01em',
        }}>
          FarmAsyst
        </span>
        {showSub && (
          <span style={{
            fontSize: size * 0.28,
            color: variant === 'ai' ? '#4DD9AC' : '#F5A623',
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
          }}>
            North
          </span>
        )}
      </div>
    </div>
  );
}
