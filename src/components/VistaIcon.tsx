import React from 'react';

export interface IconProps {
  name: string;
  color?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const ICONS: Record<string, string[]> = {
  home: ['M2.5 6.6 8 2.2l5.5 4.4V13a.6.6 0 0 1-.6.6H3.1a.6.6 0 0 1-.6-.6z'],
  lens: ['M7.2 11.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4z', 'M10.4 10.4 13.6 13.6'],
  rivals: ['M5.4 10.8a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z', 'M10.6 10.8a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z'],
  spark: ['M8 2.2 11.2 8 8 13.8 4.8 8z'],
  list: ['M3 4.4h10', 'M3 8h6.5', 'M3 11.6h10'],
  bars: ['M4 13V7.4', 'M8 13V3.2', 'M12 13V9.4'],
  bulb: ['M8 2.6a3.4 3.4 0 0 1 1.9 6.2V11H6.1V8.8A3.4 3.4 0 0 1 8 2.6z', 'M6.6 13.2h2.8'],
  link: ['M6.9 9.1 9.1 6.9', 'M5.6 10.4a2.6 2.6 0 0 1 0-3.7l1-1', 'M10.4 5.6a2.6 2.6 0 0 1 0 3.7l-1 1'],
  gap: ['M4.2 3.6v8.8', 'M11.8 3.6v8.8', 'M6.6 8h2.8'],
  doc: ['M4 2.6h5.4L12 5.2V13.4H4z', 'M5.8 8.6h4.4', 'M5.8 11h3'],
  team: ['M6.4 7.6a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z', 'M2.8 13.2c0-2 1.6-3.4 3.6-3.4s3.6 1.4 3.6 3.4', 'M11 4.2a2 2 0 0 1 0 3.9'],
  plug: ['M6 2.8v3', 'M10 2.8v3', 'M4.4 5.8h7.2v2.4A3.6 3.6 0 0 1 8 11.8 3.6 3.6 0 0 1 4.4 8.2z', 'M8 11.8v2.2'],
  gear: ['M8 10.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z', 'M8 2.4v1.6', 'M8 12v1.6', 'M2.4 8H4', 'M12 8h1.6'],
  globe: ['M8 13.6a5.6 5.6 0 1 0 0-11.2 5.6 5.6 0 0 0 0 11.2z', 'M2.6 8h10.8', 'M8 2.4c1.6 1.7 2.4 3.6 2.4 5.6S9.6 11.9 8 13.6C6.4 11.9 5.6 10 5.6 8s.8-3.9 2.4-5.6z'],
  brain: ['M8 13.4a5.4 5.4 0 1 0 0-10.8 5.4 5.4 0 0 0 0 10.8z', 'M8 5.8v4.4', 'M6 8h4'],
  bot: ['M4.2 5.6h7.6v5.2H4.2z', 'M8 3v2.6', 'M6.2 8.2h.01', 'M9.8 8.2h.01'],
  bell: ['M8 2.8a3.6 3.6 0 0 1 3.6 3.6v2.2l1 2h-9.2l1-2V6.4A3.6 3.6 0 0 1 8 2.8z', 'M6.7 12.2a1.4 1.4 0 0 0 2.6 0'],
  plus: ['M8 3.4v9.2', 'M3.4 8h9.2'],
  bolt: ['M9.2 2.4 4.8 8.8h2.6l-.6 4.8 4.4-6.4H8.6z']
};

export const VistaIcon: React.FC<IconProps> = ({ name, color = '#64748b', size = 16, className, style }) => {
  const paths = ICONS[name] || ICONS.spark;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      style={{ flex: 'none', display: 'block', ...style }}
    >
      {paths.map((p, idx) => (
        <path
          key={idx}
          d={p}
          stroke={color}
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
};

export const AIVistaLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className }) => {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.94)}
      viewBox="0 0 32 30"
      fill="none"
      className={className}
      style={{ display: 'block', flex: 'none' }}
    >
      <defs>
        <linearGradient id="av_grad_left" x1="0%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="av_grad_right" x1="50%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5 L3.2 24.2 C2.5 25.4 3.4 27 4.8 27 L11.2 27 C12.2 27 13.1 26.4 13.6 25.5 L16 20.8 L18.4 25.5 C18.9 26.4 19.8 27 20.8 27 L27.2 27 C28.6 27 29.5 25.4 28.8 24.2 Z"
        fill="url(#av_grad_left)"
      />
      <path
        d="M16 2.5 L28.8 24.2 C29.5 25.4 28.6 27 27.2 27 L20.8 27 C19.8 27 18.9 26.4 18.4 25.5 L16 20.8 L19.2 14.4 C19.8 13.2 21.2 12.8 22.3 13.4 L24.5 14.6 L16 2.5 Z"
        fill="url(#av_grad_right)"
        opacity={0.88}
      />
      <circle cx="16" cy="18" r="2.2" fill="#fff" />
    </svg>
  );
};
