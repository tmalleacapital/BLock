import type { FieldSchema } from '../types';
import { REGIONES } from '../imagina/catalogos';

export function getFieldSchema(): FieldSchema {
  return {
    inmobiliaria: 'deisa',
    fields: [
      { key: 'rut', label: 'RUT', type: 'rut', required: true },
      { key: 'apellidoPaterno', label: 'Apellido paterno', type: 'text', required: true },
      { key: 'apellidoMaterno', label: 'Apellido materno', type: 'text', required: true },
      { key: 'nombres', label: 'Nombres', type: 'text', required: true },
      {
        key: 'sexo',
        label: 'Sexo',
        type: 'select',
        required: true,
        options: [
          { value: 'masculino', label: 'Masculino' },
          { value: 'femenino', label: 'Femenino' },
        ],
      },
      { key: 'calle', label: 'Calle', type: 'text', required: true },
      { key: 'numero', label: 'Número', type: 'text', required: true },
      {
        key: 'region',
        label: 'Región',
        type: 'select',
        required: true,
        options: REGIONES,
      },
      {
        key: 'comuna',
        label: 'Comuna',
        type: 'text',
        required: true,
        helpText: 'Escríbela tal como aparece en el portal',
      },
      { key: 'telefonoCelular', label: 'Teléfono celular', type: 'phone', required: true },
      { key: 'correoElectronico', label: 'Correo electrónico', type: 'email', required: true },
    ],
  };
}
