"""
Bloqueo Cliente Simonetti.py
Automatización de bloqueo de clientes en el portal Simonetti (Mobysuite v1.18).

Flujo:
  1. Login (SIMONETTI_USER / SIMONETTI_PASS) + CAPTCHA Altcha.
  2. Clientes -> Crear cliente (wizard de 6 pasos).
  3. Paso 1 "Datos de cliente" — SOLO campos necesarios:
     RUT (sin puntos), Nombres, Apellidos (paterno+materno), Género, Fecha nac.,
     Nacionalidad, Profesión=OTROS (fija), Teléfono móvil, Email,
     Tipo de contacto=VISITA, Medio de información=CAPITAL INTELIGENTE.
  4. Siguiente -> Paso 2 "Dirección": Dirección, Región, Comuna, Ciudad.
  5. Guardar -> crea el cliente -> botón "Cotizar".
  6. Cotización: Proyecto (1º) -> Tipo de bien=Departamento -> N° de bien (1º) ->
     Agregar bien -> Medio de información=CAPITAL INTELIGENTE, Tipo contacto=VISITA ->
     Guardar (save_quote) = bloqueo.

Los desplegables del cliente son vue-select (input.vs__search dentro del contenedor
[data-cy=...]); se seleccionan tipeando y confirmando con Enter.

Uso standalone:  python "Bloqueo Cliente Simonetti.py"
Uso con datos:   python "Bloqueo Cliente Simonetti.py" '{"rut":"...", ...}'
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

URL_LOGIN     = "https://simonetti.mobysuite.com/login"
URL_CUSTOMERS = "https://simonetti.mobysuite.com/customers"
CREDS = {
    "usuario": os.environ['SIMONETTI_USER'],
    "clave":   os.environ['SIMONETTI_PASS'],
}

# Valores fijos del bloqueo (definición comercial de Capital Inteligente).
PROFESION_FIJA = "OTROS"
TIPO_CONTACTO  = "VISITA"
MEDIO_INFO     = "CAPITAL INTELIGENTE"


def _rut_sin_puntos(rut: str) -> str:
    """El campo RUT del portal no acepta puntos: '19.851.181-1' -> '19851181-1'."""
    return rut.replace(".", "").replace(" ", "").upper()


def vs_select(page: Page, cy: str, texto: str) -> None:
    """Selecciona en un vue-select ubicado por su contenedor data-cy:
    abre, tipea el texto y confirma con Enter (elige la primera coincidencia)."""
    cont = page.locator(f'[data-cy="{cy}"]')
    cont.scroll_into_view_if_needed()
    inp = cont.locator('input.vs__search')
    inp.click()
    page.wait_for_timeout(200)
    page.keyboard.type(texto, delay=50)
    page.wait_for_timeout(600)
    # Preferir click sobre la opción exacta; si no, Enter sobre la resaltada.
    opt = page.locator('li.vs__dropdown-option, .vs__dropdown-option').filter(has_text=texto).first
    try:
        opt.wait_for(state="visible", timeout=6_000)
        opt.click()
    except Exception:
        page.keyboard.press("Enter")
    page.wait_for_timeout(300)


def placeholder_select_nth(page: Page, label: str, n: int) -> None:
    """Abre un div.placeholderInputText (selector de la cotización) y elige la n-ésima opción."""
    tgt = page.locator('div.placeholderInputText').filter(has_text=label).first
    tgt.wait_for(state="visible", timeout=30_000)
    tgt.scroll_into_view_if_needed()
    tgt.click()
    page.wait_for_timeout(500)
    opt = page.locator('li.vs__dropdown-option').nth(n - 1)
    opt.wait_for(state="visible", timeout=20_000)
    opt.scroll_into_view_if_needed()
    opt.click()
    page.wait_for_timeout(300)


def placeholder_select_texto(page: Page, label: str, opcion: str) -> None:
    """Abre un div.placeholderInputText (selector de la cotización) y elige por texto."""
    tgt = page.locator('div.placeholderInputText').filter(has_text=label).first
    tgt.wait_for(state="visible", timeout=30_000)
    tgt.scroll_into_view_if_needed()
    tgt.click()
    page.wait_for_timeout(500)
    opt = page.locator('li.vs__dropdown-option').filter(has_text=opcion).first
    opt.wait_for(state="visible", timeout=20_000)
    opt.scroll_into_view_if_needed()
    opt.click()
    page.wait_for_timeout(300)


def _rellenar_cy(page: Page, cy: str, valor: str) -> None:
    loc = page.locator(f'[data-cy="{cy}"]')
    loc.scroll_into_view_if_needed()
    loc.click()
    loc.fill(valor)


def bloquear_cliente(data: dict) -> dict:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, slow_mo=300)
        context = browser.new_context(viewport={"width": 1920, "height": 1080}, locale='es-CL')
        page = context.new_page()

        try:
            # ── 1. Login ───────────────────────────────────────────────────────
            page.goto(URL_LOGIN, wait_until="networkidle")
            page.fill("#login-email", CREDS["usuario"])
            page.fill('input[type="password"]', CREDS["clave"])

            # CAPTCHA Altcha (proof-of-work que resuelve el propio browser)
            chk = page.locator('.altcha-checkbox input[type="checkbox"]')
            chk.wait_for(state="visible", timeout=30_000)
            chk.scroll_into_view_if_needed()
            page.wait_for_timeout(2_000)
            chk.evaluate("el => el.click()")
            page.wait_for_function(
                '() => { const el = document.querySelector(".altcha-checkbox input[type=\'checkbox\']"); return el ? el.checked : false; }',
                timeout=180_000,
            )
            page.click('button[data-cy="login-submit"]')
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1_500)

            # ── 2. Ir a Clientes -> Crear cliente ──────────────────────────────
            page.goto(URL_CUSTOMERS, wait_until="networkidle")
            page.wait_for_timeout(1_000)
            page.get_by_role("button", name="Crear cliente").click()
            page.locator('[data-cy="create-customer-rut"]').wait_for(state="visible", timeout=30_000)
            page.wait_for_timeout(800)

            # ── 3. Paso 1 · Datos de cliente ───────────────────────────────────
            # RUT (sin puntos); el portal rechaza el RUT si ya está asociado a otro usuario.
            _rellenar_cy(page, 'create-customer-rut', _rut_sin_puntos(data.get("rut", "")))
            page.keyboard.press("Tab")
            page.wait_for_timeout(2_000)
            if page.locator('text=asociado a otro usuario').first.is_visible():
                return {"status": "error",
                        "message": "El RUT ya está asociado a otro asesor en Simonetti; no se puede bloquear."}

            _rellenar_cy(page, 'create-customer-names', data.get("nombres", ""))
            apellidos = f"{data.get('apellidoPaterno', '')} {data.get('apellidoMaterno', '')}".strip()
            _rellenar_cy(page, 'create-customer-lastname', apellidos)
            _rellenar_cy(page, 'create-customer-birthday', data.get("fechaNacimiento", ""))

            # Teléfono móvil (segundo vti__input; el primero es "Teléfono fijo")
            tel = page.locator("input.vti__input").nth(1)
            tel.scroll_into_view_if_needed()
            tel.click()
            tel.fill(data.get("telefonoCelular", ""))
            page.wait_for_timeout(200)

            _rellenar_cy(page, 'create-customer-email', data.get("correoElectronico", ""))

            vs_select(page, 'create-customer-gender', data.get("genero", ""))
            vs_select(page, 'create-customer-nationality', data.get("nacionalidad", ""))
            vs_select(page, 'create-customer-profession', PROFESION_FIJA)
            vs_select(page, 'create-customer-contact-type', TIPO_CONTACTO)
            vs_select(page, 'create-customer-media-information', MEDIO_INFO)

            # Teléfono/email duplicados: el portal muestra un modal bloqueante.
            if page.locator('text=teléfono ya existente').first.is_visible():
                return {"status": "error",
                        "message": "El teléfono ya está registrado para otro cliente en Simonetti."}

            # ── 4. Siguiente -> Paso 2 · Dirección ─────────────────────────────
            page.get_by_role("button", name="Siguiente").click()
            page.locator('[data-cy="create-customer-address"]').wait_for(state="visible", timeout=30_000)
            page.wait_for_timeout(800)

            _rellenar_cy(page, 'create-customer-address', data.get("direccion", ""))
            vs_select(page, 'create-customer-region', data.get("region", ""))
            page.wait_for_timeout(800)  # la comuna se puebla tras elegir región
            vs_select(page, 'create-customer-commune', data.get("comuna", ""))
            _rellenar_cy(page, 'create-customer-city', data.get("ciudad", ""))

            # ── 5. Guardar cliente ─────────────────────────────────────────────
            page.get_by_role("button", name="Guardar").first.click()
            page.wait_for_timeout(1_500)
            # Modal "Éxito: El cliente se guardó exitosamente" (SweetAlert, autocierra)
            page.wait_for_timeout(2_500)

            # ── 6. Cotizar ─────────────────────────────────────────────────────
            cotizar = page.get_by_role("button", name="Cotizar")
            cotizar.wait_for(state="visible", timeout=30_000)
            cotizar.click()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2_000)

            # Proyecto (1º) -> Tipo de bien = Departamento -> N° de bien (1º)
            placeholder_select_nth(page, "Proyecto", 1)
            page.wait_for_timeout(1_500)
            placeholder_select_texto(page, "Tipo de bien", "Departamento")
            page.wait_for_timeout(1_500)
            placeholder_select_nth(page, "N° de bien", 1)
            page.wait_for_timeout(800)

            # Agregar bien
            add_btn = page.locator('button[data-cy="add_quote"]', has_text="Agregar bien").first
            add_btn.scroll_into_view_if_needed()
            add_btn.click()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2_000)

            # Medios de información (obligatorios en la cotización)
            placeholder_select_texto(page, "Medio de información", MEDIO_INFO)
            placeholder_select_texto(page, "Tipo contacto", TIPO_CONTACTO)

            # ── 7. Guardar cotización = bloqueo ────────────────────────────────
            page.locator('button[data-cy="save_quote"]').scroll_into_view_if_needed()
            page.locator('button[data-cy="save_quote"]').click()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(3_500)

            return {
                "status": "success",
                "message": "Cliente bloqueado correctamente en el portal de Simonetti.",
            }

        except Exception as e:
            return {"status": "error", "message": str(e)}

        finally:
            browser.close()


DATOS_PRUEBA = {
    "rut":               "19.851.181-1",
    "nombres":           "Dahia Camila",
    "apellidoPaterno":   "Jerez",
    "apellidoMaterno":   "Muñoz",
    "genero":            "Femenino",
    "fechaNacimiento":   "05-03-1998",
    "nacionalidad":      "Chilena",
    "telefonoCelular":   "978375686",
    "correoElectronico": "djerez@capitalinteligente.cl",
    "direccion":         "Avenida Presidente Kennedy 7301",
    "region":            "Región Metropolitana de Santiago",
    "comuna":            "Las Condes",
    "ciudad":            "Santiago",
}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        data = json.loads(sys.argv[1])
    else:
        data = DATOS_PRUEBA

    result = bloquear_cliente(data)
    print(json.dumps(result, ensure_ascii=False))
