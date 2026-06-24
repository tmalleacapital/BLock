'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';

function HamburgerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  );
}

export default function TopBar({ email, onMenuClick }: { email?: string; onMenuClick?: () => void }) {
  const { theme, toggle } = useTheme();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div
      className="fixed top-0 left-0 lg:left-60 right-0 z-40 flex items-center justify-between px-4 lg:px-6"
      style={{
        height: '48px',
        backgroundColor: 'var(--card)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Izquierda: hamburguesa (móvil) + sesión */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}
          onClick={onMenuClick}
          aria-label="Abrir menú"
        >
          <HamburgerIcon />
        </button>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#4ade80',
          boxShadow: '0 0 8px #4ade80cc',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#4ade80' }}>
          Sesión activa
        </span>
        {email && (
          <>
            <span className="hidden sm:inline" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>
              {email}
            </span>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--muted)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--danger)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Salir
            </button>
          </>
        )}
      </div>

      {/* Toggle tema */}
      <button
        onClick={toggle}
        title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          backgroundColor: 'transparent',
          color: 'var(--muted)',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 500,
          transition: 'color 0.15s, border-color 0.15s',
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
    </div>
  );
}
