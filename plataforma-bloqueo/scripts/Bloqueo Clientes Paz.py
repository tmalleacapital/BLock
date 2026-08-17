"""
Bloqueo Clientes Paz.py
Automatización de bloqueo de clientes en el Sistema de Brokers de Paz Corp
(https://www.paz.cl/brokers/registro-lead).

El bloqueo consiste en REGISTRAR EL LEAD del cliente a nombre de Capital
Inteligente. Formulario de una sola página (sin wizard ni modal):
  RUT (#run), Nombre y Apellido (#nombreCompleto), Correo (#correo, FIJO al
  soporte de CI), Teléfono (#fono, +56) y Proyecto (#codProyecto, por código).
Al enviar aparece la alerta `.registro-lead__alert--success`
("Lead registrado exitosamente.").

Login: correo + contraseña de broker (PAZ_USER / PAZ_PASS).

Uso standalone:  python "Bloqueo Clientes Paz.py"
Uso con datos:   python "Bloqueo Clientes Paz.py" '{"rut":"...", ...}'
Ver navegador:   HEADLESS=0 python "Bloqueo Clientes Paz.py"
"""

import sys
import json
import os

from _browser_comun import load_dotenv, abrir_navegador, telefono_56

load_dotenv()

URL_REGISTRO = "https://www.paz.cl/brokers/registro-lead"
URL_LOGIN    = "https://www.paz.cl/brokers/login"
HEADLESS     = os.environ.get('HEADLESS', '1') != '0'

# El correo del lead es SIEMPRE el de soporte de Capital Inteligente (así los
# leads vuelven a CI). No se le pide al asesor.
CORREO_FIJO = "soporte.comercial@capitalinteligente.cl"

# UA de Chrome real: paz.cl puede ser lento o rechazar el UA "HeadlessChrome".
UA_CHROME = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)


def _abrir_pagina(page, url: str, espera_selector: str, timeout: int = 60_000) -> None:
    """Navega de forma tolerante: espera el 'commit' (llega la respuesta) y luego
    el contenido real (espera_selector), con un reintento. Es más robusto que
    'domcontentloaded' cuando el portal responde lento desde el servidor."""
    ultimo = None
    for _ in range(2):
        try:
            page.goto(url, wait_until="commit", timeout=timeout)
            page.wait_for_selector(espera_selector, timeout=timeout)
            return
        except Exception as e:
            ultimo = e
            page.wait_for_timeout(2_000)
    raise ultimo


def _cerrar_cookies(page) -> None:
    """Descarta el aviso de cookies si aparece (elige 'Rechazar')."""
    for etiqueta in ("Rechazar", "Aceptar"):
        try:
            btn = page.get_by_role("button", name=etiqueta)
            if btn.first.is_visible():
                btn.first.click(timeout=3_000)
                page.wait_for_timeout(400)
                return
        except Exception:
            pass


def bloquear_cliente(data: dict) -> dict:
    usuario = os.environ.get('PAZ_USER')
    clave = os.environ.get('PAZ_PASS')
    if not usuario or not clave:
        return {"status": "error",
                "message": "Faltan credenciales: define PAZ_USER y PAZ_PASS."}

    proyecto = (data.get("proyecto") or "").strip()
    if not proyecto:
        return {"status": "error", "message": "Falta el proyecto de Paz a registrar."}

    try:
        with abrir_navegador(headless=HEADLESS, slow_mo=150, width=1440, height=960,
                             user_agent=UA_CHROME) as page:
            page.set_default_timeout(45_000)

            # ── 1. Ir al registro (sin sesión redirige al login) ───────────────
            _abrir_pagina(page, URL_REGISTRO, "#run, #clave")
            page.wait_for_timeout(1_000)
            _cerrar_cookies(page)

            # ── 2. Login si aparece el formulario de acceso (#clave) ───────────
            if page.locator("#clave").count() > 0:
                page.fill("#correo", usuario)
                page.fill("#clave", clave)
                page.get_by_role("button", name="Ingresar").first.click()
                # Tras el login debe aparecer el formulario de registro.
                try:
                    page.wait_for_selector("#run", timeout=45_000)
                except Exception:
                    _abrir_pagina(page, URL_REGISTRO, "#run")
                _cerrar_cookies(page)

            # ── 3. Rellenar el formulario "Registro de leads" ──────────────────
            # page.fill() usa el setter nativo (React/Vue lo reconocen); este form
            # valida al enviar, no al perder foco, así que no hace falta blur.
            page.wait_for_selector("#run", state="visible", timeout=45_000)
            page.fill("#run",            data.get("rut", ""))
            page.fill("#nombreCompleto", data.get("nombreCompleto", ""))
            page.fill("#correo",         CORREO_FIJO)
            page.fill("#fono",           telefono_56(data.get("telefonoCelular", "")))
            # Proyecto por código interno de Paz (value del <option>).
            page.select_option("#codProyecto", value=proyecto)
            page.wait_for_timeout(400)

            # ── 4. Registrar ──────────────────────────────────────────────────
            page.get_by_role("button", name="Registrar").first.click()

            # ── 5. Leer la alerta de resultado ────────────────────────────────
            alerta = page.locator(".registro-lead__alert").first
            alerta.wait_for(state="visible", timeout=30_000)
            page.wait_for_timeout(300)
            clase = alerta.get_attribute("class") or ""
            texto = (alerta.text_content() or "").strip()

            if "success" in clase:
                return {
                    "status": "success",
                    "message": f"Lead registrado en Paz Corp: {texto}",
                }
            return {
                "status": "error",
                "message": texto or "Paz rechazó el registro del lead.",
            }

    except Exception as e:
        return {"status": "error", "message": str(e)}


DATOS_PRUEBA = {
    "rut":             "20.592.329-2",
    "nombreCompleto":  "Valentín Pedrero Plá",
    "telefonoCelular": "+56977346296",
    "proyecto":        "I1561",  # Carrión 2
}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        data = json.loads(sys.argv[1])
    else:
        data = DATOS_PRUEBA

    result = bloquear_cliente(data)
    print(json.dumps(result, ensure_ascii=False))
