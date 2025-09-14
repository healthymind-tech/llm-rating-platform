import { createTheme, ThemeOptions } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';

declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      gradients: {
        primary: string;
        secondary: string;
        background: string;
      };
      shadows: {
        card: string;
        button: string;
        input: string;
      };
      borderRadius: {
        small: string;
        medium: string;
        large: string;
      };
    };
  }
  
  interface ThemeOptions {
    custom?: {
      gradients?: {
        primary?: string;
        secondary?: string;
        background?: string;
      };
      shadows?: {
        card?: string;
        button?: string;
        input?: string;
      };
      borderRadius?: {
        small?: string;
        medium?: string;
        large?: string;
      };
    };
  }
}

const baseThemeOptions = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#2563eb' : '#60a5fa',
      light: mode === 'light' ? '#3b82f6' : '#93c5fd',
      dark: mode === 'light' ? '#1d4ed8' : '#3b82f6',
      contrastText: '#ffffff',
    },
    secondary: {
      main: mode === 'light' ? '#0ea5e9' : '#22d3ee',
      light: mode === 'light' ? '#38bdf8' : '#67e8f9',
      dark: mode === 'light' ? '#0284c7' : '#06b6d4',
      contrastText: '#0b1220',
    },
    background: {
      default: mode === 'light' ? '#f6f7fb' : '#0b1220',
      paper: mode === 'light' ? '#ffffff' : '#0f172a',
    },
    text: {
      primary: mode === 'light' ? '#0f172a' : '#e2e8f0',
      secondary: mode === 'light' ? '#475569' : '#94a3b8',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none' as const,
      letterSpacing: '0.025em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  custom: {
    gradients: {
      primary:
        mode === 'light'
          ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
          : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
      secondary:
        mode === 'light'
          ? 'linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%)'
          : 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)',
      background:
        mode === 'light'
          ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.06) 0%, rgba(14,165,233,0.06) 100%)'
          : 'linear-gradient(135deg, rgba(96,165,250,0.08) 0%, rgba(34,211,238,0.08) 100%)',
    },
    shadows: {
      card:
        mode === 'light'
          ? '0 8px 24px rgba(15, 23, 42, 0.06)'
          : '0 8px 24px rgba(0,0,0,0.5)',
      button:
        mode === 'light'
          ? '0 6px 16px rgba(37, 99, 235, 0.25)'
          : '0 6px 16px rgba(2, 132, 199, 0.35)',
      input:
        mode === 'light'
          ? '0 1px 2px rgba(0, 0, 0, 0.06)'
          : '0 1px 2px rgba(0, 0, 0, 0.7)',
    },
    borderRadius: {
      small: '6px',
      medium: '12px',
      large: '16px',
    },
  },
});

export const getTheme = (mode: PaletteMode = 'light') =>
  createTheme({
  ...baseThemeOptions(mode),
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: mode === 'light' ? '#f6f7fb' : '#0b1220',
          backgroundImage:
            mode === 'light'
              ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, rgba(14,165,233,0.04) 100%)'
              : 'linear-gradient(135deg, rgba(96,165,250,0.06) 0%, rgba(34,211,238,0.06) 100%)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: '0.95rem',
          fontWeight: 500,
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: mode === 'light' ? '0 6px 16px rgba(37, 99, 235, 0.2)' : '0 6px 16px rgba(2, 132, 199, 0.3)'
          },
        },
        contained: {
          background: mode === 'light'
            ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
            : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
          '&:hover': {
            background: mode === 'light'
              ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)'
              : 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
            backgroundColor: mode === 'light' ? 'rgba(37, 99, 235, 0.06)' : 'rgba(96,165,250,0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: mode === 'light' ? '0 8px 24px rgba(15, 23, 42, 0.06)' : '0 8px 24px rgba(0,0,0,0.5)',
          border: mode === 'light' ? '1px solid rgba(2, 6, 23, 0.06)' : '1px solid rgba(255,255,255,0.06)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: mode === 'light' ? '0 10px 28px rgba(15, 23, 42, 0.08)' : '0 10px 28px rgba(0,0,0,0.6)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: mode === 'light' ? '0 1px 3px rgba(15, 23, 42, 0.06)' : '0 1px 3px rgba(0,0,0,0.7)',
        },
        elevation2: {
          boxShadow: mode === 'light' ? '0 4px 12px rgba(15, 23, 42, 0.08)' : '0 4px 12px rgba(0,0,0,0.7)',
        },
        elevation4: {
          boxShadow: mode === 'light' ? '0 10px 20px rgba(15, 23, 42, 0.1)' : '0 10px 20px rgba(0,0,0,0.8)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: mode === 'light' ? '#2563eb' : '#60a5fa',
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: '2px',
                borderColor: mode === 'light' ? '#2563eb' : '#60a5fa',
              },
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
        colorPrimary: {
          background: mode === 'light'
            ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
            : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
          color: 'white',
        },
        colorSecondary: {
          background: mode === 'light'
            ? 'linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%)'
            : 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)',
          color: mode === 'light' ? '#0b1220' : '#052641',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: 'none',
        },
        standardInfo: {
          backgroundColor: mode === 'light' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(59,130,246,0.1)',
          color: mode === 'light' ? '#1d4ed8' : '#93c5fd',
        },
        standardSuccess: {
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          color: '#059669',
        },
        standardWarning: {
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          color: '#d97706',
        },
        standardError: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: '#dc2626',
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          padding: 0,
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginBottom: 8,
          '&:last-child': {
            marginBottom: 0,
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        h1: {
          background: mode === 'light' ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        },
        h2: {
          background: mode === 'light' ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: mode === 'light' ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
          boxShadow: mode === 'light' ? '0 4px 12px rgba(15, 23, 42, 0.08)' : '0 4px 12px rgba(0,0,0,0.6)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: mode === 'light' ? 'linear-gradient(180deg, #ffffff 0%, #f6f7fb 100%)' : 'linear-gradient(180deg, #0b1220 0%, #0f172a 100%)',
          borderRight: mode === 'light' ? '1px solid rgba(2, 6, 23, 0.06)' : '1px solid rgba(255,255,255,0.06)',
        },
      },
    },
  },
});
