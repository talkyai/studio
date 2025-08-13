import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { ColorMode, getHorizonTheme } from './theme';

interface ColorModeContextValue {
  mode: ColorMode;
  toggle: () => void;
  setMode: (m: ColorMode) => void;
}

const ColorModeContext = createContext<ColorModeContextValue | undefined>(undefined);

export function useColorMode() {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error('useColorMode must be used within ColorModeProvider');
  return ctx;
}

export const ColorModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ColorMode>(() => {
    const stored = (typeof localStorage !== 'undefined' && (localStorage.getItem('color_mode') as ColorMode)) || 'light';
    return stored === 'dark' ? 'dark' : 'light';
  });

  const setMode = useCallback((m: ColorMode) => {
    setModeState(m);
    try { localStorage.setItem('color_mode', m); } catch {}
  }, []);

  const toggle = useCallback(() => setMode(mode === 'light' ? 'dark' : 'light'), [mode, setMode]);

  const theme = useMemo(() => getHorizonTheme(mode), [mode]);

  const value = useMemo(() => ({ mode, toggle, setMode }), [mode, toggle, setMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-color-mode', mode);
  }, [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};
