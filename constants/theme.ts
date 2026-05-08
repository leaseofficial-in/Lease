// RentyBase design tokens — aligned with marketing-page color system

export const Colors = {
  // ── Brand ──────────────────────────────────────
  primary:     '#0E1413',  // near-black ink
  action:      '#0F4C5C',  // Trust Teal — buttons, links, active states
  actionSoft:  '#DDE8EB',  // teal tint — badge backgrounds
  accent:      '#C97A3A',  // Seal Ochre — premium moments, seals
  accentSoft:  '#F4E5D4',  // ochre tint

  // ── Semantic ────────────────────────────────────
  success:     '#1F7A55',
  successSoft: '#DEEFE6',
  warning:     '#B8740F',
  warningSoft: '#F6E6CA',
  danger:      '#B33A2E',
  dangerSoft:  '#F3DAD6',

  // ── Text ────────────────────────────────────────
  ink2:   '#2A332F',  // secondary text
  ink3:   '#5C645F',  // tertiary / captions
  muted:  '#8E948D',  // placeholder / disabled

  // ── Surfaces ────────────────────────────────────
  surface:    '#FFFFFF',
  background: '#EFEDE5',  // outer page bg (canvas-2)
  canvas:     '#F6F4EE',  // warm off-white (sidebar, cards)
  fill:       '#F0EFE9',  // tertiary fill
  fill2:      '#E6E2D7',  // divider-strength fill

  // ── Borders ─────────────────────────────────────
  border:     '#E6E2D7',
  borderSoft: '#EBE7DB',

  cardShadow: 'rgba(20,18,12,0.05)',
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const Radius = {
  sm:   8,
  md:   14,
  lg:   18,
  xl:   22,
  xxl:  28,
  full: 9999,
} as const;

export const Fonts = {
  sans:        'Geist_400Regular',
  sansMedium:  'Geist_500Medium',
  sansSemiBold:'Geist_600SemiBold',
  sansBold:    'Geist_700Bold',
  serif:       'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  mono:        'Geist_500Medium',
} as const;

export const FontSize = {
  xs:      11,
  sm:      13,
  base:    15,
  md:      17,
  lg:      20,
  xl:      24,
  xxl:     30,
  display: 36,
} as const;

export const FontWeight = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
};

export const Shadow = {
  card: {
    shadowColor: 'rgba(20,18,12,1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  modal: {
    shadowColor: 'rgba(20,18,12,1)',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;
