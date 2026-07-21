'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { FieldDef, FieldSchema, RunResult, UnidadEntry } from '@/lib/inmobiliarias/types';
import { savePendingJob, claimPendingJob } from '@/lib/pendingJobs';
import { validarRut } from '@/lib/rut';
import { DIAS_BLOQUEO } from '@/lib/vigencia';

interface FichaFormProps {
  inmobiliariaKey: string;
  inmobiliariaName: string;
  schema: FieldSchema;
  stockData?: Record<string, UnidadEntry[]>;
  emailRecipients?: string[];
  asesorEmail?: string;
}

type JobStatus = 'idle' | 'queuing' | 'en_cola' | 'procesando' | 'done';

interface ApiJobState {
  id: string;
  status: 'en_cola' | 'procesando' | 'completado';
  position: number;
  result?: RunResult;
}

const GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Identidad', keys: ['rut', 'apellidoPaterno', 'apellidoMaterno', 'nombres', 'sexo', 'genero'] },
  { label: 'Perfil',    keys: ['fechaNacimiento', 'edad', 'estadoCivil', 'nacionalidad', 'profesion'] },
  { label: 'Conviviente civil', keys: ['rutConyuge', 'nombreConyuge', 'apellidoConyuge'] },
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
  backgroundColor: 'var(--card)',
  color: 'var(--foreground)',
};

const inputFocusRing = 'focus:ring-[color:color-mix(in_srgb,var(--accent)_22%,transparent)] focus:border-[color:var(--accent)]';

function formatFecha(raw: string): string {
  // Sólo dígitos, máximo 8 (DDMMAAAA), agrupados como DD-MM-AAAA con guiones.
  const d = raw.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join('-');
}

function formatRut(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);
  let formatted = '';
  for (let i = 0; i < body.length; i++) {
    if (i > 0 && (body.length - i) % 3 === 0) formatted += '.';
    formatted += body[i];
  }
  return `${formatted}-${dv}`;
}

