/**
 * Design Tokens
 * Premium gray-based theme (inspired by NotebookLM, Notion, Linear)
 * Not light mode, not dark mode - calm, neutral, sophisticated
 */

export const colors = {
  // Primary (very muted blue)
  primary: '#8B9DC3',
  primaryHover: '#7B8DB3',
  primaryLight: '#2F3338',
  
  // Neutral (flat gray scale - low contrast)
  background: '#1F1F1F',        // Main background
  surface: '#1F1F1F',            // Same as background (flat!)
  surfaceElevated: '#252525',    // Very subtle elevation
  border: '#2A2A2A',             // Almost invisible borders
  borderDark: '#333333',         // Slightly more visible
  
  // Text (muted, low contrast)
  textPrimary: '#C5C5C5',        // Main text (muted gray)
  textSecondary: '#8A8A8A',      // Secondary text (darker gray)
  textTertiary: '#5A5A5A',       // Tertiary text (very dark gray)
  
  // Semantic (muted versions)
  success: '#4ADE80',
  warning: '#FCD34D',
  error: '#F87171',
  info: '#60A5FA',
  
  // Accent (muted)
  accentPink: '#F472B6',
  accentPurple: '#A78BFA',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  h2: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
} as const;

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  card: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  cardHover: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
} as const;
