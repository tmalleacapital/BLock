"""
Bloqueo Cliente Larrain Prieto.py
Automatización de bloqueo de clientes en el portal de Larraín Prieto (GCI / PlanOK,
comercialinmobiliarias.cl). Mismo sistema que Sento.

El bloqueo consiste en registrar al cliente a nombre de Capital Inteligente con la
leyenda "CAPITAL INTELIGENTE dd-mm-aaaa" (que queda en Observaciones de la ficha)
y luego enviar por correo a la inmobiliaria una captura de la ficha como comprobante.

Flujo:
  1. Login (LARRAINPRIETO_USER = rut-dv, LARRAINPRIETO_PASS).
  2. Inicio Cotización. Proyecto FIJO = EDIFICIO MISSOURI 3885 (id 9). Se ingresa
     el RUT y se pulsa "Crear Cliente" -> abre wizard de 4 pasos.
  3. Paso 1 (solo obligatorios): nombres, apellido paterno, teléfono, email.
     (Larraín Prieto NO exige tipo de cliente, edad ni comuna.)
  4. Pasos 2 y 3: sin obligatorios -> Continuar.
  5. Paso 4 "Otros": leyenda "CAPITAL INTELIGENTE dd-mm-aaaa" -> Finalizar.
  6. "Nueva Visita": medio de llegada = BROKERS -> Guardar y Seguir.
  7. Ficha -> "Seguimiento Cliente": Evaluación (Muy Alta / Mails /
     "cliente capital inteligente") -> Guardar Evaluación.
  8. Captura de la tarjeta "Datos Cliente" (#panel_tab_cliente) y envío por correo
     a nriquelme@larrainprieto.cl como comprobante = fin del proceso.

Uso standalone:  python "Bloqueo Cliente Larrain Prieto.py"
Uso con datos:   python "Bloqueo Cliente Larrain Prieto.py" '{"rut":"...", ...}'
"""

import sys
import os
import json
import smtplib
import datetime
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart

from _browser_comun import load_dotenv, abrir_navegador, set_input, telefono_56

load_dotenv()

BASE        = "https://www.comercialinmobiliarias.cl/gci/larrainprieto/gi"
URL_LOGIN   = f"{BASE}/usuarios/agenda.php"
URL_COTIZAR = f"{BASE}/usuarios/ventas_proyecto.php?next=cotizar"

DESTINATARIOS = ["nriquelme@larrainprieto.cl"]

# Valores fijos del bloqueo (definición comercial de Capital Inteligente).
PROYECTO_MISSOURI      = "9"        # EDIFICIO MISSOURI 3885 (select proyectos)
MEDIO_LLEGADA_BROKERS  = "medio3"   # radio "BROKERS" (value 1934)
EXPECTATIVA_MUY_ALTA   = "5"        # id_expectativa
TIPO_CONTACTO_MAILS    = "2"        # id_tipo_contacto
COMENTARIO_EVALUACION  = "cliente capital inteligente"


def _rut_partes(rut: str):
    """'20.592.329-2' -> ('20592329', '2'). Acepta con o sin guion/puntos."""
    limpio = rut.replace(".", "").replace(" ", "").upper()
    if "-" in limpio:
        num, dv = limpio.rsplit("-", 1)
    else:
        num, dv = limpio[:-1], limpio[-1:]
    return num, dv


def bloquear_cliente(data: dict) -> dict:
    usuario = os.environ.get("LARRAINPRIETO_USER", "")
    clave   = os.environ.get("LARRAINPRIETO_PASS", "")
    if not usuario or not clave:
        return {"status": "error",
                "message": "Faltan credenciales LARRAINPRIETO_USER / LARRAINPRIETO_PASS."}

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

            # Pop-up promocional de PlanOK (aparece a veces tras el login): cerrarlo.
            try:
                cerrar = page.get_by_role("button", name="Cerrar")
                if cerrar.first.is_visible(timeout=3_000):
                    cerrar.first.click()
                    page.wait_for_timeout(500)
            except Exception:
                pass

            # ── 2. Inicio Cotización · proyecto fijo MISSOURI ──────────────────
            page.goto(URL_COTIZAR, wait_until="domcontentloaded")
            page.wait_for_selector("#nat_rut_cotizacion", state="visible", timeout=30_000)
            page.wait_for_timeout(500)

            page.select_option("select[name='proyectos']", PROYECTO_MISSOURI)
            page.wait_for_timeout(800)

            set_input(page, "nat_rut_cotizacion", cli_num)
            set_input(page, "nat_dv_rut_cotizacion", cli_dv)
            page.get_by_role("button", name="Crear Cliente").click()

            # Se abre el wizard "Creación de Cliente (Natural)".
            page.wait_for_selector("#nat_nombre", state="visible", timeout=30_000)
            page.wait_for_timeout(500)

            # ── 3. Paso 1 · solo obligatorios ──────────────────────────────────
            page.fill("#nat_nombre",    data.get("nombres", ""))
            page.fill("#nat_apellido1", data.get("apellidoPaterno", ""))
            if data.get("apellidoMaterno"):
                page.fill("#nat_apellido2", data.get("apellidoMaterno", ""))
            page.fill("#nat_fono_celular", telefono_56(data.get("telefonoCelular", "")))
            page.fill("#nat_email",        data.get("correoElectronico", ""))

            # ── 4. Continuar hasta el paso 4 "Otros" ───────────────────────────
            # OJO: "Finalizar" (#test) está visible en TODOS los pasos; el marcador
            # real del paso 4 es el campo de la leyenda, y "Continuar" (#next)
            # desaparece en el paso 4.
            for _ in range(6):
                if page.locator("#nat_descripcion_adicional").is_visible():
                    break
                if not page.locator("#next").is_visible():
                    break
                page.locator("#next").click()
                page.wait_for_timeout(800)

            # ── 5. Paso 4 · leyenda + Finalizar ────────────────────────────────
            page.wait_for_selector("#nat_descripcion_adicional", state="visible", timeout=15_000)
            page.fill("#nat_descripcion_adicional", leyenda)
            page.locator("#test").click()                # Finalizar (crea el cliente)
            page.wait_for_load_state("domcontentloaded")

            # ── 6. Nueva Visita · Medio de llegada = BROKERS ───────────────────
            page.wait_for_selector(f"#{MEDIO_LLEGADA_BROKERS}", state="visible", timeout=30_000)
            page.locator(f"#{MEDIO_LLEGADA_BROKERS}").check()
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
            "message": f"Cliente bloqueado en el portal de Larraín Prieto y comprobante enviado a {', '.join(DESTINATARIOS)}.",
        }
    except Exception as e:
        return {"status": "error",
                "message": f"El cliente se bloqueó en el portal, pero falló el envío del comprobante: {e}"}


DATOS_PRUEBA = {
    "rut":               "16.936.472-9",
    "nombres":           "Prueba",
    "apellidoPaterno":   "Bloqueo",
    "apellidoMaterno":   "Larrain",
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