function FieldInput({
  field,
  value,
  onChange,
  stockData,
  parentValue,
  parentLabel,
}: {
  field: FieldDef;
  value: string;
  onChange: (key: string, val: string) => void;
  stockData?: Record<string, UnidadEntry[]>;
  parentValue?: string;
  parentLabel?: string;
}) {
  const cls = `${inputBase} ${inputFocusRing}`;

  // Select dependiente (ej. comuna según región): las opciones salen del padre.
  if (field.optionsBy) {
    const opciones = parentValue ? (field.optionsBy.options[parentValue] ?? []) : [];
    return (
      <select
        id={field.key}
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
        disabled={!parentValue}
        className={`${cls} cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
        style={{ ...inputNormal, color: value ? 'var(--foreground)' : 'var(--muted)' }}
      >
        <option value="">
          {parentValue ? 'Selecciona…' : `Primero elige ${(parentLabel ?? 'la opción anterior').toLowerCase()}`}
        </option>
        {opciones.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'cascade-parent' && stockData && Object.keys(stockData).length > 0) {
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

  if (field.type === 'cascade-child' && stockData && Object.keys(stockData).length > 0) {
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
        style={{ ...inputNormal, backgroundColor: 'var(--background)' }}
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
      inputMode={field.type === 'phone' ? 'tel' : field.type === 'fecha' ? 'numeric' : undefined}
      maxLength={field.type === 'fecha' ? 10 : undefined}
      autoComplete={field.type === 'email' ? 'email' : undefined}
      placeholder={
        field.type === 'rut'
          ? '12.345.678-9'
          : field.type === 'phone'
            ? '+56 9 1234 5678'
            : field.type === 'fecha'
              ? 'DD-MM-AAAA'
              : undefined
      }
      value={value}
      onChange={(e) => onChange(field.key, e.target.value)}
      className={cls}
      style={inputNormal}
    />
  );
}

function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at === -1) return email;
  return `*****${email.slice(at)}`;
}

function getErrorHint(message: string): string {
  if (/ya (existe|está registrado|está bloqueado|está tomado)|asociado a otro|registrado en el portal/i.test(message))
    return 'El cliente ya figura en el portal. Revisa en "Mis bloqueos" o con la inmobiliaria si ya está tomado.';
  if (/autenticad/i.test(message)) return 'Tu sesión expiró — cierra sesión y vuelve a ingresar.';
  if (/reiniciado|disponible/i.test(message)) return 'El servidor se reinició. Vuelve a enviar el formulario.';
  if (/conexión|connection/i.test(message)) return 'Revisa tu conexión a internet e intenta nuevamente.';
  if (/timeout|tiempo/i.test(message)) return 'El portal tardó demasiado. Intenta de nuevo más tarde.';
  if (/credencial|password|contraseña|acceso|login/i.test(message)) return 'Las credenciales del portal pueden estar vencidas — avisa al administrador.';
  return 'Si el error persiste, contacta al administrador con el mensaje de arriba.';
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function Spinner({ size = 4 }: { size?: number }) {
  return (
    <span
      className={`inline-block w-${size} h-${size} border-2 rounded-full animate-spin`}
      style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
    />
  );
}

export default function FichaForm({
  inmobiliariaKey,
  inmobiliariaName,
  schema,
  stockData,
  emailRecipients,
  asesorEmail,
}: FichaFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [jobStatus, setJobStatus] = useState<JobStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number>(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [dupWarning, setDupWarning] = useState(false);

  const submitSnapshot = useRef<{ rut: string; nombre: string } | null>(null);

  // Claves de campos con máscara de fecha (DD-MM-AAAA).
  const fechaKeys = useMemo(
    () => new Set(schema.fields.filter((f) => f.type === 'fecha').map((f) => f.key)),
    [schema],
  );

  const handleReset = () => {
    setValues({});
    setResult(null);
    setJobId(null);
    setJobStatus('idle');
    setQueuePosition(0);
    setDupWarning(false);
  };

  // Pares padre→hijo de los selects dependientes (ej. región → comuna).
  const dependientes = useMemo(
    () => schema.fields.flatMap((f) => (f.optionsBy ? [{ hijo: f.key, padre: f.optionsBy.field }] : [])),
    [schema],
  );

  const handleChange = useCallback((key: string, value: string) => {
    setValues((prev) => {
      const formatted = key === 'rut'
        ? formatRut(value)
        : fechaKeys.has(key)
          ? formatFecha(value)
          : value;
      const next = { ...prev, [key]: formatted };
      // Si cambia un campo padre, se limpia el hijo (sus opciones ya no aplican).
      for (const d of dependientes) {
        if (d.padre === key) next[d.hijo] = '';
      }
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
  }, [stockData, fechaKeys, dependientes]);

  // Polling effect
  useEffect(() => {
    if (jobStatus !== 'en_cola' && jobStatus !== 'procesando') return;
    if (!jobId) return;

    const id = jobId;
    const snapshot = submitSnapshot.current;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/bloquear/status/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setResult({ status: 'error', message: 'La solicitud ya no está disponible (servidor reiniciado).' });
            setJobStatus('done');
          }
          return;
        }
        const job = (await res.json()) as ApiJobState;

        if (job.status === 'en_cola') {
          setJobStatus('en_cola');
          setQueuePosition(job.position);
        } else if (job.status === 'procesando') {
          setJobStatus('procesando');
        } else if (job.status === 'completado') {
          clearInterval(interval);
          const r = job.result ?? { status: 'error', message: 'Sin respuesta del servidor.' };
          setResult(r);
          setJobStatus('done');
          if (r.status === 'success' && snapshot) {
            const claimed = claimPendingJob(id);
            if (claimed) {
              void fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  inmobiliariaKey,
                  inmobiliariaName,
                  rut: snapshot.rut,
                  nombre: snapshot.nombre,
                  asesorEmail: claimed.asesorEmail,
                }),
              }).then(() => {
                window.dispatchEvent(new CustomEvent('history:updated'));
              });
            }
          }
        }
      } catch {
        // ignore transient fetch errors
      }
    }, 2000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, jobStatus]);

  const isFieldVisible = (f: FieldDef) =>
    !f.showWhen || values[f.showWhen.field] === f.showWhen.value;

  const allFilled = schema.fields
    .filter((f) => f.required && isFieldVisible(f))
    .every((f) => (values[f.key] ?? '').trim() !== '');

  // Validación de RUT (módulo 11): si hay campo RUT con valor, debe ser válido.
  const rutField = schema.fields.find((f) => f.type === 'rut');
  const rutIngresado = rutField ? (values[rutField.key] ?? '').trim() : '';
  const rutInvalido = rutIngresado !== '' && !validarRut(rutIngresado);

  const isProcessing = jobStatus === 'queuing' || jobStatus === 'en_cola' || jobStatus === 'procesando';
  const isSuccess = jobStatus === 'done' && result?.status === 'success';

  async function doSubmit(force = false) {
    if (rutInvalido) return;
    if (!force && values.rut) {
      try {
        const check = await fetch(
          `/api/history?rut=${encodeURIComponent(values.rut)}&key=${encodeURIComponent(inmobiliariaKey)}`,
          { method: 'HEAD' },
        );
        if (check.headers.get('x-duplicate') === '1') {
          setDupWarning(true);
          return;
        }
      } catch {
        // if check fails, proceed anyway
      }
    }
    setDupWarning(false);
    setJobStatus('queuing');
    setResult(null);
    setJobId(null);

    submitSnapshot.current = {
      rut: values.rut ?? '',
      nombre: [values.nombres, values.apellidoPaterno].filter(Boolean).join(' '),
    };

    try {
      const res = await fetch('/api/bloquear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inmobiliaria: inmobiliariaKey, data: values }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? `Error del servidor (${res.status}).`);
      }
      const json = (await res.json()) as { jobId: string };

      savePendingJob({
        jobId: json.jobId,
        inmobiliaria: inmobiliariaKey,
        inmobiliariaName,
        rut: submitSnapshot.current.rut,
        nombre: submitSnapshot.current.nombre,
        asesorEmail: asesorEmail ?? '',
        submittedAt: Date.now(),
      });

      setJobId(json.jobId);
      setJobStatus('en_cola');
      setQueuePosition(1);
    } catch {
      setResult({ status: 'error', message: 'Error de conexión con el servidor.' });
      setJobStatus('done');
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void doSubmit();
  };

  const fieldMap = Object.fromEntries(schema.fields.map((f) => [f.key, f]));

  // Layout de secciones: propio de la inmobiliaria si lo define, si no el default.
  const groups = schema.groups ?? GROUPS;

  // Email preview data (computed when emailRecipients is set)
  const emailPreview = emailRecipients && emailRecipients.length > 0 ? (() => {
    const today = new Date().toLocaleDateString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).replace(/\//g, '-');
    const nombre = [values.nombres, values.apellidoPaterno, values.apellidoMaterno]
      .filter(Boolean).join(' ').trim().toUpperCase() || '…';
    const rut = values.rut || '…';
    const subject = `BLOQUEO CLIENTE ${nombre} / RUT ${rut} / FECHA ${today}`;
    const bodyLines = schema.fields
      .filter((f) => (values[f.key] ?? '').trim())
      .map((f) => ({ label: f.label, value: values[f.key] }));
    return { subject, bodyLines };
  })() : null;

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start animate-in fade-in slide-in-from-bottom-3 duration-400">

      {/* ── Formulario ── */}
      <form onSubmit={handleSubmit} className="flex-1 min-w-0 space-y-4">
        {groups.map((group) => {
          const fields = group.keys.map((k) => fieldMap[k]).filter(Boolean).filter(isFieldVisible);
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
                        {field.key === 'apellidoMaterno' && (
                          <span className="ml-1.5 normal-case tracking-normal font-normal" style={{ color: 'var(--muted)' }}>
                            — Si tiene un solo apellido, repetir dos veces
                          </span>
                        )}
                      </label>
                      <FieldInput
                        field={field}
                        value={values[field.key] ?? ''}
                        onChange={handleChange}
                        stockData={stockData}
                        parentValue={
                          field.optionsBy
                            ? (values[field.optionsBy.field] ?? '')
                            : field.type === 'cascade-child'
                              ? (values['proyecto'] ?? '')
                              : undefined
                        }
                        parentLabel={field.optionsBy ? fieldMap[field.optionsBy.field]?.label : undefined}
                      />
                      {field.helpText && (
                        <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                          {field.helpText}
                        </p>
                      )}
                      {field.type === 'rut' && (values[field.key] ?? '').trim() !== '' && !validarRut(values[field.key] ?? '') && (
                        <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                          RUT inválido — revisa el dígito verificador.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* ── Advertencia duplicado ── */}
        {dupWarning && (
          <div
            className="rounded-xl border p-4 animate-in fade-in slide-in-from-top-1 duration-200"
            style={{
              borderColor: 'var(--warning)',
              backgroundColor: 'color-mix(in srgb, var(--warning) 8%, var(--card))',
            }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>
              RUT con bloqueo vigente
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--foreground)' }}>
              El RUT <span className="font-mono font-semibold">{values.rut}</span> ya tiene un
              bloqueo vigente en {inmobiliariaName}. Los bloqueos duran {DIAS_BLOQUEO} días; pasado
              ese plazo el cliente se libera solo. ¿Deseas continuar de todas formas?
            </p>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => void doSubmit(true)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'var(--warning)', color: '#fff' }}
              >
                Continuar de todas formas
              </button>
              <button
                type="button"
                onClick={() => setDupWarning(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--border) 60%, transparent)',
                  color: 'var(--foreground)',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── Acción ── */}
        <div className="flex items-center gap-4 pt-1">
          <button
            type="submit"
            disabled={!allFilled || rutInvalido || isProcessing || isSuccess}
            className="inline-flex items-center gap-2.5 px-8 py-3 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
              boxShadow: allFilled && !rutInvalido && !isProcessing && !isSuccess ? '0 4px 14px 0 color-mix(in srgb, var(--accent) 35%, transparent)' : 'none',
              // @ts-expect-error CSS custom property
              '--tw-ring-color': 'color-mix(in srgb, var(--accent) 40%, transparent)',
            }}
            onMouseEnter={(e) => {
              if (!isProcessing && allFilled && !isSuccess)
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent)';
            }}
          >
            {jobStatus === 'queuing' ? (
              <>
                <Spinner size={4} />
                Enviando…
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

          {!allFilled && !rutInvalido && !isProcessing && !isSuccess && !dupWarning && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Completa todos los campos para continuar.
            </p>
          )}

          {rutInvalido && !isProcessing && !isSuccess && (
            <p className="text-xs" style={{ color: 'var(--danger)' }}>
              El RUT no es válido — corrígelo para continuar.
            </p>
          )}
        </div>
      </form>

      {/* ── Panel lateral ── */}
      <aside className="w-full xl:w-72 shrink-0 space-y-4">

        {/* Estado */}
        {isSuccess ? (
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
              {emailRecipients && emailRecipients.length > 0 ? 'Solicitud de bloqueo enviada' : 'Cliente bloqueado'}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
              {result?.message}
            </p>
            {emailRecipients && emailRecipients.length > 0 && (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                Te avisaremos cuando la inmobiliaria confirme el bloqueo.
              </p>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold transition-colors"
              style={{ backgroundColor: 'var(--success)', color: '#fff' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              Bloquear otro cliente
            </button>
          </div>
        ) : (
          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: jobStatus === 'done' && result?.status === 'error' ? 'var(--danger)' : 'var(--border)',
              backgroundColor: jobStatus === 'done' && result?.status === 'error'
                ? 'color-mix(in srgb, var(--danger) 6%, var(--card))'
                : 'var(--card)',
              boxShadow: cardShadow,
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
              Estado
            </p>

            {jobStatus === 'idle' && (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                El resultado aparecerá aquí tras enviar el formulario.
              </p>
            )}

            {jobStatus === 'queuing' && (
              <div className="flex items-center gap-2.5">
                <Spinner size={4} />
                <span className="text-sm" style={{ color: 'var(--muted)' }}>Enviando solicitud…</span>
              </div>
            )}

            {jobStatus === 'en_cola' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
                    En cola
                  </span>
                </div>
                <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
                  {queuePosition === 1 ? 'Siguiente' : `#${queuePosition}`}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {queuePosition === 1
                    ? 'Eres el siguiente en la cola. Comenzará en breve.'
                    : `Hay ${queuePosition - 1} solicitud${queuePosition - 1 !== 1 ? 'es' : ''} antes que la tuya.`}
                </p>
                <div className="flex gap-1 pt-1">
                  {Array.from({ length: Math.min(queuePosition, 5) }).map((_, i) => (
                    <span
                      key={i}
                      className="h-1.5 flex-1 rounded-full"
                      style={{
                        backgroundColor: i < queuePosition - 1
                          ? 'color-mix(in srgb, var(--accent) 30%, transparent)'
                          : 'var(--accent)',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {jobStatus === 'procesando' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <Spinner size={4} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
                    Procesando
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                  Automatizando el bloqueo en el portal…
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Esto puede tardar hasta 5 minutos.
                </p>
              </div>
            )}

            {jobStatus === 'done' && result && result.status !== 'success' && (
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
                {result.status === 'error' && (
                  <>
                    <p className="text-xs leading-relaxed pt-0.5" style={{ color: 'var(--muted)' }}>
                      {getErrorHint(result.message ?? '')}
                    </p>
                    <button
                      type="button"
                      onClick={() => void doSubmit(true)}
                      className="mt-1 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
                      style={{ backgroundColor: 'var(--danger)', color: '#fff' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                      </svg>
                      Reintentar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vista previa del correo */}
        {emailPreview && (
          <div
            className="rounded-2xl border p-5"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
          >
            <div className="flex items-center gap-2 mb-3">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: 'var(--muted)' }}>
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="m22 7-10 7L2 7"/>
              </svg>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Vista previa del correo
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex gap-1.5">
                <span className="shrink-0 font-semibold" style={{ color: 'var(--muted)', minWidth: '38px' }}>Para:</span>
                <span className="break-all" style={{ color: 'var(--foreground)' }}>
                  {emailRecipients!.map(maskEmail).join(', ')}
                </span>
              </div>
              <div className="flex gap-1.5">
                <span className="shrink-0 font-semibold" style={{ color: 'var(--muted)', minWidth: '38px' }}>Asunto:</span>
                <span className="font-medium leading-snug" style={{ color: 'var(--foreground)' }}>
                  {emailPreview.subject}
                </span>
              </div>
            </div>

            {emailPreview.bodyLines.length > 0 && (
              <div
                className="mt-3 pt-3 border-t space-y-0.5"
                style={{ borderColor: 'var(--border)' }}
              >
                {emailPreview.bodyLines.map(({ label, value }) => (
                  <p key={label} className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>{label}:</span>{' '}
                    {value}
                  </p>
                ))}
              </div>
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
            {groups.map((group) => {
              const fields = group.keys.map((k) => fieldMap[k]).filter(Boolean).filter(isFieldVisible);
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
              const total = schema.fields.filter((f) => f.required && isFieldVisible(f)).length;
              const filled = schema.fields.filter((f) => f.required && isFieldVisible(f) && (values[f.key] ?? '').trim() !== '').length;
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
