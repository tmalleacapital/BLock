'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { INMOBILIARIAS } from '@/lib/inmobiliarias/schemas';

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <path d="M9 22V12h6v10"/>
      <circle cx="9" cy="7" r=".5" fill="currentColor"/>
      <circle cx="15" cy="7" r=".5" fill="currentColor"/>
    </svg>
  );
}


function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

export default function Sidebar({ isAdmin, mobileOpen = false, onClose }: { isAdmin?: boolean; mobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const activeKey = pathname.split('/')[1] ?? '';
  const isHome = pathname === '/';
  const isAdminPage = pathname === '/admin';

  return (
    <aside
      className={`flex flex-col h-screen overflow-y-auto ${
        mobileOpen
          ? 'fixed inset-y-0 left-0 z-50 w-60'
          : 'hidden lg:flex lg:w-60 lg:shrink-0 lg:sticky lg:top-0'
      }`}
      style={{ backgroundColor: 'var(--card)', borderRight: '1px solid var(--border)' }}
    >
      {/* Botón cerrar — solo móvil */}
      {mobileOpen && (
        <div className="flex justify-end px-3 pt-3 pb-1">
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {/* Brand */}
      <Link href="/" className="px-4 pt-5 pb-4 block no-underline" onClick={onClose}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt="Brekto Client Lock"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            filter: 'var(--logo-filter)',
          }}
        />
      </Link>

      <div className="mx-4 h-px" style={{ backgroundColor: 'var(--border)' }} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" onClick={onClose}>
        <div className="space-y-5">

          {/* Inicio */}
          <div>
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  onMouseEnter={(e) => {
                    if (!isHome) {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'color-mix(in srgb, var(--accent) 9%, transparent)';
                      (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isHome) {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '';
                      (e.currentTarget as HTMLAnchorElement).style.color = 'var(--muted)';
                    }
                  }}
                  style={
                    isHome
                      ? { backgroundColor: 'var(--accent)', color: '#ffffff' }
                      : { color: 'var(--muted)' }
                  }
                >
                  <HomeIcon />
                  <span className="flex-1">Inicio</span>
                </Link>
              </li>
            </ul>
          </div>

          {isAdmin && (
            <>
              <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
              <div>
                <ul className="space-y-0.5">
                  <li>
                    <Link
                      href="/admin"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      onMouseEnter={(e) => {
                        if (!isAdminPage) {
                          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'color-mix(in srgb, var(--accent) 9%, transparent)';
                          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isAdminPage) {
                          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '';
                          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--muted)';
                        }
                      }}
                      style={
                        isAdminPage
                          ? { backgroundColor: 'var(--accent)', color: '#ffffff' }
                          : { color: 'var(--muted)' }
                      }
                    >
                      <ShieldIcon />
                      <span className="flex-1">Administración</span>
                    </Link>
                  </li>
                </ul>
              </div>
            </>
          )}

          <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

          {/* Activos */}
          <div>
            <p
              className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--muted)' }}
            >
              Activos
            </p>
            <ul className="space-y-0.5">
              {INMOBILIARIAS.filter((inm) => inm.active && !inm.paused).map((inm) => {
                const isActive = inm.key === activeKey;
                return (
                  <li key={inm.key}>
                    <Link
                      href={`/${inm.key}`}
                      aria-current={isActive ? 'page' : undefined}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'color-mix(in srgb, var(--accent) 9%, transparent)';
                          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '';
                          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--muted)';
                        }
                      }}
                      style={
                        isActive
                          ? { backgroundColor: 'var(--accent)', color: '#ffffff' }
                          : { color: 'var(--muted)' }
                      }
                    >
                      <BuildingIcon />
                      <span className="flex-1">{inm.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* En pausa — solo admins */}
          {isAdmin && (
            <>
              <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
              <div>
                <p
                  className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--muted)' }}
                >
                  En pausa
                </p>
                <ul className="space-y-0.5">
                  {INMOBILIARIAS.filter((inm) => inm.paused).map((inm) => {
                    const isActive = inm.key === activeKey;
                    return (
                      <li key={inm.key}>
                        <Link
                          href={`/${inm.key}`}
                          aria-current={isActive ? 'page' : undefined}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'color-mix(in srgb, var(--accent) 9%, transparent)';
                              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '';
                              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--muted)';
                            }
                          }}
                          style={
                            isActive
                              ? { backgroundColor: 'var(--accent)', color: '#ffffff' }
                              : { color: 'var(--muted)' }
                          }
                        >
                          <BuildingIcon />
                          <span className="flex-1">{inm.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}

        </div>
      </nav>

      {/* Footer */}
      <div className="mx-4 h-px" style={{ backgroundColor: 'var(--border)' }} />
      <div className="px-5 py-4 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
            color: 'var(--accent)',
          }}
        >
          BL
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--foreground)' }}>
            B-Lock
          </p>
          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>v1.0</p>
        </div>
      </div>
    </aside>
  );
}
