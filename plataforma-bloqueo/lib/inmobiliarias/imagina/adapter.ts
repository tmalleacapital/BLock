import type { Frame } from 'playwright';
import type { InmobiliariaAdapter, RunResult } from '../types';
import { getFieldSchema } from './schema';

const URL_PANEL = 'http://cubit.cl/imagina/Panel.aspx';
const CREDS = {
  cuenta: 'OPERACIONES',
  dominio: 'CAPITALINTELIGENTE.CL',
  clave: '3268',
} as const;

// Finds the frame that contains a given selector, checking all frames including main.
async function findFormFrame(
  page: import('playwright').Page,
  selector: string,
): Promise<Frame> {
  for (const frame of page.frames()) {
    try {
      await frame.locator(selector).waitFor({ state: 'attached', timeout: 2_000 });
      return frame;
    } catch {
      // not in this frame
    }
  }
  return page.mainFrame();
}

export const imaginaAdapter: InmobiliariaAdapter = {
  key: 'imagina',
  name: 'Imagina',
  getFieldSchema,

  async run(ctx: Record<string, unknown>): Promise<RunResult> {
    const { chromium } = await import('playwright');
    const d = (ctx.data ?? ctx) as Record<string, string>;

    const browser = await chromium.launch({ headless: false, slowMo: 250 });
    const bCtx = await browser.newContext();
    const page = await bCtx.newPage();

    try {
      // ── 1. Login ──────────────────────────────────────────────
      await page.goto(URL_PANEL, { waitUntil: 'networkidle' });
      await page.fill('#correo_cuenta', CREDS.cuenta);
      await page.fill('#correo_dominio', CREDS.dominio);
      await page.fill('#clave', CREDS.clave);
      await page.click('a[onclick*="jsAceptar"]');
      await page.waitForLoadState('networkidle');

      // ── 2. Menú → Visita ──────────────────────────────────────
      await page.click('img[onclick*="jsMenuAPP"]');
      await page.locator('a[href*="visita_mov.asp"]').waitFor({ state: 'visible', timeout: 8_000 });
      await page.click('a[href*="visita_mov.asp"]');
      await page.waitForLoadState('networkidle');

      // Locate the form — may live inside an iframe
      const $ = await findFormFrame(page, '#rutpersona');

      // ── 3. Datos del cliente ──────────────────────────────────
      await $.fill('#rutpersona', d.rut ?? '');
      await $.press('#rutpersona', 'Tab'); // trigger onblur → rut_persona()

      await $.fill('#apellidopaterno', (d.apellidoPaterno ?? '').toUpperCase());
      await $.fill('#apellidomaterno', (d.apellidoMaterno ?? '').toUpperCase());
      await $.fill('#nombres', (d.nombres ?? '').toUpperCase());
      await $.fill('#calle', (d.calle ?? '').toUpperCase());
      await $.fill('#numerocalle', d.numero ?? '');

      // ── 4. Región → esperar comunas → seleccionar ─────────────
      await $.selectOption('#region', d.region ?? '');
      await $.waitForFunction(
        () => ((document.querySelector('#comuna') as HTMLSelectElement | null)?.options.length ?? 0) > 1,
        { timeout: 10_000 },
      );
      const comunaVal = await $.evaluate(
        (text: string): string => {
          const el = document.querySelector('#comuna') as HTMLSelectElement;
          return (
            Array.from(el.options).find(
              (o) => o.text.trim().toLowerCase() === text.trim().toLowerCase(),
            )?.value ?? ''
          );
        },
        d.comuna ?? '',
      );
      if (!comunaVal) {
        throw new Error(`Comuna "${d.comuna}" no encontrada en el selector del portal`);
      }
      await $.selectOption('#comuna', comunaVal);

      // ── 5. Contacto ───────────────────────────────────────────
      await $.fill('#telefonocelular', d.telefonoCelular ?? '');
      await $.fill('#correoelectronico', d.correoElectronico ?? '');

      // ── 6. Campos fijos ───────────────────────────────────────
      await $.selectOption('#razoncompra', '26');  // INVERSIÓN
      await $.selectOption('#ingreso', '1537');    // Entre $1.500.001 – $2.000.000
      await $.selectOption('#grupomedio', '6');    // BROKER

      // Esperar que el AJAX cargue la lista de brokers
      await $.waitForFunction(
        () => {
          const selects = Array.from(document.querySelectorAll<HTMLSelectElement>('select'));
          return selects.some(
            (s) =>
              s.id !== 'grupomedio' &&
              Array.from(s.options).some((o) =>
                o.text.toUpperCase().includes('CAPITAL INTELIGENTE'),
              ),
          );
        },
        { timeout: 10_000 },
      );

      // Seleccionar CAPITAL INTELIGENTE en el selector de broker
      await $.evaluate((): void => {
        const selects = Array.from(document.querySelectorAll<HTMLSelectElement>('select'));
        for (const sel of selects) {
          if (sel.id === 'grupomedio') continue;
          const opt = Array.from(sel.options).find((o) =>
            o.text.toUpperCase().includes('CAPITAL INTELIGENTE'),
          );
          if (opt) {
            sel.value = opt.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
        }
      });

      // ── 7. Grabar ─────────────────────────────────────────────
      await $.click('#Grabar');
      await page.waitForLoadState('networkidle');

      return {
        status: 'success',
        message: 'Cliente bloqueado correctamente en el portal de Imagina.',
      };
    } catch (err) {
      return {
        status: 'error',
        message: err instanceof Error ? err.message : 'Error inesperado en la automatización.',
      };
    } finally {
      await browser.close();
    }
  },
};
