"""
Bloqueo de Clientes Grupo Araucana.py
Automatización de bloqueo de clientes en Cliperty para Grupo Araucana – Aires de Marañón.

El bloqueo consiste en crear el cliente y GENERAR una cotización de una unidad
disponible con Medio de Origen = "Capital Inteligente". Crear el cliente por sí
solo NO bloquea: hay que generar la cotización (queda "Activa").

Flujo:
  1. Login (ARAUCANA_USER / ARAUCANA_PASS).
  2. Ir directo al Cotizador del proyecto fijo (Aires de Marañón, id 5).
  3. Vista lista -> carrito de la primera unidad disponible -> Ir a Cotización.
  4. Agregar Cliente -> SOLO obligatorios: RUT (primero, su búsqueda limpia el
     resto), Nombres, Apellidos, Celular, Email -> Guardar.
  5. Datos Cotización: Destino de Compra = Inversión, Medio de Origen =
     Capital Inteligente, Medio Realización = Online -> Guardar.
  6. "Encuesta Cliente" -> Saltar. Modal final "¿Qué desea hacer ahora?" -> fin.

Uso standalone:  python "Bloqueo de Clientes Grupo Araucana.py"
Uso con datos:   python "Bloqueo de Clientes Grupo Araucana.py" '{"rut":"...", ...}'
Ver navegador:   HEADLESS=0 python "Bloqueo de Clientes Grupo Araucana.py"
"""

import sys
import json
import os
from playwright.sync_api import sync_playwright, Page


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

URL_LOGIN    = "https://app.cliperty.com/login"
URL_PROJECTS = "https://app.cliperty.com/projects"
URL_QUOTER   = "https://app.cliperty.com/projects/5/quoter"  # Aires de Marañón (id 5)
PROYECTO     = "Aires de Marañon"  # texto del <h1> de la tarjeta (sin tilde en la "o")
HEADLESS     = os.environ.get('HEADLESS', '1') != '0'

# Valores fijos del bloqueo (Datos Cotización) — definición comercial de CI.
DESTINO_COMPRA    = "Inversión"
MEDIO_ORIGEN      = "Capital Inteligente"
MEDIO_REALIZACION = "Online"


def _select_por_label(page: Page, selector: str, label: str) -> None:
    """Selecciona por texto exacto en un <select> Angular y dispara change."""
    loc = page.locator(selector)
    loc.wait_for(state="visible", timeout=30_000)
    loc.scroll_into_view_if_needed()
    page.select_option(selector, label=label)
    loc.evaluate("el => el.dispatchEvent(new Event('change', {bubbles:true}))")
    page.wait_for_timeout(400)


