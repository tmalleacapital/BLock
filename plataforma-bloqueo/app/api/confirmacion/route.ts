import type { NextRequest } from 'next/server';
import { verifyConfirm } from '@/lib/confirmToken';
import { getAllHistory, setStatus, type BlockingStatus } from '@/lib/historyServer';
import { sendDecisionEmail } from '@/lib/auth';
import { INMOBILIARIAS } from '@/lib/inmobiliarias/schemas';

// Endpoint PÚBLICO: la inmobiliaria llega aquí desde el enlace del correo.
// No requiere sesión; la autenticidad la da el token firmado.
export const dynamic = 'force-dynamic';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!),
  );
}

function pagina(titulo: string, mensaje: string, color: string): Response {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · B-Lock</title></head>
<body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#f4f6fa;">
  <div style="max-width:460px;margin:64px auto;background:#ffffff;border-radius:16px;padding:40px 32px;text-align:center;box-shadow:0 1px 6px rgba(0,0,0,.08);">
    <div style="width:56px;height:56px;border-radius:50%;background:${color}22;color:${color};display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 16px;">&#10003;</div>
    <h1 style="font-size:20px;color:#1a3066;margin:0 0 10px;">${esc(titulo)}</h1>
    <p style="color:#555555;font-size:14px;line-height:1.6;margin:0;">${mensaje}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 14px;">
    <p style="color:#999999;font-size:11px;margin:0;">Capital Inteligente · B-Lock</p>
  </div>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const accion = url.searchParams.get('accion') ?? '';

  const data = verifyConfirm(token);
  if (!data) {
    return pagina(
      'Enlace inválido o vencido',
      'Este enlace no es válido o ya expiró. Si necesitas ayuda, escríbenos a stock@capitalinteligente.cl.',
      '#b3261e',
    );
  }
  if (accion !== 'aceptar' && accion !== 'rechazar') {
    return pagina('Acción no reconocida', 'El enlace no indica una acción válida.', '#b3261e');
  }

  const decision: BlockingStatus = accion === 'aceptar' ? 'aceptado' : 'rechazado';
  const inmobiliariaName = INMOBILIARIAS.find((i) => i.key === data.k)?.name ?? data.k;

  // Estado previo: si ya se respondió lo mismo, no re-notificamos al asesor.
  const norm = (r: string) => r.replace(/[.\-]/g, '').toLowerCase();
  const prev = getAllHistory().find(
    (r) => norm(r.rut) === norm(data.rut) && r.inmobiliariaKey === data.k,
  )?.status;

  setStatus(data.rut, data.k, decision);

  if (prev !== decision) {
    sendDecisionEmail({
      to: data.asesor,
      rut: data.rut,
      nombre: data.nombre,
      inmobiliariaName,
      decision,
    }).catch(() => {});
  }

  const quien = esc(data.nombre || data.rut);
  if (decision === 'aceptado') {
    return pagina(
      'Bloqueo confirmado',
      `Registramos el bloqueo del cliente <strong>${quien}</strong>. El asesor de Capital Inteligente fue notificado. ¡Gracias!`,
      '#0f7b46',
    );
  }
  return pagina(
    'Solicitud rechazada',
    `Registramos el rechazo de la solicitud para <strong>${quien}</strong>. El asesor de Capital Inteligente fue notificado.`,
    '#b3261e',
  );
}
