'use client';

import { useState, useCallback } from 'react';
import type { FieldDef, FieldSchema, RunResult, UnidadEntry } from '@/lib/inmobiliarias/types';
import { saveBlocking } from '@/lib/history';

interface FichaFormProps {
  inmobiliariaKey: string;
  inmobiliariaName: string;
  schema: FieldSchema;
  stockData?: Record<string, UnidadEntry[]>;
}

const GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Identidad', keys: ['rut', 'apellidoPaterno', 'apellidoMaterno', 'nombres', 'sexo', 'genero'] },
  { label: 'Perfil',    keys: ['fechaNacimiento', 'estadoCivil', 'nacionalidad', 'profesion'] },
  { label: 'Dirección', keys: ['calle', 'numero', 'direccion', 'region', 'comuna', 'ciudad'] },
  { label: 'Contacto',  keys: ['telefonoCelular', 'correoElectronico'] },
  { label: 'Proyecto',  keys: ['proyecto', 'unidad', 'tipologia'] },
];

const cardShadow = '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)';

const inputBase = [
  'w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors',
  'focus:outline-none focus:ring-2',
  'placeholder:text-[color:var(--muted)]',
].join(' ');

const inputNormal = {
  borderColor: 'var(--border)',
  backgroundColor: '#ffffff',
  color: 'var(--foreground)',
};

const inputFocusRing = 'focus:ring-[color:color-mix(in_srgb,var(--accent)_22%,transparent)] focus:border-[color:var(--accent)]';