def bloquear_cliente(data: dict) -> dict:
    usuario = os.environ.get('ARAUCANA_USER')
    clave = os.environ.get('ARAUCANA_PASS')
    if not usuario or not clave:
        return {"status": "error",
                "message": "Faltan credenciales: define ARAUCANA_USER y ARAUCANA_PASS."}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS, slow_mo=200)
        context = browser.new_context(viewport={"width": 1920, "height": 1080}, locale='es-CL')
        page = context.new_page()
        page.on("dialog", lambda d: d.accept())  # por si aparece algún alert nativo

        try:
            # ── 1. Login ───────────────────────────────────────────────────────
            page.goto(URL_LOGIN, wait_until="domcontentloaded")
            page.wait_for_selector("#input-usuario", state="visible", timeout=30_000)
            page.fill("#input-usuario", usuario)
            page.fill("#input-password", clave)
            page.locator(".btn_login").click()
            page.wait_for_timeout(4_000)  # dar tiempo al login (reCAPTCHA invisible)

            # ── 2. Entrar al proyecto (fija contexto) y luego al cotizador ─────
            # IMPORTANTE: entrar directo a /quoter sin seleccionar el proyecto
            # deja el cotizador sin cargar. Primero se clickea la tarjeta.
            page.goto(URL_PROJECTS, wait_until="domcontentloaded")
            proyecto = page.locator("h1").filter(has_text=PROYECTO).first
            proyecto.wait_for(state="visible", timeout=30_000)
            proyecto.click()
            page.wait_for_url("**/projects/5/**", timeout=30_000)
            page.wait_for_timeout(1_500)

            page.goto(URL_QUOTER, wait_until="domcontentloaded")
            page.wait_for_timeout(2_500)

            # ── 3. Vista lista -> carrito de la 1.ª unidad disponible ──────────
            page.wait_for_selector("div.icon-list", state="visible", timeout=30_000)
            page.locator("div.icon-list").first.click()
            page.wait_for_timeout(1_200)

            cart = page.locator("i.fa-solid.fa-cart-shopping.fa-xl.show-active").first
            cart.wait_for(state="visible", timeout=20_000)
            cart.scroll_into_view_if_needed()
            cart.click()
            page.wait_for_timeout(1_200)

            # ── 4. Ir a Cotización -> Agregar Cliente ──────────────────────────
            page.locator("button.btn_save").filter(has_text="Ir a Cotización").first.click()
            page.wait_for_timeout(2_000)

            page.locator("button.btn_search").filter(has_text="Agregar Cliente").first.click()
            page.wait_for_timeout(1_500)

            # ── 5. Cliente: SOLO obligatorios (RUT primero) ────────────────────
            rut_loc = page.locator("#input-rut")
            rut_loc.wait_for(state="visible", timeout=30_000)
            rut_loc.click()
            rut_loc.fill(data.get("rut", ""))
            # La búsqueda del RUT limpia los demás campos: esperar a que termine
            # ANTES de rellenar el resto, si no se pierden.
            page.wait_for_timeout(2_500)

            page.fill("#input-name", data.get("nombres", ""))
            apellidos = f"{data.get('apellidoPaterno', '')} {data.get('apellidoMaterno', '')}".strip()
            page.fill("#input-lastName", apellidos)
            page.locator("#input-cellPhone").fill(data.get("telefonoCelular", ""))
            page.fill("#input-email", data.get("correoElectronico", ""))
            page.wait_for_timeout(400)

            # Guardar cliente (botón del modal)
            page.locator("button.btn_save").filter(has_text="Guardar").last.click()
            # Esperar a que el modal del cliente se cierre
            page.wait_for_selector("text=Añadir Nuevo Cliente", state="detached", timeout=20_000)
            page.wait_for_timeout(1_200)

            # ── 6. Datos Cotización (obligatorios) ─────────────────────────────
            _select_por_label(page, "#select-destiny", DESTINO_COMPRA)
            _select_por_label(page, "#select-origin",  MEDIO_ORIGEN)
            _select_por_label(page, "#select-source",  MEDIO_REALIZACION)

            # ── 7. Guardar cotización ──────────────────────────────────────────
            page.locator("button.btn_save").filter(has_text="Guardar").last.click()
            page.wait_for_timeout(2_000)

            # ── 8. Encuesta Cliente -> Saltar ──────────────────────────────────
            saltar = page.locator("button").filter(has_text="Saltar").first
            saltar.wait_for(state="visible", timeout=15_000)
            saltar.click()
            page.wait_for_timeout(2_000)

            # ── 9. Modal final "¿Qué desea hacer ahora?" = éxito ───────────────
            # (La cotización queda "Activa"; cerramos si aparece el botón Salir.)
            try:
                salir = page.locator("button").filter(has_text="Salir").first
                if salir.is_visible(timeout=5_000):
                    salir.click()
            except Exception:
                pass

            return {
                "status": "success",
                "message": "Cliente bloqueado en Cliperty (Grupo Araucana – Aires de Marañón): cotización generada.",
            }

        except Exception as e:
            return {"status": "error", "message": str(e)}

        finally:
            browser.close()


DATOS_PRUEBA = {
    "rut":               "16.936.472-9",
    "nombres":           "Prueba",
    "apellidoPaterno":   "Bloqueo",
    "apellidoMaterno":   "Araucana",
    "telefonoCelular":   "912345678",
    "correoElectronico": "prueba@capitalinteligente.cl",
}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        data = json.loads(sys.argv[1])
    else:
        data = DATOS_PRUEBA

    result = bloquear_cliente(data)
    print(json.dumps(result, ensure_ascii=False))
