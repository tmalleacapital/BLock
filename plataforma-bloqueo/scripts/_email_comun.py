"""
_email_comun.py
Plantilla común del correo de bloqueo de cliente (Capital Inteligente).

Cada script de inmobiliaria define sus DESTINATARIOS y LABELS y llama a
enviar_bloqueo(). Así el texto del correo vive en un solo lugar.
"""

import os
import io
import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from PIL import Image


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

LOGO_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Logo-Capital-Inteligente.webp')

# Campos que corresponden a la unidad cotizada (referencia), no al cliente.
REFERENCE_KEYS = ("proyecto", "unidad", "tipologia")

FIRMA_HTML = """
<br><br>
<table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:13px;color:#333;">
  <tr>
    <td style="padding-right:18px;vertical-align:middle;">
      <img src="cid:logo_ci" alt="Capital Inteligente" width="80" style="display:block;">
    </td>
    <td style="vertical-align:top;padding-left:18px;border-left:1px solid #cccccc;">
      <strong style="font-size:14px;color:#1a3066;">Equipo Soporte Comercial</strong><br>
      <span style="color:#555555;">Capital Inteligente</span><br>
      <hr style="border:none;border-top:1px solid #cccccc;margin:6px 0;width:200px;text-align:left;">
      <span style="color:#555555;">&#9993;&nbsp;stock@capitalinteligente.cl</span><br>
      <span style="color:#555555;">&#127758;&nbsp;www.capitalinteligente.cl</span>
    </td>
  </tr>
</table>
"""


def _filas(labels: dict, data: dict, keys: list) -> list:
    filas = []
    for key in keys:
        valor = (data.get(key, "") or "").strip()
        if valor:
            filas.append(
                f'<tr><td style="color:#666;padding:2px 18px 2px 0;white-space:nowrap;">{labels[key]}</td>'
                f'<td style="padding:2px 0;">{valor}</td></tr>'
            )
    return filas


def construir_cuerpo(labels: dict, data: dict) -> str:
    cliente_keys = [k for k in labels if k not in REFERENCE_KEYS]
    ref_keys     = [k for k in labels if k in REFERENCE_KEYS]

    filas_cliente = _filas(labels, data, cliente_keys)
    filas_ref     = _filas(labels, data, ref_keys)

    partes = [
        '<div style="font-family:Arial,sans-serif;font-size:14px;color:#333333;line-height:1.6;">',
        '<p>Estimada Inmobiliaria,</p>',
        '<p>Solicitamos por favor bloquear al siguiente cliente en sus plataformas comerciales, '
        'con el fin de evitar topes en Sala de Ventas mientras se encuentra siendo asesorado por '
        'Capital Inteligente.</p>',
        '<p style="font-weight:bold;margin-bottom:4px;">Datos del cliente</p>',
        f'<table cellpadding="0" cellspacing="0" style="font-size:14px;color:#333333;">{"".join(filas_cliente)}</table>',
    ]
    if filas_ref:
        partes += [
            '<p style="font-weight:bold;margin:16px 0 4px;">Cotización (referencia)</p>',
            f'<table cellpadding="0" cellspacing="0" style="font-size:14px;color:#333333;">{"".join(filas_ref)}</table>',
        ]
    partes += [
        '<div style="background:#fff8e1;border-radius:6px;padding:12px 14px;margin:16px 0;">',
        '<p style="font-weight:bold;color:#8a6d00;margin:0 0 8px;">&#9888;&#65039; Importante</p>',
        '<p style="margin:0 0 8px;">Esta solicitud corresponde únicamente al bloqueo del '
        '<strong>cliente</strong>.</p>',
        '<p style="margin:0 0 8px;">No es necesario bloquear la unidad, ya que el cliente aún se '
        'encuentra evaluando distintas alternativas y este correo no confirma una reserva.</p>',
        '<p style="margin:0;">La información de la unidad se incorpora únicamente como referencia '
        'de la cotización realizada.</p>',
        '</div>',
        '<p>Muchas gracias.</p>',
        '</div>',
    ]
    return "".join(partes) + FIRMA_HTML


def enviar_bloqueo(destinatarios: list, labels: dict, data: dict) -> dict:
    if not destinatarios:
        return {"status": "error", "message": "Destinatarios no configurados."}

    gmail_user = os.environ.get('GMAIL_USER', '')
    gmail_pass = os.environ.get('GMAIL_PASS', '')

    nombre_completo = (
        f"{data.get('nombres', '')} "
        f"{data.get('apellidoPaterno', '')} "
        f"{data.get('apellidoMaterno', '')}"
    ).strip().upper()
    rut       = data.get("rut", "")
    fecha_hoy = datetime.date.today().strftime("%d-%m-%Y")
    asunto    = f"BLOQUEO CLIENTE {nombre_completo} / RUT {rut} / FECHA {fecha_hoy}"

    cuerpo_html = construir_cuerpo(labels, data)

    try:
        msg_root = MIMEMultipart("related")
        msg_root["From"]    = gmail_user
        msg_root["To"]      = ", ".join(destinatarios)
        msg_root["Subject"] = asunto

        msg_alt = MIMEMultipart("alternative")
        msg_alt.attach(MIMEText(cuerpo_html, "html", "utf-8"))
        msg_root.attach(msg_alt)

        pil_img = Image.open(LOGO_PATH).convert("RGBA")
        w, h = pil_img.size
        new_w = 160
        new_h = int(h * new_w / w)
        pil_img = pil_img.resize((new_w, new_h), Image.LANCZOS)
        buf = io.BytesIO()
        pil_img.save(buf, format="PNG", optimize=True)
        img = MIMEImage(buf.getvalue(), _subtype="png")
        img.add_header("Content-ID", "<logo_ci>")
        img.add_header("Content-Disposition", "inline", filename="logo.png")
        msg_root.attach(img)

        with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(gmail_user, gmail_pass)
            smtp.sendmail(gmail_user, destinatarios, msg_root.as_string())

        return {
            "status":  "success",
            "message": f"Correo de bloqueo enviado correctamente a {', '.join(destinatarios)}.",
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}
