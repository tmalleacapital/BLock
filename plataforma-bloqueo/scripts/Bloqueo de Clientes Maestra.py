"""
Bloqueo de Clientes Maestra.py
Automatización de bloqueo de clientes en el portal MaestraNet (ASP.NET WebForms).

Flujo:
  1. Login en Default.aspx (credenciales MAESTRA_USER / MAESTRA_PASS).
  2. Ir a Sistema de Ventas (GC/SVTA/frmTab.aspx).
  3. Nueva Cotización (cmdNewCoti).
  4. Datos de Cliente: buscar RUT (lnkBuscar) → "Aceptar" al aviso "cliente no
     existe" → rellenar nombre/apellidos/mail/teléfono + Tipo Cliente + Fuente →
     Siguiente (cmdSgte) crea el cliente.
  5. Búsqueda de Proyectos: región (Metropolitana por defecto) → Buscar Proyectos
     (lnkBuscar) → primer proyecto → primera unidad disponible del árbol
     (twDisponibles) → Agregar a la Cotización (cmdaddToCart).

El contenido de la cotización vive dentro del iframe #main_Iframe1.

Uso standalone:  python "Bloqueo de Clientes Maestra.py"
Uso con datos:   python "Bloqueo de Clientes Maestra.py" '{"rut":"...", ...}'
"""

import sys
import json
import os
import re
from _browser_comun import telefono_9
from playwright.sync_api import sync_playwright


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

BASE_URL   = "https://maestranet.maestra.cl"
URL_LOGIN  = f"{BASE_URL}/Default.aspx"
URL_VENTAS = f"{BASE_URL}/GC/SVTA/frmTab.aspx"
IFRAME     = "#main_Iframe1"

CREDS = {
    "usuario": os.environ['MAESTRA_USER'],
    "clave":   os.environ['MAESTRA_PASS'],
}

# Valores fijos del bloqueo (según definición comercial de Capital Inteligente).
TIPO_CLIENTE   = "2"   # dpdwnTipoCliente → Canal Inversionista
FUENTE         = "8"   # ddpFuente        → Referido
REGION_DEFAULT = "13"  # ddpRegion        → Metropolitana


def _split_rut(rut: str) -> tuple[str, str]:
    """Separa un RUT en (cuerpo, dígito verificador). Acepta puntos y guion."""
    clean = rut.replace(".", "").replace(" ", "").upper()
    if "-" in clean:
        cuerpo, dv = clean.rsplit("-", 1)
    else:
        cuerpo, dv = clean[:-1], clean[-1:]
    return cuerpo, dv


def bloquear_cliente(data: dict) -> dict:
    cuerpo, dv = _split_rut(data.get("rut", ""))

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, slow_mo=300)
        context = browser.new_context(viewport={"width": 1920, "height": 1080}, locale='es-CL')
        page = context.new_page()

        try:
            # ── 1. Login ───────────────────────────────────────────────────────
            page.goto(URL_LOGIN, wait_until="networkidle")
            page.get_by_placeholder("Nombre de Usuario").fill(CREDS["usuario"])
            page.get_by_placeholder("Ingrese Contraseña").fill(CREDS["clave"])
            page.get_by_role("button", name="Ingresar").click()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1_500)

            # ── 2. Sistema de Ventas ───────────────────────────────────────────
            page.goto(URL_VENTAS, wait_until="networkidle")
            page.wait_for_timeout(1_500)

            frame = page.frame_locator(IFRAME)

            # ── 3. Nueva Cotización ────────────────────────────────────────────
            frame.locator("#cmdNewCoti").wait_for(state="visible", timeout=30_000)
            frame.locator("#cmdNewCoti").click()
            frame.locator("#txtRut").wait_for(state="visible", timeout=30_000)
            page.wait_for_timeout(1_000)

            # ── 4. Datos de Cliente ────────────────────────────────────────────
            frame.locator("#txtRut").fill(cuerpo)
            frame.locator("#txtDigito").fill(dv)
            frame.locator("#lnkBuscar").click()          # buscar por RUT
            page.wait_for_timeout(2_500)

            # Aviso "Cliente no existe favor crearlo" → Aceptar (sólo cliente nuevo)
            try:
                aceptar = frame.locator("button:has-text('Aceptar')").locator("visible=true").first
                aceptar.click(timeout=6_000)
                page.wait_for_timeout(800)
            except Exception:
                pass  # si ya existía, el aviso no aparece

            frame.locator("#txtNombres").fill(data.get("nombres", ""))
            frame.locator("#txtPaterno").fill(data.get("apellidoPaterno", ""))
            frame.locator("#txtMaterno").fill(data.get("apellidoMaterno", ""))
            frame.locator("#txtMail").fill(data.get("correoElectronico", ""))
            frame.locator("#txtFono").fill(telefono_9(data.get("telefonoCelular", "")))
            frame.locator("#dpdwnTipoCliente").select_option(TIPO_CLIENTE)
            frame.locator("#ddpFuente").select_option(FUENTE)
            page.wait_for_timeout(500)

            # ── 5. Siguiente → crea el cliente y pasa a Búsqueda de Proyectos ──
            frame.locator("#cmdSgte").click()
            frame.locator("#ddpRegion").wait_for(state="visible", timeout=30_000)
            page.wait_for_timeout(1_500)

            # ── 6. Búsqueda de Proyectos (región por defecto, sin comuna) ──────
            frame.locator("#ddpRegion").select_option(REGION_DEFAULT)
            page.wait_for_timeout(2_000)
            frame.locator("#lnkBuscar").click()          # Buscar Proyectos
            frame.locator("#listProyecto_lnkProyecto_0").wait_for(state="visible", timeout=30_000)
            page.wait_for_timeout(1_000)

            # ── 7. Primer proyecto disponible ──────────────────────────────────
            frame.locator("#listProyecto_lnkProyecto_0").click()
            frame.locator("a[id^='twDisponiblest']").first.wait_for(state="attached", timeout=30_000)
            page.wait_for_timeout(1_500)

            # ── 8. Primera unidad disponible del árbol (hoja "N° ...") ──────────
            # El TreeView renderiza todos los nodos en el DOM (colapsados por CSS);
            # basta con disparar el postback de selección de la primera hoja.
            unidad = frame.locator("a[id^='twDisponiblest']").filter(has_text=re.compile(r"N°\s*\d+")).first
            unidad.wait_for(state="attached", timeout=30_000)
            unidad.evaluate("el => el.click()")
            frame.locator("#cmdaddToCart").wait_for(state="visible", timeout=30_000)
            page.wait_for_timeout(1_500)

            # ── 9. Agregar a la Cotización (paso final = bloqueo) ──────────────
            frame.locator("#cmdaddToCart").click()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(3_000)

            nombre = f"{data.get('nombres','')} {data.get('apellidoPaterno','')}".strip()
            return {
                "status": "success",
                "message": f"Cliente {nombre} ({data.get('rut','')}) bloqueado correctamente en el portal de Maestra.",
            }

        except Exception as e:
            return {"status": "error", "message": str(e)}

        finally:
            browser.close()


DATOS_PRUEBA = {
    "rut":               "12.345.678-5",
    "nombres":           "Juan Carlos",
    "apellidoPaterno":   "García",
    "apellidoMaterno":   "López",
    "correoElectronico": "juan.prueba@example.com",
    "telefonoCelular":   "912345678",
}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        data = json.loads(sys.argv[1])
    else:
        data = DATOS_PRUEBA

    result = bloquear_cliente(data)
    print(json.dumps(result, ensure_ascii=False))
