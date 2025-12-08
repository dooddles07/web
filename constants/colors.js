// ResQYou Web App Color Constants
// Matching mobile app's maroon theme (60:30:10 color rule)

export const Colors = {
  // Primary Colors (60%) - Maroon Theme
  primary: {
    main: '#800000',        // Maroon - Professional urgency & critical action
    dark: '#5c0000',        // Darker maroon for hover/active states
    light: '#a64d4d',       // Light maroon for highlights
    background: '#f5e6e6',  // Very light maroon for backgrounds
  },

  // Secondary Colors (30%) - Gray Scale
  secondary: {
    gray50: '#f5f5f5',
    gray100: '#e8e8e8',
    gray200: '#d4d4d4',
    gray300: '#b8b8b8',
    gray400: '#999999',
    gray500: '#777777',     // Base gray
    gray600: '#5a5a5a',
    gray700: '#3d3d3d',
    gray800: '#2b2b2b',
    gray900: '#1a1a1a',
  },

  // Accent Colors (10%) - Strategic Actions
  accent: {
    action: '#b85c5c',      // Lighter maroon-red for action buttons/CTAs
    actionDark: '#8c3d3d',  // Darker action color for hover
    warning: '#d9a84d',     // Gold/amber - Warnings/Caution
    success: '#6b8e6b',     // Muted green - Success states
    info: '#5c7a99',        // Muted blue - Informational
  },

  // Semantic Colors
  semantic: {
    error: '#800000',       // Maroon for errors
    success: '#6b8e6b',     // Muted green for success
    warning: '#d9a84d',     // Gold for warnings
    info: '#5c7a99',        // Muted blue for info
  },

  // Neutral Colors
  neutral: {
    white: '#ffffff',
    gray50: '#f5f5f5',
    gray100: '#e8e8e8',
    gray200: '#d4d4d4',
    gray300: '#b8b8b8',
    gray400: '#999999',
    gray500: '#777777',
    gray600: '#5a5a5a',
    gray700: '#3d3d3d',
    gray800: '#2b2b2b',
    gray900: '#1a1a1a',
    black: '#000000',
  },

  // Text Colors
  text: {
    primary: '#1a1a1a',     // Main text - WCAG AAA compliant
    secondary: '#5a5a5a',   // Secondary text - WCAG AA compliant
    tertiary: '#999999',    // Tertiary text - Less emphasis
    inverse: '#ffffff',     // Text on dark backgrounds
    disabled: '#d4d4d4',    // Disabled state
  },

  // Background Colors
  background: {
    primary: '#ffffff',
    secondary: '#f5f5f5',
    tertiary: '#e8e8e8',
    emergency: '#f5e6e6',   // Light maroon-tinted background
    dark: '#1a1a1a',        // Dark mode primary
    darkSecondary: '#2b2b2b', // Dark mode secondary
  },

  // Border Colors
  border: {
    light: '#d4d4d4',
    medium: '#b8b8b8',
    dark: '#777777',
    focus: '#800000',       // Maroon for focus states
  },

  // Overlay Colors
  overlay: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.3)',
    dark: 'rgba(0, 0, 0, 0.6)',
  },

  // Status-specific colors for incidents
  status: {
    high: '#800000',      // High priority - maroon
    medium: '#d9a84d',    // Medium priority - gold/amber
    low: '#6b8e6b',       // Low priority - muted green
    resolved: '#6b8e6b',  // Resolved - muted green
  },
};

export default Colors;
