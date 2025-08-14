// Unified theme configuration for consistent styling across the app
export const theme = {
  // Core color palette
  colors: {
    // Primary brand colors
    primary: {
      50: '#faf5ff',
      100: '#f3e8ff', 
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7', // Main purple
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87',
    },
    
    // Secondary accent colors  
    secondary: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8', 
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ec4899', // Main pink
      600: '#db2777',
      700: '#be185d',
      800: '#9d174d',
      900: '#831843',
    },
    
    // Neutral grays
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },
    
    // Dark theme colors
    dark: {
      bg: '#0a0a0a',
      bgSecondary: '#111111', 
      bgTertiary: '#1a1a1a',
      border: '#2a2a2a',
      text: '#ffffff',
      textSecondary: '#a3a3a3',
      textMuted: '#737373',
    },
    
    // Status colors
    success: '#10b981',
    warning: '#f59e0b', 
    error: '#ef4444',
    info: '#3b82f6',
  },
  
  // Typography scale
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
    },
    
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
    },
  },
  
  // Spacing scale
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem', 
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
  },
  
  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    glow: '0 0 20px rgb(168 85 247 / 0.3)',
    glowPink: '0 0 20px rgb(236 72 153 / 0.3)',
  },
  
  // Animation durations
  animation: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  
  // Breakpoints
  screens: {
    sm: '640px',
    md: '768px', 
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Gradient presets
export const gradients = {
  primary: 'bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500',
  primaryVertical: 'bg-gradient-to-b from-purple-500 via-purple-600 to-pink-500', 
  secondary: 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500',
  dark: 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-pink-900/20',
  glass: 'bg-gradient-to-br from-white/10 via-white/5 to-transparent',
  success: 'bg-gradient-to-r from-green-400 to-emerald-500',
  warning: 'bg-gradient-to-r from-yellow-400 to-orange-500',
  error: 'bg-gradient-to-r from-red-400 to-pink-500',
} as const;

// Component variants
export const variants = {
  button: {
    primary: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 border border-gray-300 hover:border-gray-400 transition-colors duration-200',
    outline: 'border-2 border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white transition-colors duration-200',
    ghost: 'text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-colors duration-200',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200',
  },
  
  card: {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200',
    elevated: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200',
    glass: 'bg-white/10 dark:bg-white/5 backdrop-blur-lg border border-white/20 rounded-xl',
    gradient: 'bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent backdrop-blur-sm border border-purple-200/20 rounded-xl',
  },
  
  input: {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200',
    error: 'bg-white dark:bg-gray-800 border border-red-300 dark:border-red-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent',
  },
} as const;

// Utility functions
export const getColorShade = (color: string, shade: number) => {
  const colorMap = theme.colors as any;
  return colorMap[color]?.[shade] || color;
};

export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

export default theme;