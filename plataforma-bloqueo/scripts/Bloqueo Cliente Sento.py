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
  3. Paso 1 "Información Personal": nombre, apellidos, fecha nac., tipo de cliente
     (Inversionista, fijo), edad (derivada de la fecha nac.), género, comuna
     (autocompleta región/provincia), teléfono celular, email.
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
import unicodedata
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart

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


def _norm(s: str) -> str:
    """Normaliza (sin tildes, mayúsculas) para comparar comunas."""
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.upper().strip()


def _edad_rango(fecha_nac: str) -> str:
    """Deriva el rango de edad (value del <select nat_edad>) desde DD-MM-AAAA."""
    try:
        d, m, a = [int(x) for x in fecha_nac.replace("/", "-").split("-")]
        hoy = datetime.date.today()
        edad = hoy.year - a - ((hoy.month, hoy.day) < (m, d))
    except Exception:
        return "36-45"  # fallback razonable si la fecha viene rara
    if edad <= 25:
        return "1-25"
    if edad <= 35:
        return "26-35"
    if edad <= 45:
        return "36-45"
    if edad <= 55:
        return "46-55"
    if edad <= 65:
        return "56-65"
    return "66-99"


def _telefono(valor: str) -> str:
    """Normaliza a formato +56XXXXXXXXX que espera el portal."""
    t = (valor or "").replace(" ", "").replace("-", "")
    if t.startswith("+"):
        return t
    if t.startswith("56"):
        return "+" + t
    if len(t) == 9:
        return "+56" + t
    return t


def _set(page: Page, campo_id: str, valor: str) -> bool:
    """Fija el valor de un input/textarea/select por id y dispara los eventos
    del framework (input/change/blur)."""
    return page.evaluate(
        """({id, val}) => {
            const el = document.getElementById(id);
            if (!el) return false;
            el.value = val;
            el.dispatchEvent(new Event('input',  {bubbles:true}));
            el.dispatchEvent(new Event('change', {bubbles:true}));
            el.dispatchEvent(new Event('blur',   {bubbles:true}));
            return true;
        }""",
        {"id": campo_id, "val": valor},
    )


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

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, slow_mo=150)
        context = browser.new_context(viewport={"width": 1440, "height": 960}, locale="es-CL")
        page = context.new_page()
        page.on("dialog", lambda d: d.accept())  # auto-acepta alerts nativos

        try:
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

            _set(page, "nat_rut_cotizacion", cli_num)
            _set(page, "nat_dv_rut_cotizacion", cli_dv)
            page.get_by_role("button", name="Crear Cliente").click()

            # Se abre el wizard "Creación de Cliente (Natural)".
            page.wait_for_selector("#nat_nombre", state="visible", timeout=30_000)
            page.wait_for_timeout(500)

            # ── 3. Paso 1 · Información Personal ────────────────────────────────
            page.fill("#nat_nombre",    data.get("nombres", ""))
            page.fill("#nat_apellido1", data.get("apellidoPaterno", ""))
            page.fill("#nat_apellido2", data.get("apellidoMaterno", ""))
            page.fill("#nat_fecha_nacimiento", data.get("fechaNacimiento", ""))

            page.select_option("#cat_tpcliente", TIPO_CLIENTE_INVERSIONISTA)
            page.select_option("#nat_edad", _edad_rango(data.get("fechaNacimiento", "")))

            genero = (data.get("genero", "") or "").strip().upper()
            if genero in ("MASCULINO", "FEMENINO"):
                page.select_option("#nat_sexo", genero)

            comuna_val = _comuna_value(page, data.get("comuna", ""))
            if not comuna_val:
                return {"status": "error",
                        "message": f"No se encontró la comuna '{data.get('comuna', '')}' en el portal de Sento."}
            _set(page, "nat_dir_comuna", comuna_val)   # autocompleta región/provincia
            page.wait_for_timeout(1_200)

            page.fill("#nat_fono_celular", _telefono(data.get("telefonoCelular", "")))
            page.fill("#nat_email",        data.get("correoElectronico", ""))

            # ── 4. Continuar hasta el paso 4 "Otros" ───────────────────────────
            for _ in range(6):
                if page.locator("#test").is_visible():   # #test = botón Finalizar (paso 4)
                    break
                page.locator("#next").click()            # #next = botón Continuar
                page.wait_for_timeout(700)

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
            _set(page, "comentario", COMENTARIO_EVALUACION)
            page.locator("#btn_guardar_evaluacion").click()
            page.wait_for_timeout(2_500)

            # ── 8. Captura de la tarjeta "Datos Cliente" ───────────────────────
            page.wait_for_selector("#panel_tab_cliente", state="visible", timeout=30_000)
            page.wait_for_timeout(800)
            png_bytes = page.locator("#panel_tab_cliente").screenshot()

        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            browser.close()

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
    "apellidoMaterno":   "Sento",
    "genero":            "Masculino",
    "fechaNacimiento":   "05-08-1988",
    "telefonoCelular":   "+56990000000",
    "correoElectronico": "prueba@capitalinteligente.cl",
    "comuna":            "Santiago",
}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        datos = json.loads(sys.argv[1])
    else:
        datos = DATOS_PRUEBA

    resultado = bloquear_cliente(datos)
    print(json.dumps(resultado, ensure_ascii=False))
