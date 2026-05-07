/* global React */
const { useState } = React;

// Brand-styled mini icon set (Lucide-style strokes)
const Icon = ({ name, size = 20, color = "currentColor", strokeWidth = 1.75 }) => {
  const paths = {
    home: <><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></>,
    receipt: <><path d="M5 3h14v18l-3-2-3 2-3-2-3 2-2-2V3z"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
    shield: <><path d="M12 3l8 4v6c0 5-3.5 7.5-8 8-4.5-.5-8-3-8-8V7l8-4z"/></>,
    wallet: <><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="14" r="1.2" fill={color}/></>,
    wrench: <><path d="M14 6a4 4 0 1 0 4 4l3 3-2 2-3-3a4 4 0 0 1-4-4z"/><path d="M11 9l-7 7 2 2 7-7"/></>,
    bell: <><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16z"/><path d="M10 20a2 2 0 0 0 4 0"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    check: <><path d="M5 12l5 5 9-11"/></>,
    chevron: <><path d="M9 6l6 6-6 6"/></>,
    camera: <><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6l1.5-2h5L16 6"/><circle cx="12" cy="13" r="3.5"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></>,
    document: <><path d="M14 3H6v18h12V8z"/><path d="M14 3v5h4"/><path d="M9 13h6M9 17h4"/></>,
    arrow: <><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></>,
    lock: <><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

// Logo mark component
const LogoMark = ({ size = 32, radius = 8 }) => (
  <div style={{ width: size, height: size, borderRadius: radius, background: "#0F4C5C", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 80% 12%, rgba(201,122,58,.32), transparent 55%)" }}/>
    <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 512 512" style={{ position: "relative", zIndex: 1 }}>
      <g fill="#F6F4EE">
        <path d="M138 108 h120 c52 0 88 32 88 80 0 36 -20 62 -52 74 l68 142 h-66 l-60 -130 h-44 v130 h-54 z M192 156 v124 h60 c30 0 50 -22 50 -50 v-24 c0 -28 -20 -50 -50 -50 z"/>
        <rect x="298" y="362" width="22" height="14" rx="2"/>
        <rect x="328" y="362" width="14" height="14" rx="2"/>
        <circle cx="384" cy="396" r="10" fill="#C97A3A"/>
      </g>
    </svg>
  </div>
);

// Status pill
const Pill = ({ tone = "neutral", children }) => {
  const tones = {
    success: { bg: "#DEEFE6", fg: "#1F7A55" },
    warning: { bg: "#F6E6CA", fg: "#B8740F" },
    danger:  { bg: "#F3DAD6", fg: "#B33A2E" },
    info:    { bg: "#DDE8EB", fg: "#0F4C5C" },
    accent:  { bg: "#F4E5D4", fg: "#C97A3A" },
    neutral: { bg: "#F0EFE9", fg: "#5C645F" },
  }[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, background: tones.bg, color: tones.fg, fontSize: 11, fontWeight: 600, letterSpacing: ".01em" }}>
      {children}
    </span>
  );
};

// Brand button
const Button = ({ variant = "primary", size = "md", children, leftIcon, onClick, fullWidth }) => {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    fontFamily: "DM Sans, sans-serif", fontWeight: 600, borderRadius: 999, border: "none",
    cursor: "pointer", transition: "all .18s cubic-bezier(.22,1,.36,1)", whiteSpace: "nowrap",
    width: fullWidth ? "100%" : "auto", letterSpacing: "-0.005em",
  };
  const sizes = {
    sm: { padding: "8px 14px", fontSize: 13 },
    md: { padding: "12px 22px", fontSize: 14 },
    lg: { padding: "14px 26px", fontSize: 15 },
  }[size];
  const variants = {
    primary:   { background: "#0F4C5C", color: "#fff" },
    secondary: { background: "#fff", color: "#0E1413", border: "1px solid #E6E2D7" },
    ghost:     { background: "transparent", color: "#0E1413" },
    danger:    { background: "#B33A2E", color: "#fff" },
    accent:    { background: "#C97A3A", color: "#fff" },
  }[variant];
  return (
    <button onClick={onClick} style={{ ...base, ...sizes, ...variants }}>
      {leftIcon}{children}
    </button>
  );
};

// Card
const Card = ({ children, style }) => (
  <div style={{ background: "#fff", border: "1px solid #EBE7DB", borderRadius: 18, padding: 18, boxShadow: "0 1px 2px rgba(20,18,12,.04), 0 2px 8px rgba(20,18,12,.05)", ...style }}>
    {children}
  </div>
);

const Eyebrow = ({ children, color = "#5C645F" }) => (
  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color }}>{children}</span>
);

window.RB = { Icon, LogoMark, Pill, Button, Card, Eyebrow };
