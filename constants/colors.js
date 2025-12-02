// ResQYou Web App Color Constants
// Matching mobile app's emergency red/orange theme

export const Colors = {
  // Primary Colors - Emergency Red Theme
  primary: {
    red: '#dc2626',       // Main emergency red (primary brand color)
    redDark: '#b91c1c',   // Darker red for hover/active states
    redLight: '#fca5a5',  // Light red for highlights/backgrounds
    background: '#fef2f2', // Very light red for backgrounds
  },

  // Secondary Colors - Action Orange
  secondary: {
    orange: '#f97316',    // Action orange (buttons, CTAs)
    orangeDark: '#ea580c', // Darker orange for hover states
    orangeLight: '#fed7aa', // Light orange for highlights
    background: '#fff7ed', // Light orange background
  },

  // Alert Colors
  alert: {
    emergency: '#dc2626', // Emergency/Critical alerts
    warning: '#fbbf24',   // Warning/Caution
    success: '#10b981',   // Success states
    info: '#3b82f6',      // Informational
  },

  // Neutral Colors
  neutral: {
    white: '#ffffff',
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',
    black: '#000000',
  },

  // Semantic Colors
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
    disabled: '#d1d5db',
  },

  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
    emergency: '#fef2f2',   // Light red-tinted background
  },

  border: {
    light: '#e5e7eb',
    medium: '#d1d5db',
    dark: '#9ca3af',
    focus: '#dc2626',       // Emergency red for focus states
  },

  // Status-specific colors for incidents
  status: {
    high: '#dc2626',      // High priority - emergency red
    medium: '#fbbf24',    // Medium priority - warning yellow
    low: '#10b981',       // Low priority - success green
    resolved: '#10b981',  // Resolved - success green
  },
};

export default Colors;
