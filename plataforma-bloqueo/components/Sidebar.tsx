'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { INMOBILIARIAS } from '@/lib/inmobiliarias/schemas';

export default function Sidebar() {
  const pathname = usePathname();
  const activeKey = pathname.split('/')[1] ?? 'imagina';

  return (
    <aside className="w-56 shrink-0 bg-card border-r border-border flex flex-col h-screen sticky top-0 overflow-y-auto">

      {/* ── Brand ── */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          CI
        </div>
        <div className="min-w-0">
          <p
            className="text-sm font-semibold leading-tight truncate"
            style={{ fontFamily: 'var(--font-fraunces), serif', color: 'var(--foreground)' }}
          >
            Capital Inteligente
          </p>
          <p className="text-xs leading-tight" style={{ color: 'var(--muted)' }}>
            Plataforma interna
          </p>
        </div>
      </div>

      <div className="h-px mx-4" style={{ backgroundColor: 'var(--border)' }} />

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-5 space-y-5">

        {/* Activos */}
        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--muted)' }}>
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
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                      isActive ? 'font-medium' : 'hover:bg-black/4',
                    ].join(' ')}
                    style={
                      isActive
                        ? { backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }
                        : { color: 'var(--foreground)' }
                    }
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: isActive ? 'var(--accent)' : 'var(--border)' }}
                    />
                    <span className="flex-1 text-left">{inm.name}</span>
                    {isActive && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--accent) 18%, transparent)',
                          color: 'var(--accent)',
                        }}
                      >
                        activa
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

        {/* Próximamente */}
        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--muted)' }}>
            Próximamente...
          </p>
          <ul className="space-y-0.5">
            {INMOBILIARIAS.filter((inm) => !inm.active).map((inm) => (
              <li key={inm.key}>
                <button
                  disabled
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm opacity-35 cursor-not-allowed"
                  style={{ color: 'var(--foreground)' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: 'var(--border)' }}
                  />
                  {inm.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* ── Footer ── */}
      <div className="h-px mx-4" style={{ backgroundColor: 'var(--border)' }} />
      <div className="px-5 py-3">
        <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
          Bloqueo de clientes · v1.0
        </p>
      </div>
    </aside>
  );
}
