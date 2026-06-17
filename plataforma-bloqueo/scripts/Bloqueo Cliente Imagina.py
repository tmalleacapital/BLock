"""
Bloqueo Cliente Imagina.py
──────────────────────────
Automatización de bloqueo de clientes en el portal Cubit de Imagina.
Usa Playwright (Python) con Chromium.

Instalación (una sola vez):
    pip install playwright
    playwright install chromium

Uso standalone (prueba):
    python "Bloqueo Cliente Imagina.py"

Uso desde otro script (JSON por stdin):
    echo '{"rut": "...", ...}' | python "Bloqueo Cliente Imagina.py"
"""

import sys
import json
import time
import os
from playwright.sync_api import sync_playwright, Page, Frame


def _load_dotenv() -> None:
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if not os.path.exists(env_file):
        return
    with open(env_file, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

_load_dotenv()

# ── Credenciales del portal ────────────────────────────────────────────────────
URL_PANEL = "http://cubit.cl/imagina/Panel.aspx"
CREDS = {
    "cuenta":  os.environ['IMAGINA_CUENTA'],
    "dominio": os.environ['IMAGINA_DOMINIO'],
    "clave":   os.environ['IMAGINA_CLAVE'],
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def find_form_frame(page: Page, selector: str, timeout: int = 3_000) -> Frame:
    """Devuelve el Frame que contiene el selector (busca en todos los frames)."""
    for frame in page.frames:
        try:
            frame.locator(selector).wait_for(state="attached", timeout=timeout)
            return frame
        except Exception:
            pass
    return page.main_frame


# ── Flujo principal ────────────────────────────────────────────────────────────

def bloquear_cliente(data: dict) -> dict:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, slow_mo=350)
        context = browser.new_context(viewport={"width": 1920, "height": 1080}, locale='es-CL')
        page = context.new_page()

        try:
            # ── 1. Login ──────────────────────────────────────────────────────
            # La página recarga completamente al hacer login
            page.goto(URL_PANEL, wait_until="networkidle")
            page.fill("#correo_cuenta", CREDS["cuenta"])
            page.fill("#correo_dominio", CREDS["dominio"])
            page.fill("#clave", CREDS["clave"])
            page.click('a[onclick*="jsAceptar"]')
            page.wait_for_load_state("networkidle")

            # ── 2. Click en ícono de menú (Panel Control) ─────────────────────
            page.locator('img[onclick*="jsMenuAPP"]').wait_for(state="visible", timeout=8_000)
            page.locator('img[onclick*="jsMenuAPP"]').click()
            page.wait_for_timeout(1_200)

            # ── 3. Click en Visita — frame conocido: MenuPrivilegioUsuario.aspx ──
            menu_frame = None
            deadline = time.time() + 10
            while time.time() < deadline and not menu_frame:
                for frame in page.frames:
                    if "MenuPrivilegioUsuario" in frame.url:
                        menu_frame = frame
                        break
                if not menu_frame:
                    page.wait_for_timeout(300)
            if not menu_frame:
                raise ValueError("No apareció el frame MenuPrivilegioUsuario.aspx")

            visita_loc = menu_frame.locator('a.verdana10_azulnormal[href*="visita_mov.asp"]')
            visita_loc.wait_for(state="visible", timeout=8_000)
            visita_loc.click()
            page.wait_for_load_state("networkidle")

            # ── 4. Click en Nuevo ──────────────────────────────────────────────
            nuevo_clicked = False
            deadline = time.time() + 10
            while time.time() < deadline:
                for frame in page.frames:
                    if "MenuPrivilegioUsuario" in frame.url:
                        continue
                    try:
                        loc = frame.locator("#Nuevo")
                        loc.wait_for(state="visible", timeout=1_000)
                        loc.click()
                        nuevo_clicked = True
                        break
                    except Exception:
                        pass
                if nuevo_clicked:
                    break
                page.wait_for_timeout(500)
            if not nuevo_clicked:
                raise ValueError("No se encontró el botón 'Nuevo'")

            # ── 5. Esperar el formulario de datos ──────────────────────────────
            # Usamos #Grabar como indicador: solo existe en el form de nuevo registro,
            # NO en la vista de lista/búsqueda que también tiene #rutpersona.
            page.wait_for_timeout(1_000)
            f = None
            deadline = time.time() + 10
            while time.time() < deadline:
                for frame in page.frames:
                    if "MenuPrivilegioUsuario" in frame.url:
                        continue
                    try:
                        frame.locator("#Grabar").wait_for(state="visible", timeout=1_000)
                        f = frame
                        break
                    except Exception:
                        pass
                if f:
                    break
                page.wait_for_timeout(500)
            if not f:
                raise ValueError("No apareció el formulario de datos (no se encontró #Grabar)")

            # ── 6. Datos del cliente ───────────────────────────────────────────
            def escribir(locator, texto: str) -> None:
                locator.click()
                locator.fill("")
                locator.press_sequentially(texto, delay=50)
                f.wait_for_timeout(100)

            escribir(f.locator("#rutpersona"), data.get("rut", ""))
            f.locator("#rutpersona").press("Tab")   # dispara onblur → rut_persona() AJAX
            f.wait_for_timeout(2_000)               # esperar que el AJAX termine
            # rut_persona() puede borrar el campo si el RUT no está en BD — restaurar en silencio
            f.evaluate(
                "(rut) => { const el = document.getElementById('rutpersona'); if (el) el.value = rut; }",
                data.get("rut", ""),
            )

            escribir(f.locator("#apellidopaterno"), data.get("apellidoPaterno", "").upper())
            escribir(f.locator("#apellidomaterno"), data.get("apellidoMaterno", "").upper())
            escribir(f.locator("#nombres"),         data.get("nombres", "").upper())

            # Esperar que las opciones de #sexo carguen vía AJAX
            f.wait_for_function(
                "() => (document.querySelector('#sexo')?.options?.length ?? 0) > 1",
                timeout=10_000,
            )
            sexo_input = data.get("sexo", "M")
            sexo_val = f.evaluate(
                """(val) => {
                    const el = document.querySelector('#sexo');
                    const byValue = Array.from(el.options).find(o => o.value === val);
                    if (byValue) return byValue.value;
                    const keyword = val.toUpperCase().startsWith('F') ? 'FEM' : 'MAS';
                    const byText = Array.from(el.options).find(
                        o => o.text.toUpperCase().includes(keyword)
                    );
                    return byText ? byText.value : (el.options[1]?.value ?? '');
                }""",
                sexo_input,
            )
            f.select_option("#sexo", sexo_val)
            f.wait_for_timeout(200)

            escribir(f.locator("#calle"),      data.get("calle", "").upper())
            escribir(f.locator("#numerocalle"), data.get("numero", ""))

            # ── 7. Región → esperar carga de comunas → seleccionar ─────────────
            f.select_option("#region", data.get("region", ""))
            f.wait_for_function(
                "() => (document.querySelector('#comuna')?.options?.length ?? 0) > 1",
                timeout=10_000,
            )

            comuna_texto = data.get("comuna", "")
            comuna_val = f.evaluate(
                """(text) => {
                    const el = document.querySelector('#comuna');
                    const opt = Array.from(el.options).find(
                        o => o.text.trim().toLowerCase() === text.trim().toLowerCase()
                    );
                    return opt ? opt.value : '';
                }""",
                comuna_texto,
            )
            if not comuna_val:
                raise ValueError(f'Comuna "{comuna_texto}" no encontrada en el selector del portal')
            f.select_option("#comuna", comuna_val)

            # ── 8. Contacto ────────────────────────────────────────────────────
            f.fill("#telefonocelular",   data.get("telefonoCelular", ""))
            f.fill("#correoelectronico", data.get("correoElectronico", ""))

            # ── 9. Campos fijos ────────────────────────────────────────────────
            f.select_option("#razoncompra", "26")   # INVERSIÓN
            f.select_option("#ingreso",     "1536") # Menos de $1.500.000
            f.select_option("#grupomedio",  "6")    # BROKER

            # Esperar que el AJAX cargue #mediollegada con las opciones de broker
            f.wait_for_function(
                "() => (document.querySelector('#mediollegada')?.options?.length ?? 0) > 1",
                timeout=10_000,
            )
            f.select_option("#mediollegada", "101")   # CAPITAL INTELIGENTE
            f.wait_for_timeout(200)
            f.select_option("#identificarvisita", "173")  # DISTANCIA

            # ── 10. Grabar (parte 1: datos del cliente) ────────────────────────
            f.click("#Grabar")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(800)

            # ── 11. Buscar frame con formulario de producto (#proyecto) ────────
            f2 = None
            deadline = time.time() + 15
            while time.time() < deadline:
                for frame in page.frames:
                    if "MenuPrivilegioUsuario" in frame.url:
                        continue
                    try:
                        frame.locator("#proyecto").wait_for(state="visible", timeout=1_000)
                        f2 = frame
                        break
                    except Exception:
                        pass
                if f2:
                    break
                page.wait_for_timeout(500)
            if not f2:
                raise ValueError("No apareció el formulario de producto (#proyecto no encontrado)")

            # ── 12. Proyecto → CONCEPTO SMART LA FLORIDA ──────────────────────
            f2.select_option("#proyecto", "50|501")
            f2.wait_for_function(
                "() => (document.querySelector('#modelo')?.options?.length ?? 0) > 1",
                timeout=10_000,
            )

            # ── 13. Modelo → segunda opción ────────────────────────────────────
            modelo_val = f2.evaluate(
                "() => document.querySelector('#modelo')?.options[1]?.value ?? ''"
            )
            f2.select_option("#modelo", modelo_val)
            f2.wait_for_function(
                "() => (document.querySelector('#orientacion')?.options?.length ?? 0) > 1",
                timeout=10_000,
            )

            # ── 14. Orientación → segunda opción ──────────────────────────────
            orientacion_val = f2.evaluate(
                "() => document.querySelector('#orientacion')?.options[1]?.value ?? ''"
            )
            f2.select_option("#orientacion", orientacion_val)
            f2.wait_for_function(
                "() => (document.querySelector('#producto')?.options?.length ?? 0) > 1",
                timeout=10_000,
            )

            # ── 15. Producto → segunda opción ─────────────────────────────────
            producto_val = f2.evaluate(
                "() => document.querySelector('#producto')?.options[1]?.value ?? ''"
            )
            f2.select_option("#producto", producto_val)

            # Esperar que trae_cotizacion() cargue el formulario de cotización
            f2.locator("#valoraplicac").wait_for(state="visible", timeout=12_000)
            f2.wait_for_timeout(400)

            # ── 16. Descuento: habilitar checkbox y poner 10 ──────────────────
            f2.locator("#valoraplicac").click()
            f2.wait_for_timeout(250)
            f2.locator("#valoraplica").fill("10")

            # ── 17. Grabar (parte 2: cotización) ──────────────────────────────
            f2.click("#Grabar")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2_000)

            return {
                "status": "success",
                "message": "Cliente bloqueado correctamente en el portal de Imagina.",
            }

        except Exception as e:
            return {"status": "error", "message": str(e)}

        finally:
            browser.close()


