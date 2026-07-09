import type { FieldSchema } from '../types';
import { REGIONES, COMUNAS } from './catalogos';

export function getFieldSchema(): FieldSchema {
  return {
    inmobiliaria: 'maestra',
    fields: [
      { key: 'rut',               label: 'RUT',              type: 'rut',            required: true },
      { key: 'nombres',           label: 'Nombre',           type: 'text',           required: true },
      { key: 'apellidoPaterno',   label: 'Apellido paterno', type: 'text',           required: true },
      { key: 'apellidoMaterno',   label: 'Apellido materno', type: 'text',           required: true },
      { key: 'correoElectronico', label: 'Email',            type: 'email',          required: true },
      { key: 'telefonoCelular',   label: 'Teléfono',         type: 'phone',          required: true },
      { key: 'region',            label: 'Región',           type: 'select',         required: true, options: REGIONES },
      { key: 'comuna',            label: 'Comuna',           type: 'select',         required: true, options: COMUNAS },
      { key: 'proyecto',          label: 'Proyecto',         type: 'cascade-parent', required: true },
      { key: 'unidad',            label: 'Unidad',           type: 'cascade-child',  required: true },
      { key: 'tipologia',         label: 'Tipología',        type: 'cascade-auto',   required: true },
    ],
    groups: [
      { label: 'Identidad',             keys: ['rut', 'nombres', 'apellidoPaterno', 'apellidoMaterno'] },
      { label: 'Contacto',              keys: ['correoElectronico', 'telefonoCelular'] },
      { label: 'Búsqueda de proyectos', keys: ['region', 'comuna', 'proyecto', 'unidad', 'tipologia'] },
    ],
  };
}
