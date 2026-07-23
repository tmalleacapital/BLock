"""
Bloqueo Cliente Sento.py
Automatización de bloqueo de clientes en el portal de Sento (GCI / PlanOK,
comercialinmobiliarias.cl).

Sento pasó de "por correo" a "por plataforma". El bloqueo consiste en registrar
al cliente a nombre de Capital Inteligente con la leyenda
"CAPITAL INTELIGENTE dd-mm-aaaa" (que queda en Observaciones de la ficha) y luego
enviar por correo a la inmobiliaria una captura de la ficha como comprobante.

Flujo:
  1. Login (SENTO_USER = rut-dv, SENTO_PASS).
  2. Sala de Ventas -> Inicio Cotización. Proyecto FIJO = ZA_NUEVA CATEDRAL.
     Se ingresa el RUT y se pulsa "Crear Cliente" -> abre wizard de 4 pasos.
  3. Paso 1 "Información Personal" (solo obligatorios): nombres, apellido paterno,
     tipo de cliente (Inversionista, fijo), edad, comuna (autocompleta
     región/provincia), teléfono celular, email.
  4. Pasos 2 y 3: sin obligatorios -> Continuar.
  5. Paso 4 "Otros": leyenda "CAPITAL INTELIGENTE dd-mm-aaaa" -> Finalizar.
  6. "Nueva Visita": medio de llegada = REFERIDO TERCEROS -> Guardar y Seguir.
  7. Ficha -> "Seguimiento Cliente": Evaluación (Muy Alta / Mails /
     "cliente capital inteligente") -> Guardar Evaluación.
  8. Captura de la tarjeta "Datos Cliente" (#panel_tab_cliente) y envío por correo
     a centroexperiencia@sento.cl como comprobante = fin del proceso.

Los diálogos nativos (alert de "creado"/"guardado") se auto-aceptan con
page.on("dialog", ...).

Uso standalone:  python "Bloqueo Cliente Sento.py"
Uso con datos:   python "Bloqueo Cliente Sento.py" '{"rut":"...", ...}'
"""

import sys
import os
import json
import smtplib
import datetime
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart

from playwright.sync_api import Page

from _browser_comun import load_dotenv, abrir_navegador, set_input, telefono_56

load_dotenv()

BASE        = "https://www.comercialinmobiliarias.cl/gci/sento/gi"
URL_LOGIN   = f"{BASE}/usuarios/agenda.php"
URL_COTIZAR = f"{BASE}/usuarios/ventas_proyecto.php?next=cotizar"

DESTINATARIOS = ["centroexperiencia@sento.cl"]

# Valores fijos del bloqueo (definición comercial de Capital Inteligente).
TIPO_CLIENTE_INVERSIONISTA = "1"        # cat_tpcliente
MEDIO_LLEGADA_REFERIDO     = "medio29"  # radio "REFERIDO TERCEROS" (value 11787)
EXPECTATIVA_MUY_ALTA       = "5"        # id_expectativa
TIPO_CONTACTO_MAILS        = "2"        # id_tipo_contacto
COMENTARIO_EVALUACION      = "cliente capital inteligente"


def _rut_partes(rut: str):
    """'20.592.329-2' -> ('20592329', '2'). Acepta con o sin guion/puntos."""
    limpio = rut.replace(".", "").replace(" ", "").upper()
    if "-" in limpio:
        num, dv = limpio.rsplit("-", 1)
    else:
        num, dv = limpio[:-1], limpio[-1:]
    return num, dv


def _comuna_value(page: Page, comuna: str) -> str:
    """Busca en el <select nat_dir_comuna> el value cuya etiqueta coincide
    (sin tildes/mayúsculas) con la comuna del formulario."""
    return page.evaluate(
        """({comuna}) => {
            const norm = s => (s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toUpperCase().trim();
            const sel = document.getElementById('nat_dir_comuna');
            if (!sel) return '';
            const target = norm(comuna);
            for (const o of sel.options) { if (norm(o.text) === target) return o.value; }
            return '';
        }""",
        {"comuna": comuna},
    )


