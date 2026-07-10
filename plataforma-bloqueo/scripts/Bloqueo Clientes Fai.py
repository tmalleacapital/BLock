"""
Bloqueo Clientes Fai.py
Envía el correo de bloqueo de cliente a FAI vía SMTP de Gmail.

Uso con datos:   python "Bloqueo Clientes Fai.py" '{"rut":"...", ...}'
"""

import sys
import json
from _email_comun import enviar_bloqueo

DESTINATARIOS = ["Francisco.flores@flesan.cl"]

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
    return enviar_bloqueo(DESTINATARIOS, LABELS, data)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        result = bloquear_cliente(json.loads(sys.argv[1]))
        print(json.dumps(result, ensure_ascii=False))
