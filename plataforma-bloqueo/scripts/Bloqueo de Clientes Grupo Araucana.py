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
from playwright.sync_api import Page

from _browser_comun import load_dotenv, abrir_navegador, set_input, telefono_9

load_dotenv()

URL_LOGIN    = "https://app.cliperty.com/login"
URL_PROJECTS = "https://app.cliperty.com/projects"
HEADLESS     = os.environ.get('HEADLESS', '1') != '0'

# Proyectos disponibles: texto exacto del <h1> de la tarjeta -> id en la URL.
PROYECTOS = {
    "Aires de Marañon": 5,
    "Las Brisas":       9,
    "Miraflores":       1,
}
PROYECTO_DEFECTO = "Aires de Marañon"

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

    try:
        with abrir_navegador(headless=HEADLESS, slow_mo=200, width=1920, height=1080) as page:
            # ── 1. Login ───────────────────────────────────────────────────────
            page.goto(URL_LOGIN, wait_until="domcontentloaded")
            page.wait_for_selector("#input-usuario", state="visible", timeout=30_000)
            page.fill("#input-usuario", usuario)
            page.fill("#input-password", clave)
            page.locator(".btn_login").click()
            page.wait_for_timeout(4_000)  # dar tiempo al login (reCAPTCHA invisible)

            # ── 2. Entrar al proyecto elegido (fija contexto) y luego al cotizador
            # IMPORTANTE: entrar directo a /quoter sin seleccionar el proyecto
            # deja el cotizador sin cargar. Primero se clickea la tarjeta.
            nombre_proyecto = data.get("proyecto") or PROYECTO_DEFECTO
            pid = PROYECTOS.get(nombre_proyecto, PROYECTOS[PROYECTO_DEFECTO])

            page.goto(URL_PROJECTS, wait_until="domcontentloaded")
            proyecto = page.locator("h1").filter(has_text=nombre_proyecto).first
            proyecto.wait_for(state="visible", timeout=30_000)
            proyecto.click()
            page.wait_for_url(f"**/projects/{pid}/**", timeout=30_000)
            page.wait_for_timeout(1_500)

            page.goto(f"https://app.cliperty.com/projects/{pid}/quoter", wait_until="domcontentloaded")
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
            modal = page.locator("cliperty-views-create-customer")
            page.wait_for_selector("#input-rut", state="visible", timeout=30_000)
            # RUT primero (con blur -> dispara la búsqueda, que autollena
            # "Persona Natural" en #input-typeRegisteredName y limpia el resto).
            set_input(page, "input-rut", data.get("rut", ""))
            try:
                page.wait_for_function(
                    "() => { const e = document.getElementById('input-typeRegisteredName');"
                    " return e && (e.value || '').trim().length > 0; }",
                    timeout=15_000,
                )
            except Exception:
                page.wait_for_timeout(3_000)
            page.wait_for_timeout(800)

            # Si el RUT ya existe en el portal, la búsqueda prefill el nombre.
            # No seguimos (el guardado se cuelga con clientes existentes) y avisamos.
            nombre_existente = page.evaluate(
                "() => (document.getElementById('input-name')?.value || '').trim()"
            )
            if nombre_existente:
                return {
                    "status": "error",
                    "message": (
                        f"El cliente {data.get('rut', '')} ya está registrado en el portal de "
                        "Grupo Araucana. Revisa si ya está bloqueado o gestiónalo manualmente."
                    ),
                }

            apellidos = f"{data.get('apellidoPaterno', '')} {data.get('apellidoMaterno', '')}".strip()
            set_input(page, "input-name",      data.get("nombres", ""))
            set_input(page, "input-lastName",  apellidos)
            set_input(page, "input-cellPhone", telefono_9(data.get("telefonoCelular", "")))
            set_input(page, "input-email",     data.get("correoElectronico", ""))
            page.wait_for_timeout(400)

            # Guardar cliente — el botón DENTRO del modal (hay otro "Guardar" en la
            # página de la cotización que queda detrás).
            modal.locator("button.btn_save").filter(has_text="Guardar").first.click()
            modal.wait_for(state="detached", timeout=20_000)
            page.wait_for_timeout(1_200)

            # ── 6. Datos Cotización (obligatorios) ─────────────────────────────
            _select_por_label(page, "#select-destiny", DESTINO_COMPRA)
            _select_por_label(page, "#select-origin",  MEDIO_ORIGEN)
            _select_por_label(page, "#select-source",  MEDIO_REALIZACION)

            # ── 7. Guardar cotización (botón de la página, no del modal) ───────
            page.locator("cliperty-views-create-quotation button.btn_save").filter(
                has_text="Guardar"
            ).first.click()
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
                "message": f"Cliente bloqueado en Cliperty (Grupo Araucana – {nombre_proyecto}): cotización generada.",
            }

    except Exception as e:
        return {"status": "error", "message": str(e)}


DATOS_PRUEBA = {
    "rut":               "16.936.472-9",
    "nombres":           "Prueba",
    "apellidoPaterno":   "Bloqueo",
    "apellidoMaterno":   "Araucana",
    "telefonoCelular":   "912345678",
    "correoElectronico": "prueba@capitalinteligente.cl",
    "proyecto":          "Aires de Marañon",
}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        data = json.loads(sys.argv[1])
    else:
        data = DATOS_PRUEBA

    result = bloquear_cliente(data)
    print(json.dumps(result, ensure_ascii=False))
