import { Breakpoint } from '@mui/material/styles';

export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
};

export const responsive = {
  // Mobile first responsive utilities
  mobile: '@media (max-width: 599px)',
  tablet: '@media (min-width: 600px) and (max-width: 899px)',
  desktop: '@media (min-width: 900px)',
  
  // Specific breakpoint utilities
  up: (breakpoint: Breakpoint | number) => {
    const value = typeof breakpoint === 'number' ? breakpoint : breakpoints[breakpoint];
    return `@media (min-width: ${value}px)`;
  },
  
  down: (breakpoint: Breakpoint | number) => {
    const value = typeof breakpoint === 'number' ? breakpoint : breakpoints[breakpoint];
    return `@media (max-width: ${value - 1}px)`;
  },
  
  between: (start: Breakpoint | number, end: Breakpoint | number) => {
    const startValue = typeof start === 'number' ? start : breakpoints[start];
    const endValue = typeof end === 'number' ? end : breakpoints[end];
    return `@media (min-width: ${startValue}px) and (max-width: ${endValue - 1}px)`;
  },
};

export const spacing = {
  xs: '0.25rem', // 4px
  sm: '0.5rem',  // 8px
  md: '1rem',    // 16px
  lg: '1.5rem',  // 24px
  xl: '2rem',    // 32px
  '2xl': '3rem', // 48px
  '3xl': '4rem', // 64px
};

export const containerSizes = {
  xs: '100%',
  sm: '600px',
  md: '900px',
  lg: '1200px',
  xl: '1400px',
};

// Common responsive patterns
export const responsiveStyles = {
  container: {
    width: '100%',
    maxWidth: containerSizes.xl,
    margin: '0 auto',
    padding: {
      xs: spacing.md,
      sm: spacing.lg,
      md: spacing.xl,
    },
  },
  
  grid: {
    display: 'grid',
    gap: spacing.md,
    gridTemplateColumns: {
      xs: '1fr',
      sm: 'repeat(2, 1fr)',
      md: 'repeat(3, 1fr)',
      lg: 'repeat(4, 1fr)',
    },
  },
  
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  flexBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  card: {
    padding: {
      xs: spacing.md,
      sm: spacing.lg,
      md: spacing.xl,
    },
    margin: {
      xs: spacing.sm,
      sm: spacing.md,
    },
  },
  
  text: {
    responsive: {
      fontSize: {
        xs: '0.875rem',
        sm: '1rem',
        md: '1.125rem',
      },
      lineHeight: {
        xs: 1.4,
        sm: 1.5,
        md: 1.6,
      },
    },
  },
};