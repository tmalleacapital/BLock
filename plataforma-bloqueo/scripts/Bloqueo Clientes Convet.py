"""
Bloqueo Clientes Convet.py
Envía un correo de bloqueo de cliente a Inmobiliaria Activa (plataforma Convet)
vía SMTP de Gmail.

Uso con datos:   python "Bloqueo Clientes Convet.py" '{"rut":"...", ...}'
"""

import sys
import json
import datetime
import smtplib
import io
import os
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

LOGO_PATH     = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Logo-Capital-Inteligente.webp')
GMAIL_USER    = os.environ['GMAIL_USER']
GMAIL_PASS    = os.environ['GMAIL_PASS']
DESTINATARIOS = ["TODO@activa.cl"]  # TODO: reemplazar con el correo de contacto de Activa/Convet

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

LABELS = {
    "rut":               "RUT",
    "apellidoPaterno":   "Apellido paterno",
    "apellidoMaterno":   "Apellido materno",
    "nombres":           "Nombres",
    "genero":            "Género",
    "fechaNacimiento":   "Fecha de nacimiento",
    "estadoCivil":       "Estado civil",
    "nacionalidad":      "Nacionalidad",
    "profesion":         "Profesión",
    "telefonoCelular":   "Teléfono celular",
    "correoElectronico": "Correo electrónico",
    "direccion":         "Dirección",
    "region":            "Región",
    "comuna":            "Comuna",
    "ciudad":            "Ciudad",
    "proyecto":          "Proyecto",
    "unidad":            "Unidad",
    "tipologia":         "Tipología",
}


def bloquear_cliente(data: dict) -> dict:
    nombre_completo = (
        f"{data.get('nombres', '')} "
        f"{data.get('apellidoPaterno', '')} "
        f"{data.get('apellidoMaterno', '')}"
    ).strip().upper()
    rut       = data.get("rut", "")
    fecha_hoy = datetime.date.today().strftime("%d-%m-%Y")

    asunto = f"BLOQUEO CLIENTE {nombre_completo} / RUT {rut} / FECHA {fecha_hoy}"

    cuerpo_lines = [
        "Estimado, adjuntos datos de cliente al cual queremos hacer la solicitud de bloqueo",
        "",
    ]
    for key, label in LABELS.items():
        valor = data.get(key, "").strip()
        if valor:
            cuerpo_lines.append(f"{label}: {valor}")
    cuerpo_lines += ["", "Saludos Cordiales"]
    cuerpo_html = "<br>".join(cuerpo_lines) + FIRMA_HTML

    try:
        msg_root = MIMEMultipart("related")
        msg_root["From"]    = GMAIL_USER
        msg_root["To"]      = ", ".join(DESTINATARIOS)
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
            smtp.login(GMAIL_USER, GMAIL_PASS)
            smtp.sendmail(GMAIL_USER, DESTINATARIOS, msg_root.as_string())

        return {
            "status":  "success",
            "message": f"Correo de bloqueo enviado correctamente a {', '.join(DESTINATARIOS)}.",
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    if len(sys.argv) > 1:
        data = json.loads(sys.argv[1])
        result = bloquear_cliente(data)
        print(json.dumps(result, ensure_ascii=False))