function FieldInput({
  field,
  value,
  onChange,
  stockData,
  parentValue,
}: {
  field: FieldDef;
  value: string;
  onChange: (key: string, val: string) => void;
  stockData?: Record<string, UnidadEntry[]>;
  parentValue?: string;
}) {
  const cls = `${inputBase} ${inputFocusRing}`;

  if (field.type === 'cascade-parent' && stockData) {
    const proyectos = Object.keys(stockData).sort();
    return (
      <select
        id={field.key}
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
        className={`${cls} cursor-pointer`}
        style={{ ...inputNormal, color: value ? 'var(--foreground)' : 'var(--muted)' }}
      >
        <option value="">Selecciona proyecto…</option>
        {proyectos.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'cascade-child' && stockData) {
    const unidades = parentValue ? (stockData[parentValue] ?? []) : [];
    return (
      <select
        id={field.key}
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
        disabled={!parentValue}
        className={`${cls} cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
        style={{ ...inputNormal, color: value ? 'var(--foreground)' : 'var(--muted)' }}
      >
        <option value="">{parentValue ? 'Selecciona unidad…' : 'Primero elige un proyecto'}</option>
        {unidades.map((u) => (
          <option key={u.unidad} value={u.unidad}>{u.unidad}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'cascade-auto') {
    return (
      <input
        id={field.key}
        type="text"
        readOnly
        value={value}
        placeholder="Se completa automáticamente"
        className={`${cls} opacity-60 cursor-default`}
        style={{ ...inputNormal, backgroundColor: '#f8fafc' }}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <select
        id={field.key}
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
        className={`${cls} cursor-pointer`}
        style={{ ...inputNormal, color: value ? 'var(--foreground)' : 'var(--muted)' }}
      >
        <option value="">Selecciona…</option>
        {field.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      id={field.key}
      type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
      inputMode={field.type === 'phone' ? 'tel' : undefined}
      autoComplete={field.type === 'email' ? 'email' : undefined}
      placeholder={
        field.type === 'rut' ? '12.345.678-9' : field.type === 'phone' ? '+56 9 1234 5678' : undefined
      }
      value={value}
      onChange={(e) => onChange(field.key, e.target.value)}
      className={cls}
      style={inputNormal}
    />
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

export default function FichaForm({ inmobiliariaKey, inmobiliariaName, schema, stockData }: FichaFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReset = () => {
    setValues({});
    setResult(null);
  };

  const handleChange = useCallback((key: string, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'proyecto') {
        next.unidad    = '';
        next.tipologia = '';
      }
      if (key === 'unidad' && stockData) {
        const proyecto = prev.proyecto ?? '';
        const entry = stockData[proyecto]?.find((u) => u.unidad === value);
        next.tipologia = entry?.tipologia ?? '';
      }
      return next;
    });
  }, [stockData]);

  const allFilled = schema.fields
    .filter((f) => f.required)
    .every((f) => (values[f.key] ?? '').trim() !== '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/bloquear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inmobiliaria: inmobiliariaKey, data: values }),
      });
      const json: RunResult = await res.json();
      setResult(json);
      if (json.status === 'success') {
        saveBlocking({
          inmobiliariaKey,
          inmobiliariaName,
          rut: values.rut ?? '',
          nombre: [values.nombres, values.apellidoPaterno].filter(Boolean).join(' '),
        });
      }
    } catch {
      setResult({ status: 'error', message: 'Error de conexión con el servidor.' });
    } finally {
      setLoading(false);
    }
  };

  const fieldMap = Object.fromEntries(schema.fields.map((f) => [f.key, f]));

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start animate-in fade-in slide-in-from-bottom-3 duration-400">

      {/* ── Formulario ── */}
      <form onSubmit={handleSubmit} className="flex-1 min-w-0 space-y-4">
        {GROUPS.map((group) => {
          const fields = group.keys.map((k) => fieldMap[k]).filter(Boolean);
          if (fields.length === 0) return null;
          return (
            <section
              key={group.label}
              className="rounded-2xl border p-6"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--card)',
                boxShadow: cardShadow,
              }}
            >
              {/* Section header */}
              <div className="flex items-center gap-2.5 mb-5">
                <span
                  className="w-1 h-5 rounded-full shrink-0"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  {group.label}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map((field) => {
                  const isWide = field.key === 'region' || field.key === 'nombres' || field.key === 'profesion';
                  return (
                    <div key={field.key} className={isWide ? 'sm:col-span-2' : ''}>
                      <label
                        htmlFor={field.key}
                        className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                        style={{ color: 'var(--muted)' }}
                      >
                        {field.label}
                        {field.required && (
                          <span className="ml-0.5 normal-case tracking-normal" style={{ color: 'var(--danger)' }} aria-hidden>
                            *
                          </span>
                        )}
                      </label>
                      <FieldInput
                        field={field}
                        value={values[field.key] ?? ''}
                        onChange={handleChange}
                        stockData={stockData}
                        parentValue={field.type === 'cascade-child' ? (values['proyecto'] ?? '') : undefined}
                      />
                      {field.helpText && (
                        <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                          {field.helpText}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* ── Acción ── */}
        <div className="flex items-center gap-4 pt-1">
          <button
            type="submit"
            disabled={!allFilled || loading}
            className="inline-flex items-center gap-2.5 px-8 py-3 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
              boxShadow: allFilled && !loading ? '0 4px 14px 0 color-mix(in srgb, var(--accent) 35%, transparent)' : 'none',
              // @ts-expect-error CSS custom property
              '--tw-ring-color': 'color-mix(in srgb, var(--accent) 40%, transparent)',
            }}
            onMouseEnter={(e) => {
              if (!loading && allFilled)
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent)';
            }}
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Procesando…
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                Bloquear cliente
              </>
            )}
          </button>

          {!allFilled && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Completa todos los campos para continuar.
            </p>
          )}
        </div>
      </form>

      {/* ── Panel lateral ── */}
      <aside className="w-full xl:w-72 shrink-0 space-y-4">

        {/* Estado */}
        {result?.status === 'success' ? (
          <div
            className="rounded-2xl border-2 p-6 flex flex-col items-center text-center gap-3 animate-in fade-in zoom-in-95 duration-300"
            style={{
              borderColor: 'var(--success)',
              backgroundColor: 'color-mix(in srgb, var(--success) 8%, var(--card))',
              boxShadow: cardShadow,
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--success) 18%, transparent)' }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                stroke="var(--success)">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-base font-bold" style={{ color: 'var(--success)' }}>
              Cliente bloqueado
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
              {result.message}
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold transition-colors"
              style={{ backgroundColor: 'var(--success)', color: '#fff' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = '1';
              }}
            >
              Bloquear otro cliente
            </button>
          </div>
        ) : (
          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: result?.status === 'error' ? 'var(--danger)' : 'var(--border)',
              backgroundColor: result?.status === 'error'
                ? 'color-mix(in srgb, var(--danger) 6%, var(--card))'
                : 'var(--card)',
              boxShadow: cardShadow,
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
              Resultado
            </p>
            {result ? (
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: result.status === 'error' ? 'var(--danger)' : 'var(--muted)' }}
                  />
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: result.status === 'error' ? 'var(--danger)' : 'var(--muted)' }}
                  >
                    {result.status === 'pending' ? 'En construcción' : 'Error'}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
                  {result.message}
                </p>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                El resultado aparecerá aquí tras enviar el formulario.
              </p>
            )}
          </div>
        )}

        {/* Progreso */}
        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            Progreso
          </p>
          <div className="space-y-2.5">
            {GROUPS.map((group) => {
              const fields = group.keys.map((k) => fieldMap[k]).filter(Boolean);
              const filled = fields.filter((f) => (values[f.key] ?? '').trim() !== '').length;
              const total = fields.length;
              const done = filled === total && total > 0;
              return (
                <div key={group.label} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200"
                    style={{
                      backgroundColor: done
                        ? 'var(--success)'
                        : 'color-mix(in srgb, var(--border) 60%, transparent)',
                      color: done ? '#fff' : 'var(--muted)',
                    }}
                  >
                    {done ? <CheckIcon /> : null}
                  </div>
                  <span className="flex-1 text-xs" style={{ color: done ? 'var(--foreground)' : 'var(--muted)' }}>
                    {group.label}
                  </span>
                  <span
                    className="text-xs tabular-nums font-medium"
                    style={{ color: done ? 'var(--success)' : 'var(--muted)' }}
                  >
                    {filled}/{total}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Barra de progreso */}
          <div className="mt-5">
            {(() => {
              const total = schema.fields.filter((f) => f.required).length;
              const filled = schema.fields.filter((f) => f.required && (values[f.key] ?? '').trim() !== '').length;
              const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
              return (
                <>
                  <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--muted)' }}>
                    <span>Completado</span>
                    <span className="tabular-nums font-semibold" style={{ color: pct === 100 ? 'var(--success)' : 'var(--foreground)' }}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct === 100 ? 'var(--success)' : 'var(--accent)',
                      }}
                    />
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </aside>
    </div>
  );
}
