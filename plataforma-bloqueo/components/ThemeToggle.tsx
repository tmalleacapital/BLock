'use client';

import { useTheme } from './ThemeProvider';

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  );
}

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      style={{
        position: 'fixed',
        top: '14px',
        right: '20px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 13px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--card)',
        color: 'var(--muted)',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 500,
        transition: 'color 0.15s, border-color 0.15s',
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
      }}
    >
      {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
      <span>{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
    </button>
  );
}
