import type { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { cookies } from 'next/headers';
import { enqueue } from '@/lib/queue';
import { getSession, COOKIE_NAME } from '@/lib/auth';
import type { RunResult } from '@/lib/inmobiliarias/types';

const SCRIPTS: Record<string, string> = {
  imagina:    'Bloqueo Cliente Imagina.py',
  euro:       'Bloqueo Cliente Euro.py',
  simonetti:  'Bloqueo Cliente Simonetti.py',
  ecasa:      'Bloqueo Clientes Ecasa.py',
  paz:        'Bloqueo Clientes Paz.py',
  sento:      'Bloqueo Cliente Sento.py',
  fai:        'Bloqueo Clientes Fai.py',
  viva:       'Bloqueo Clientes Viva.py',
  fundamenta: 'Bloqueo Clientes Fundamenta.py',
  convet:     'Bloqueo Clientes Convet.py',
};

function runScript(scriptName: string, data: Record<string, string>): Promise<RunResult> {
  return new Promise((resolve) => {
    const scriptPath = path.resolve(process.cwd(), '..', scriptName);
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
  if (!token || !getSession(token)) {
    return Response.json({ status: 'error', message: 'No autenticado.' }, { status: 401 });
  }

  const body = (await request.json()) as { inmobiliaria?: string; data?: Record<string, string> };
  const key = body.inmobiliaria ?? '';

  if (!key || !body.data) {
    return Response.json({ status: 'error', message: 'Datos inválidos.' }, { status: 400 });
  }

  const script = SCRIPTS[key];
  const fn: () => Promise<RunResult> = script
    ? () => runScript(script, body.data!)
    : async () => ({ status: 'pending', message: `Automatización de ${key} aún no disponible.` });

  const jobId = enqueue(key, fn);
  return Response.json({ jobId });
}
