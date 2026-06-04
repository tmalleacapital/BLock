'use client';

import { useState, useCallback } from 'react';
import type { FieldDef, FieldSchema, RunResult } from '@/lib/inmobiliarias/types';
import type { UnidadEntry } from '@/lib/inmobiliarias/ecasa/catalogos';

interface FichaFormProps {
  inmobiliariaKey: string;
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

const inputBase = [
  'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
  'focus:outline-none focus:ring-2',
  'placeholder:text-[color:var(--muted)]',
].join(' ');

const inputStyle = {
  borderColor: 'var(--border)',
  backgroundColor: 'var(--background)',
  color: 'var(--foreground)',
};

const inputFocusRing = 'focus:ring-[color:color-mix(in_srgb,var(--accent)_35%,transparent)] focus:border-[color:var(--accent)]';

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
        style={{ ...inputStyle, color: value ? 'var(--foreground)' : 'var(--muted)' }}
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
        style={{ ...inputStyle, color: value ? 'var(--foreground)' : 'var(--muted)' }}
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
        className={`${cls} opacity-70 cursor-default`}
        style={{ ...inputStyle, backgroundColor: 'color-mix(in srgb, var(--border) 30%, var(--background))' }}
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
        style={{ ...inputStyle, color: value ? 'var(--foreground)' : 'var(--muted)' }}
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
      style={inputStyle}
    />
  );
}

export default function FichaForm({ inmobiliariaKey, schema, stockData }: FichaFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = useCallback((key: string, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // Cascade: al cambiar proyecto limpiar unidad y tipología
      if (key === 'proyecto') {
        next.unidad    = '';
        next.tipologia = '';
      }
      // Cascade: al cambiar unidad auto-rellenar tipología
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
      <form onSubmit={handleSubmit} className="flex-1 min-w-0 space-y-5">
        {GROUPS.map((group) => {
          const fields = group.keys.map((k) => fieldMap[k]).filter(Boolean);
          if (fields.length === 0) return null;
          return (
            <section
              key={group.label}
              className="rounded-xl border p-6"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
            >
              <h2
                className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ color: 'var(--muted)' }}
              >
                {group.label}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map((field) => {
                  const isWide = field.key === 'region' || field.key === 'nombres' || field.key === 'profesion';
                  return (
                    <div key={field.key} className={isWide ? 'sm:col-span-2' : ''}>
                      <label
                        htmlFor={field.key}
                        className="block text-sm font-medium mb-1.5"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {field.label}
                        {field.required && (
                          <span className="ml-0.5" style={{ color: 'var(--danger)' }} aria-hidden>
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
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={!allFilled || loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
              // @ts-expect-error CSS custom property
              '--tw-ring-color': 'color-mix(in srgb, var(--accent) 40%, transparent)',
            }}
            onMouseEnter={(e) => { if (!loading && allFilled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent)'; }}
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Procesando…
              </>
            ) : (
              'Bloquear cliente'
            )}
          </button>

          {!allFilled && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Completa todos los campos para continuar.
            </p>
          )}
        </div>
      </form>

      {/* ── Panel lateral de resultado ── */}
      <aside className="w-full xl:w-72 shrink-0 space-y-4">
        {/* Estado */}
        {result?.status === 'success' ? (
          <div
            className="rounded-xl border-2 p-6 flex flex-col items-center text-center gap-3 animate-in fade-in zoom-in-95 duration-300"
            style={{ borderColor: 'var(--success)', backgroundColor: 'color-mix(in srgb, var(--success) 10%, var(--card))' }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--success) 20%, transparent)' }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" stroke="var(--success)">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-base font-bold" style={{ color: 'var(--success)' }}>
              Cliente bloqueado
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
              {result.message}
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl border p-5"
            style={{
              borderColor: result?.status === 'error' ? 'var(--danger)' : 'var(--border)',
              backgroundColor: result?.status === 'error'
                ? 'color-mix(in srgb, var(--danger) 8%, var(--card))'
                : 'var(--card)',
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--muted)' }}
            >
              Resultado
            </p>
            {result ? (
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: result.status === 'error' ? 'var(--danger)' : 'var(--muted)' }}
                  />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: result.status === 'error' ? 'var(--danger)' : 'var(--muted)' }}>
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


        {/* Resumen de progreso */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'var(--muted)' }}
          >
            Progreso
          </p>
          <div className="space-y-2">
            {GROUPS.map((group) => {
              const fields = group.keys.map((k) => fieldMap[k]).filter(Boolean);
              const filled = fields.filter((f) => (values[f.key] ?? '').trim() !== '').length;
              const total = fields.length;
              const done = filled === total;
              return (
                <div key={group.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: done ? 'var(--success)' : 'var(--border)' }}
                    />
                    <span className="text-xs" style={{ color: 'var(--foreground)' }}>
                      {group.label}
                    </span>
                  </div>
                  <span className="text-xs tabular-nums" style={{ color: done ? 'var(--success)' : 'var(--muted)' }}>
                    {filled}/{total}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Barra de progreso */}
          <div className="mt-4">
            {(() => {
              const total = schema.fields.filter((f) => f.required).length;
              const filled = schema.fields.filter((f) => f.required && (values[f.key] ?? '').trim() !== '').length;
              const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
              return (
                <>
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--muted)' }}>
                    <span>Completado</span>
                    <span className="tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: pct === 100 ? 'var(--success)' : 'var(--accent)' }}
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