def bloquear_cliente(data: dict) -> dict:
    usuario = os.environ.get("SENTO_USER", "")
    clave   = os.environ.get("SENTO_PASS", "")
    if not usuario or not clave:
        return {"status": "error", "message": "Faltan credenciales SENTO_USER / SENTO_PASS."}

    login_num, login_dv = _rut_partes(usuario)
    cli_num, cli_dv     = _rut_partes(data.get("rut", ""))
    fecha_hoy           = datetime.date.today().strftime("%d-%m-%Y")
    leyenda             = f"CAPITAL INTELIGENTE {fecha_hoy}"

    try:
        with abrir_navegador(headless=True, slow_mo=150, width=1440, height=960) as page:
            # ── 1. Login ───────────────────────────────────────────────────────
            page.goto(URL_LOGIN, wait_until="domcontentloaded")
            page.get_by_placeholder("Rut").fill(login_num)
            page.get_by_placeholder("Dv").fill(login_dv)
            page.get_by_placeholder("Ingrese su Contraseña").fill(clave)
            page.get_by_role("button", name="Ingresar").click()
            page.wait_for_load_state("domcontentloaded")
            page.wait_for_timeout(2_000)

            # Pop-up promocional de PlanOK (aparece a veces tras el login): cerrarlo
            # si está presente para que no tape los controles.
            try:
                cerrar = page.get_by_role("button", name="Cerrar")
                if cerrar.first.is_visible(timeout=3_000):
                    cerrar.first.click()
                    page.wait_for_timeout(500)
            except Exception:
                pass

            # ── 2. Inicio Cotización (proyecto fijo ZA_NUEVA CATEDRAL) ──────────
            page.goto(URL_COTIZAR, wait_until="domcontentloaded")
            page.wait_for_selector("#nat_rut_cotizacion", state="visible", timeout=30_000)
            page.wait_for_timeout(500)

            set_input(page, "nat_rut_cotizacion", cli_num)
            set_input(page, "nat_dv_rut_cotizacion", cli_dv)
            page.get_by_role("button", name="Crear Cliente").click()

            # Se abre el wizard "Creación de Cliente (Natural)".
            page.wait_for_selector("#nat_nombre", state="visible", timeout=30_000)
            page.wait_for_timeout(500)

            # ── 3. Paso 1 · Información Personal (solo campos obligatorios) ─────
            page.fill("#nat_nombre",    data.get("nombres", ""))
            page.fill("#nat_apellido1", data.get("apellidoPaterno", ""))

            page.select_option("#cat_tpcliente", TIPO_CLIENTE_INVERSIONISTA)
            page.select_option("#nat_edad", data.get("edad", ""))

            comuna_val = _comuna_value(page, data.get("comuna", ""))
            if not comuna_val:
                return {"status": "error",
                        "message": f"No se encontró la comuna '{data.get('comuna', '')}' en el portal de Sento."}
            set_input(page, "nat_dir_comuna", comuna_val)   # autocompleta región/provincia
            page.wait_for_timeout(1_200)

            page.fill("#nat_fono_celular", telefono_56(data.get("telefonoCelular", "")))
            page.fill("#nat_email",        data.get("correoElectronico", ""))

            # ── 4. Continuar hasta el paso 4 "Otros" ───────────────────────────
            # OJO: el botón "Finalizar" (#test) está visible en TODOS los pasos, así
            # que no sirve para detectar el paso 4. El marcador real es el campo de
            # la leyenda (#nat_descripcion_adicional); además en el paso 4 el botón
            # "Continuar" (#next) desaparece.
            for _ in range(6):
                if page.locator("#nat_descripcion_adicional").is_visible():
                    break
                if not page.locator("#next").is_visible():
                    break
                page.locator("#next").click()            # #next = botón Continuar
                page.wait_for_timeout(800)

            # ── 5. Paso 4 · leyenda + Finalizar ────────────────────────────────
            page.wait_for_selector("#nat_descripcion_adicional", state="visible", timeout=15_000)
            page.fill("#nat_descripcion_adicional", leyenda)
            page.locator("#test").click()                # Finalizar (crea el cliente)
            page.wait_for_load_state("domcontentloaded")

            # ── 6. Nueva Visita · Medio de llegada = REFERIDO TERCEROS ─────────
            page.wait_for_selector(f"#{MEDIO_LLEGADA_REFERIDO}", state="visible", timeout=30_000)
            page.locator(f"#{MEDIO_LLEGADA_REFERIDO}").check()
            page.locator("#btn_guardar_seguir").click()
            page.wait_for_load_state("domcontentloaded")

            # ── 7. Ficha · Evaluación Cliente ──────────────────────────────────
            page.get_by_role("button", name="Seguimiento Cliente").click()
            page.wait_for_selector("#btn_guardar_evaluacion", state="visible", timeout=30_000)
            page.wait_for_timeout(500)
            page.select_option("#id_expectativa",   EXPECTATIVA_MUY_ALTA)
            page.select_option("#id_tipo_contacto", TIPO_CONTACTO_MAILS)
            set_input(page, "comentario", COMENTARIO_EVALUACION)
            page.locator("#btn_guardar_evaluacion").click()
            page.wait_for_timeout(2_500)

            # ── 8. Captura de la tarjeta "Datos Cliente" ───────────────────────
            page.wait_for_selector("#panel_tab_cliente", state="visible", timeout=30_000)
            page.wait_for_timeout(800)
            png_bytes = page.locator("#panel_tab_cliente").screenshot()

    except Exception as e:
        return {"status": "error", "message": str(e)}

    # ── 9. Enviar comprobante por correo ───────────────────────────────────────
    return _enviar_comprobante(data, png_bytes, fecha_hoy)


