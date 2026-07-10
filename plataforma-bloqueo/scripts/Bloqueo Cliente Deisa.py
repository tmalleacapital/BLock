"""
Bloqueo Cliente Deisa.py
Envía el correo de bloqueo de cliente a Deisa vía SMTP de Gmail.

Uso con datos:   python "Bloqueo Cliente Deisa.py" '{"rut":"...", ...}'
"""

import sys
import json
from _email_comun import enviar_bloqueo

DESTINATARIOS = ["dsanchez@deisa.cl"]

LABELS = {
    "rut":               "RUT",
    "apellidoPaterno":   "Apellido paterno",
    "apellidoMaterno":   "Apellido materno",
    "nombres":           "Nombres",
    "sexo":              "Sexo",
    "calle":             "Calle",
    "numero":            "Número",
    "region":            "Región",
    "comuna":            "Comuna",
    "telefonoCelular":   "Teléfono celular",
    "correoElectronico": "Correo electrónico",
    "proyecto":          "Proyecto",
    "unidad":            "Unidad",
    "tipologia":         "Tipología",
}


def bloquear_cliente(data: dict) -> dict:
    return enviar_bloqueo(DESTINATARIOS, LABELS, data)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        result = bloquear_cliente(json.loads(sys.argv[1]))
        print(json.dumps(result, ensure_ascii=False))
