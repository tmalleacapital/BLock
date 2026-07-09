import type { FieldSchema } from '../types';

export function getFieldSchema(): FieldSchema {
  return {
    inmobiliaria: 'maestra',
    fields: [
      { key: 'rut',               label: 'RUT',              type: 'rut',   required: true },
      { key: 'nombres',           label: 'Nombre',           type: 'text',  required: true },
      { key: 'apellidoPaterno',   label: 'Apellido paterno', type: 'text',  required: true },
      { key: 'apellidoMaterno',   label: 'Apellido materno', type: 'text',  required: true },
      { key: 'correoElectronico', label: 'Email',            type: 'email', required: true },
      { key: 'telefonoCelular',   label: 'Teléfono',         type: 'phone', required: true },
    ],
    groups: [
      { label: 'Identidad', keys: ['rut', 'nombres', 'apellidoPaterno', 'apellidoMaterno'] },
      { label: 'Contacto',  keys: ['correoElectronico', 'telefonoCelular'] },
    ],
  };
}