# ── Punto de entrada ───────────────────────────────────────────────────────────
#
#  Modo 1 — standalone / prueba (F5 en VS Code o terminal sin argumentos):
#      python "Bloqueo Cliente Imagina.py"
#      → usa los DATOS_PRUEBA de abajo
#
#  Modo 2 — con datos reales desde terminal:
#      python "Bloqueo Cliente Imagina.py" '{"rut":"12.345.678-9", ...}'
#
#  Modo 3 — llamado desde la plataforma (futuro):
#      process.stdin ← JSON  (Node.js le pasará los datos del formulario)

DATOS_PRUEBA = {
    "rut":               "12.345.678-5",
    "apellidoPaterno":   "García",
    "apellidoMaterno":   "López",
    "nombres":           "Juan Carlos",
    "sexo":              "M",
    "calle":             "Av. Providencia",
    "numero":            "1234",
    "region":            "13",
    "comuna":            "Providencia",
    "telefonoCelular":   "+56912345678",
    "correoElectronico": "juan@example.com",
}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Modo 2: datos pasados como argumento JSON
        data = json.loads(sys.argv[1])
    else:
        # Modo 1: standalone → datos de prueba, sin tocar stdin
        data = DATOS_PRUEBA

    result = bloquear_cliente(data)
    print(json.dumps(result, ensure_ascii=False))
