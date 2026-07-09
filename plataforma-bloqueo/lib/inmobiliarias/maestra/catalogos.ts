import type { SelectOption } from '../types';

// Regiones tal como aparecen en el desplegable del portal Maestra (ddpRegion).
// El value corresponde al value de la <option> del portal — el script lo usa para el __doPostBack.
export const REGIONES: SelectOption[] = [
  { value: '4',  label: 'Coquimbo'            },
  { value: '6',  label: "Región de O'Higgins" },
  { value: '8',  label: 'Biobío'              },
  { value: '9',  label: 'La Araucanía'        },
  { value: '10', label: 'Los Lagos'           },
  { value: '13', label: 'Metropolitana'       },
];

// Comunas donde Maestra tiene proyectos. value = label hasta contar con el value real del portal.
export const COMUNAS: SelectOption[] = [
  'La Serena',
  'Rancagua',
  'Concepción',
  'Temuco',
  'Puerto Montt',
  'Cerrillos',
  'Independencia',
  'La Cisterna',
  'Pedro Aguirre Cerda',
  'Pudahuel',
  'Quilicura',
  'Quinta Normal',
  'Renca',
  'San Joaquín',
].map((c) => ({ value: c, label: c }));
