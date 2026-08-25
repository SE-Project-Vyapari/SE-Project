export const colors = {
  background: '#F5F1EA',
  surface: '#FFFDF8',
  primary: '#C65D3A',
  dark: '#292522',
  secondary: '#D99A6C',
  text: '#252321',

  // Derived tones
  primaryHover: '#B25334', // darker primary
  primaryActive: '#9D492E',
  border: '#E4DDD0',
  success: '#5B7A5B',
  warning: '#B8863B',
  danger: '#B84A3E',
  mutedText: '#6B6560',
  transparent: 'transparent'
} as const;

export const typography = {
  fontFamily: {
    display: '"Fraunces", serif',
    sans: '"Inter", sans-serif',
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  sizes: {
    12: '12px',
    14: '14px',
    16: '16px',
    18: '18px',
    20: '20px',
    24: '24px',
    32: '32px',
    40: '40px',
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  }
} as const;

export const spacing = {
  4: '4px',
  8: '8px',
  12: '12px',
  16: '16px',
  24: '24px',
  32: '32px',
  48: '48px',
  64: '64px',
} as const;

export const radius = {
  small: '6px',
  medium: '10px',
  large: '14px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
} as const;

export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
} as const;
