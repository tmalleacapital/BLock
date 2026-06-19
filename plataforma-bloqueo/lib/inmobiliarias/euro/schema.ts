import type { FieldSchema } from '../types';

export function getFieldSchema(): FieldSchema {
  return {
    inmobiliaria: 'euro',
    fields: [
      { key: 'rut',              label: 'RUT',                type: 'rut',   required: true },
      { key: 'apellidoPaterno',  label: 'Apellido paterno',   type: 'text',  required: true },
      { key: 'apellidoMaterno',  label: 'Apellido materno',   type: 'text',  required: true },
      { key: 'nombres',          label: 'Nombres',            type: 'text',  required: true },
      {
        key: 'genero',
        label: 'Género',
        type: 'select',
        required: true,
        options: [
          { value: 'Masculino', label: 'Masculino' },
          { value: 'Femenino',  label: 'Femenino'  },
        ],
      },
      {
        key: 'fechaNacimiento',
        label: 'Fecha de nacimiento',
        type: 'text',
        required: true,
        helpText: 'Formato DD-MM-AAAA',
      },
      {
        key: 'estadoCivil',
        label: 'Estado civil',
        type: 'select',
        required: true,
        options: [
          { value: 'Soltero',            label: 'Soltero/a'           },
          { value: 'Casado',             label: 'Casado/a'            },
          { value: 'Divorciado',         label: 'Divorciado/a'        },
          { value: 'Viudo',              label: 'Viudo/a'             },
          { value: 'Conviviente Civil',  label: 'Conviviente civil'   },
        ],
      },
      { key: 'rutConyuge',       label: 'RUT cónyuge',        type: 'rut',  required: true, showWhen: { field: 'estadoCivil', value: 'Conviviente Civil' } },
      { key: 'nombreConyuge',   label: 'Nombre cónyuge',     type: 'text', required: true, showWhen: { field: 'estadoCivil', value: 'Conviviente Civil' } },
      { key: 'apellidoConyuge', label: 'Apellido cónyuge',   type: 'text', required: true, showWhen: { field: 'estadoCivil', value: 'Conviviente Civil' } },
      { key: 'nacionalidad',     label: 'Nacionalidad',       type: 'text',  required: true },
      { key: 'profesion',        label: 'Profesión',          type: 'text',  required: true, helpText: 'Tal como aparece en el portal' },
      { key: 'telefonoCelular',  label: 'Teléfono celular',   type: 'phone', required: true },
      { key: 'correoElectronico',label: 'Correo electrónico', type: 'email', required: true },
    ],
  };
}
