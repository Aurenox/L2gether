import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeSetting, setThemeSetting] = useState(() => {
    return localStorage.getItem('l2gether_theme') || 'system';
  });

  const [activeTheme, setActiveTheme] = useState('dark');

  useEffect(() => {
    function applyTheme() {
      let resolved = 'dark';
      if (themeSetting === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolved = prefersDark ? 'dark' : 'light';
      } else {
        resolved = themeSetting;
      }

      setActiveTheme(resolved);
      document.documentElement.setAttribute('data-theme', resolved);
      localStorage.setItem('l2gether_theme', themeSetting);
    }

    applyTheme();

    if (themeSetting === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e) => {
        const newTheme = e.matches ? 'dark' : 'light';
        setActiveTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [themeSetting]);

  const monacoTheme = activeTheme === 'dark' ? 'vs-dark' : 'vs';

  return (
    <ThemeContext.Provider
      value={{
        themeSetting,
        setThemeSetting,
        activeTheme,
        monacoTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

export default ThemeContext;