def _enviar_comprobante(data: dict, png_bytes: bytes, fecha_hoy: str) -> dict:
    gmail_user = os.environ.get("GMAIL_USER", "")
    gmail_pass = os.environ.get("GMAIL_PASS", "")

    rut    = data.get("rut", "")
    nombre = " ".join(
        v for v in (data.get("nombres", ""), data.get("apellidoPaterno", ""), data.get("apellidoMaterno", ""))
        if v
    ).strip()

    asunto = f"Bloqueo de cliente – {rut} – Capital Inteligente"
    cuerpo = (
        '<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.6;">'
        '<p>Estimados,</p>'
        f'<p>Adjuntamos comprobante del bloqueo del cliente <strong>{nombre}</strong> '
        f'(RUT {rut}) registrado en su plataforma con fecha {fecha_hoy}.</p>'
        '<p><img src="cid:comprobante" alt="Comprobante de bloqueo" '
        'style="max-width:560px;border:1px solid #ddd;border-radius:6px;"></p>'
        '<p style="margin-top:16px;">Saludos,<br>Soporte Comercial – Capital Inteligente</p>'
        '</div>'
    )

    try:
        root = MIMEMultipart("related")
        root["From"]    = gmail_user
        root["To"]      = ", ".join(DESTINATARIOS)
        root["Subject"] = asunto

        alt = MIMEMultipart("alternative")
        alt.attach(MIMEText(cuerpo, "html", "utf-8"))
        root.attach(alt)

        img = MIMEImage(png_bytes, _subtype="png")
        img.add_header("Content-ID", "<comprobante>")
        img.add_header("Content-Disposition", "inline", filename="comprobante_bloqueo.png")
        root.attach(img)

        with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(gmail_user, gmail_pass)
            smtp.sendmail(gmail_user, DESTINATARIOS, root.as_string())

        return {
            "status": "success",
            "message": f"Cliente bloqueado en el portal de Sento y comprobante enviado a {', '.join(DESTINATARIOS)}.",
        }
    except Exception as e:
        return {"status": "error",
                "message": f"El cliente se bloqueó en el portal, pero falló el envío del comprobante: {e}"}


DATOS_PRUEBA = {
    "rut":               "16.936.472-9",
    "nombres":           "Prueba",
    "apellidoPaterno":   "Bloqueo",
    "edad":              "36-45",
    "comuna":            "Santiago",
    "telefonoCelular":   "+56990000000",
    "correoElectronico": "prueba@capitalinteligente.cl",
}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        datos = json.loads(sys.argv[1])
    else:
        datos = DATOS_PRUEBA

    resultado = bloquear_cliente(datos)
    print(json.dumps(resultado, ensure_ascii=False))
