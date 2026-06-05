'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { INMOBILIARIAS } from '@/lib/inmobiliarias/schemas';

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

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const activeKey = pathname.split('/')[1] ?? 'imagina';

  return (
    <aside
      className="w-60 shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto"
      style={{ backgroundColor: 'var(--card)', borderRight: '1px solid var(--border)' }}
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-bold"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          BL
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight truncate" style={{ color: 'var(--foreground)' }}>
            B-Lock
          </p>
          <p className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--muted)' }}>
            Plataforma interna
          </p>
        </div>
      </div>

      <div className="mx-4 h-px" style={{ backgroundColor: 'var(--border)' }} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-5">

          {/* Activos */}
          <div>
            <p
              className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--muted)' }}
            >
              Activos
            </p>
            <ul className="space-y-0.5">
              {INMOBILIARIAS.filter((inm) => inm.active).map((inm) => {
                const isActive = inm.key === activeKey;
                return (
                  <li key={inm.key}>
                    <Link
                      href={`/${inm.key}`}
                      aria-current={isActive ? 'page' : undefined}
                      className={[
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      ].join(' ')}
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

          <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

          {/* Próximamente */}
          <div>
            <p
              className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--muted)' }}
            >
              Próximamente
            </p>
            <ul className="space-y-0.5">
              {INMOBILIARIAS.filter((inm) => !inm.active).map((inm) => (
                <li key={inm.key}>
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm opacity-40 cursor-not-allowed select-none"
                    style={{ color: 'var(--muted)' }}
                  >
                    <BuildingIcon />
                    <span className="flex-1">{inm.name}</span>
                    <LockIcon />
                  </div>
                </li>
              ))}
            </ul>
          </div>
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
