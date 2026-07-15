import type { FieldSchema } from '../types';

// Grupo Araucana bloquea por plataforma (Cliperty). El bloqueo = crear el cliente
// y generar una cotización de una unidad disponible con Medio de Origen =
// "Capital Inteligente". El asesor elige el proyecto; el portal solo exige estos
// campos del cliente (el resto —región, comuna, dirección, fecha nac., sexo,
// profesión, nacionalidad— no es obligatorio, así que no se pide).
export function getFieldSchema(): FieldSchema {
  return {
    inmobiliaria: 'araucana',
    fields: [
      { key: 'rut',             label: 'RUT',              type: 'rut',  required: true },
      { key: 'nombres',         label: 'Nombres',          type: 'text', required: true },
      { key: 'apellidoPaterno', label: 'Apellido paterno', type: 'text', required: true },
      { key: 'apellidoMaterno', label: 'Apellido materno', type: 'text', required: false },
      { key: 'telefonoCelular', label: 'Teléfono celular', type: 'phone', required: true,
        helpText: 'Formato: 9XXXXXXXX (9 dígitos, sin +56)' },
      { key: 'correoElectronico', label: 'Correo electrónico', type: 'email', required: true },
      {
        key: 'proyecto',
        label: 'Proyecto',
        type: 'select',
        required: true,
        options: [
          // value = texto exacto del <h1> de la tarjeta en Cliperty (sin tilde en "Marañon")
          { value: 'Aires de Marañon', label: 'Aires de Marañón' },
          { value: 'Las Brisas',       label: 'Las Brisas'       },
          { value: 'Miraflores',       label: 'Miraflores'       },
        ],
      },
    ],
  };
}
