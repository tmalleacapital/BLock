import type { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { cookies } from 'next/headers';
import { enqueue } from '@/lib/queue';
import { getSession, COOKIE_NAME } from '@/lib/auth';
import { validarRut } from '@/lib/rut';
import { signConfirm } from '@/lib/confirmToken';
import { INMOBILIARIAS } from '@/lib/inmobiliarias/schemas';
import type { RunResult } from '@/lib/inmobiliarias/types';

const SCRIPTS: Record<string, string> = {
  araucana:   'Bloqueo de Clientes Grupo Araucana.py',
  imagina:    'Bloqueo Cliente Imagina.py',
  euro:       'Bloqueo Cliente Euro.py',
  simonetti:  'Bloqueo Cliente Simonetti.py',
  maestra:    'Bloqueo de Clientes Maestra.py',
  ecasa:      'Bloqueo Clientes Ecasa.py',
  paz:        'Bloqueo Clientes Paz.py',
  sento:      'Bloqueo Cliente Sento.py',
  fai:        'Bloqueo Clientes Fai.py',
  viva:       'Bloqueo Clientes Viva.py',
  fundamenta: 'Bloqueo Clientes Fundamenta.py',
  convet:     'Bloqueo Clientes Convet.py',
  danacorp:   'Bloqueo Cliente Danacorp.py',
  deisa:      'Bloqueo Cliente Deisa.py',
  leben:      'Bloqueo Cliente Leben.py',
};

function runScript(scriptName: string, data: Record<string, string>): Promise<RunResult> {
  return new Promise((resolve) => {
    const scriptPath = path.resolve(process.cwd(), 'scripts', scriptName);
    const pythonBin = process.env.PYTHON_BIN ?? 'python3';
    const proc = spawn(pythonBin, [scriptPath, JSON.stringify(data)]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      proc.kill();
      resolve({ status: 'error', message: 'El script superó el tiempo límite (5 min).' });
    }, 5 * 60 * 1000);

    proc.on('close', () => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(stdout.trim()) as RunResult);
      } catch {
        resolve({
          status: 'error',
          message: stderr.trim() || 'El script no devolvió una respuesta válida.',
        });
      }
    });

    proc.on('error', (err: Error) => {
      clearTimeout(timer);
      resolve({ status: 'error', message: `No se pudo iniciar Python: ${err.message}` });
    });
  });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? getSession(token) : null;
  if (!session) {
    return Response.json({ status: 'error', message: 'No autenticado.' }, { status: 401 });
  }

  const body = (await request.json()) as { inmobiliaria?: string; data?: Record<string, string> };
  const key = body.inmobiliaria ?? '';

  if (!key || !body.data) {
    return Response.json({ status: 'error', message: 'Datos inválidos.' }, { status: 400 });
  }

  // Red de seguridad: no procesar RUT inválido (módulo 11).
  if (body.data.rut && !validarRut(body.data.rut)) {
    return Response.json(
      { status: 'error', message: 'El RUT no es válido (dígito verificador incorrecto).' },
      { status: 400 },
    );
  }

  // Inmobiliarias por correo: adjuntar enlaces firmados "Aceptar / Rechazar"
  // que la inmobiliaria usará para confirmar (y que gatillan el aviso al asesor).
  const inm = INMOBILIARIAS.find((i) => i.key === key);
  if (inm?.emailRecipients?.length && body.data.rut) {
    const nombre = [body.data.nombres, body.data.apellidoPaterno, body.data.apellidoMaterno]
      .filter(Boolean).join(' ').trim();
    const confirmToken = signConfirm({ k: key, rut: body.data.rut, nombre, asesor: session.email });
    const base = (process.env.PUBLIC_BASE_URL || 'https://b-lock.up.railway.app').replace(/\/$/, '');
    const url = (accion: string) =>
      `${base}/api/confirmacion?token=${encodeURIComponent(confirmToken)}&accion=${accion}`;
    body.data.__confirm_aceptar_url  = url('aceptar');
    body.data.__confirm_rechazar_url = url('rechazar');
  }

  const script = SCRIPTS[key];
  const fn: () => Promise<RunResult> = script
    ? () => runScript(script, body.data!)
    : async () => ({ status: 'pending', message: `Automatización de ${key} aún no disponible.` });

  const jobId = enqueue(key, fn);
  return Response.json({ jobId });
}
