export const Colors = {
  primary: '#08090A',
  ink2: '#2A2D31',
  ink3: '#5C6068',
  action: '#2E5BFF',
  success: '#0E8E63',
  warning: '#B8740F',
  danger: '#C2362F',
  surface: '#FFFFFF',
  border: '#E4E6EA',
  borderSoft: '#EFF1F4',
  muted: '#9097A0',
  background: '#F5F6F8',
  canvas: '#F2F0EB',
  fill: '#F5F6F8',
  fill2: '#ECEEF1',
  actionSoft: '#EAF0FF',
  successSoft: '#E1F4EC',
  warningSoft: '#FBEDD3',
  dangerSoft: '#FBE2E0',
  cardShadow: 'rgba(0,0,0,0.06)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  full: 9999,
} as const;

export const Fonts = {
  sans: 'Geist_400Regular',
  sansMedium: 'Geist_500Medium',
  sansSemiBold: 'Geist_600SemiBold',
  sansBold: 'Geist_700Bold',
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  mono: 'Geist_500Medium',
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  display: 36,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;
