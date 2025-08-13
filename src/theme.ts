import { createTheme } from '@mui/material/styles';

export type ColorMode = 'light' | 'dark';

// Minimal UI Kit inspired palette (material-kit-react)
const minimalPalette = {
  light: {
    primary: { main: '#00AB55', contrastText: '#FFFFFF' },
    secondary: { main: '#3366FF', contrastText: '#FFFFFF' },
    background: { default: '#F4F6F8', paper: '#FFFFFF' },
    text: { primary: '#212B36', secondary: '#637381' },
    divider: '#DFE3E8',
  },
  dark: {
    primary: { main: '#00AB55', contrastText: '#FFFFFF' },
    secondary: { main: '#84A9FF', contrastText: '#061B64' },
    background: { default: '#161C24', paper: '#1E272F' },
    text: { primary: '#F9FAFB', secondary: '#919EAB' },
    divider: '#2D3742',
  },
} as const;

export function getHorizonTheme(mode: ColorMode) {
  const pal = minimalPalette[mode];
  return createTheme({
    cssVariables: true,
    palette: {
      mode,
      primary: pal.primary as any,
      secondary: pal.secondary as any,
      background: pal.background as any,
      text: pal.text as any,
      divider: (pal as any).divider,
      grey: {
        50: '#F9FAFB',
        100: '#F4F6F8',
        200: '#DFE3E8',
        300: '#C4CDD5',
        400: '#919EAB',
        500: '#637381',
        600: '#454F5B',
        700: '#212B36',
        800: mode === 'dark' ? '#1E272F' : '#161C24',
        900: '#0B141E',
      },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: 'Inter, Avenir, Helvetica, Arial, sans-serif',
      h6: { fontWeight: 700 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shadows: Array(25).fill('none') as any,
    components: {
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: {
          root: {
            backdropFilter: 'saturate(180%) blur(16px)',
            backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(22,28,36,0.8)'
          }
        }
      },
      MuiPaper: { styleOverrides: { root: { borderRadius: 8 } } },
      MuiButton: { defaultProps: { variant: 'contained' }, styleOverrides: { root: { borderRadius: 8 } } },
      MuiCard: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiContainer: { defaultProps: { maxWidth: 'md' } },
    },
  });
}
