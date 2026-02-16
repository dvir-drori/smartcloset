export const Colors = {
  primary: '#2D3436',
  accent: '#6C5CE7',
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#E17055',
  background: '#FFFFFF',
  surface: '#F5F6FA',
  textPrimary: '#2D3436',
  textSecondary: '#636E72',
  border: '#DFE6E9',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const BorderRadius = {
  card: 8,
  button: 12,
  avatar: 50,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
