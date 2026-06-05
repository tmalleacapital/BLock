import type { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const SCRIPTS: Record<string, string> = {
  imagina:   'Bloqueo Cliente Imagina.py',
  euro:      'Bloqueo Cliente Euro.py',
  simonetti: 'Bloqueo Cliente Simonetti.py',
  ecasa:     'Bloqueo Clientes Ecasa.py',
  paz:       'Bloqueo Clientes Paz.py',
  sento:     'Bloqueo Cliente Sento.py',
};

function runScript(scriptName: string, data: Record<string, string>): Promise<Response> {
  return new Promise((resolve) => {
    const scriptPath = path.resolve(process.cwd(), '..', scriptName);
    const proc = spawn('python', [scriptPath, JSON.stringify(data)]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      proc.kill();
      resolve(Response.json({ status: 'error', message: 'El script superó el tiempo límite (5 min).' }));
    }, 5 * 60 * 1000);

    proc.on('close', () => {
      clearTimeout(timer);
      try {
        resolve(Response.json(JSON.parse(stdout.trim())));
      } catch {
        resolve(Response.json({
          status: 'error',
          message: stderr.trim() || 'El script no devolvió una respuesta válida.',
        }));
      }
    });

    proc.on('error', (err: Error) => {
      clearTimeout(timer);
      resolve(Response.json({ status: 'error', message: `No se pudo iniciar Python: ${err.message}` }));
    });
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { inmobiliaria?: string; data?: Record<string, string> };
  const script = SCRIPTS[body.inmobiliaria ?? ''];

  if (!script || !body.data) {
    return Response.json({
      status: 'pending',
      message: `Automatización de ${body.inmobiliaria ?? 'desconocida'} aún no disponible.`,
    });
  }

  return runScript(script, body.data);
}
