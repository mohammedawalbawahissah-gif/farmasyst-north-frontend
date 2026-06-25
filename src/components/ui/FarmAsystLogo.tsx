/**
 * FarmAsystLogo
 *
 * Shared geometric logo mark for FarmAsyst North.
 * - Square (rounded corners): sidebar, login, mobile topbar
 * - Circle: AI widget bubble, AI chat avatar, AI tab headers
 *
 * The mark: a geometric rooster head. The comb's 3 rising triangles
 * read simultaneously as a bird's comb AND a bar/growth chart —
 * agriculture and fintech unified in one gesture.
 *
 * Usage:
 *   <FarmAsystLogo size={36} />                    // sidebar (rounded square)
 *   <FarmAsystLogo size={52} />                    // login page
 *   <FarmAsystLogo size={30} />                    // mobile topbar
 *   <FarmAsystLogo size={40} circle />             // AI widget bubble
 *   <FarmAsystLogo size={28} circle />             // AI chat message avatar
 */

interface FarmAsystLogoProps {
  size?: number;
  /** Render as a circle — used for all AI-facing instances */
  circle?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const C = {
  deep:    '#2D4A1E',
  leaf:    '#4A7C2F',
  harvest: '#E8A020',
  wattle:  '#C0392B',
};

export default function FarmAsystLogo({
  size = 36,
  circle = false,
  className,
  style,
}: FarmAsystLogoProps) {
  const cornerRadius = circle ? 50 : size >= 48 ? 22 : size >= 36 ? 18 : 14;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="FarmAsyst North"
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <title>FarmAsyst North</title>

      {/* Background */}
      <rect x="0" y="0" width="100" height="100" rx={cornerRadius} fill={C.deep} />

      {/* Head */}
      <circle cx="50" cy="66" r="28" fill={C.leaf} />

      {/* Comb: 3 rising triangles = comb + bar chart */}
      <polygon points="22,42 28,24 34,42" fill={C.harvest} />
      <polygon points="34,42 42,14 50,42" fill={C.harvest} />
      <polygon points="48,42 58,4  68,42" fill={C.harvest} />

      {/* Base bridging comb to head */}
      <rect x="22" y="39" width="46" height="7" fill={C.leaf} />

      {/* Beak */}
      <polygon points="72,60 90,66 72,72" fill={C.harvest} />

      {/* Wattle */}
      <ellipse cx="72" cy="75" rx="4.5" ry="6" fill={C.wattle} />

      {/* Eye */}
      <circle cx="57" cy="62" r="6.5" fill={C.deep} />
      <circle cx="57" cy="62" r="2.8" fill={C.harvest} />
    </svg>
  );
}

/**
 * FarmAsystLogoFull — mark + wordmark, used in sidebar and login header
 */
interface FarmAsystLogoFullProps {
  size?: number;
  showText?: boolean;
}

export function FarmAsystLogoFull({ size = 36, showText = true }: FarmAsystLogoFullProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <FarmAsystLogo size={size} />
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span style={{
            fontFamily: 'Georgia, serif',
            fontWeight: 700,
            fontSize: 16,
            color: '#FFFFFF',
            letterSpacing: '-0.01em',
          }}>
            FarmAsyst
          </span>
          <span style={{
            fontSize: 10,
            color: '#E8A020',
            letterSpacing: '0.22em',
            textTransform: 'uppercase' as const,
            fontWeight: 600,
          }}>
            North
          </span>
        </div>
      )}
    </div>
  );
}
