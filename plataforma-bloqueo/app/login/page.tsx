'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type Step = 'email' | 'code';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) { setError(json.error ?? 'Error desconocido.'); return; }
      setStep('code');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) { setError(json.error ?? 'Código incorrecto.'); return; }
      router.push('/');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/logo.svg"
            alt="B-Lock"
            width={160}
            height={48}
            style={{ filter: 'var(--logo-filter)' }}
            priority
          />
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-8 space-y-6"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            boxShadow: '0 4px 24px 0 rgb(0 0 0 / 0.08)',
          }}
        >
          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-5">
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                  Acceder a B-Lock
                </h1>
                <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                  Ingresa tu correo corporativo para recibir un código de verificación.
                </p>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
                  style={{ color: 'var(--muted)' }}
                >
                  Correo corporativo
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@capitalinteligente.cl"
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                    // @ts-expect-error custom property
                    '--tw-ring-color': 'color-mix(in srgb, var(--accent) 22%, transparent)',
                  }}
                />
              </div>

              {error && (
                <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                {loading ? 'Enviando…' : 'Enviar código'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                  Código de verificación
                </h1>
                <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                  Enviamos un código de 6 dígitos a{' '}
                  <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                    {email}
                  </span>
                  . Válido por 10 minutos.
                </p>
              </div>

              <div>
                <label
                  htmlFor="code"
                  className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
                  style={{ color: 'var(--muted)' }}
                >
                  Código
                </label>
                <input
                  id="code"
                  type="text"
                  required
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full rounded-lg border px-3.5 py-3 text-2xl font-bold tracking-[0.4em] text-center focus:outline-none focus:ring-2"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                    // @ts-expect-error custom property
                    '--tw-ring-color': 'color-mix(in srgb, var(--accent) 22%, transparent)',
                  }}
                />
              </div>

              {error && (
                <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                {loading ? 'Verificando…' : 'Ingresar'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setCode(''); setError(''); }}
                className="w-full text-xs text-center"
                style={{ color: 'var(--muted)' }}
              >
                Usar otro correo
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
