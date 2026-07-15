import type { FieldSchema } from '../types';

// Grupo Araucana bloquea por plataforma (Cliperty). El bloqueo = crear el cliente
// y generar una cotización de una unidad disponible con Medio de Origen =
// "Capital Inteligente" (todo eso lo hace el script sobre el proyecto fijo
// "Aires de Marañón"). El portal solo exige estos campos del cliente; el resto
// (región, comuna, dirección, fecha nac., sexo, profesión, nacionalidad) no es
// obligatorio, así que no se piden.
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
    ],
  };
}
