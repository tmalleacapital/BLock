import type { FieldSchema } from '../types';

// Paz Corp bloquea por plataforma (Sistema de Brokers de paz.cl → "Registro de
// leads"). El bloqueo = registrar el lead del cliente a nombre de Capital
// Inteligente. Formulario de una sola página: RUT, Nombre y Apellido, Teléfono
// y Proyecto. El correo NO se pide al asesor: siempre es el de soporte de CI
// (fijo en el script). El asesor elige el proyecto de la lista del portal;
// el `value` es el código interno de Paz (codProyecto).
export function getFieldSchema(): FieldSchema {
  return {
    inmobiliaria: 'paz',
    // Layout propio: el default (GROUPS de FichaForm) no incluye 'nombreCompleto',
    // así que se define aquí para que todos los campos se rendericen juntos.
    groups: [
      { label: 'Datos del cliente', keys: ['rut', 'nombreCompleto', 'telefonoCelular', 'proyecto'] },
    ],
    fields: [
      { key: 'rut',             label: 'RUT',               type: 'rut',   required: true },
      { key: 'nombreCompleto',  label: 'Nombre y apellido', type: 'text',  required: true },
      { key: 'telefonoCelular', label: 'Teléfono celular',  type: 'phone', required: true,
        helpText: 'Con o sin +56 (se normaliza automáticamente)' },
      {
        key: 'proyecto',
        label: 'Proyecto',
        type: 'select',
        required: true,
        options: [
          { value: 'I2271', label: 'Atelier Ñuñoa'                 },
          { value: 'I1701', label: 'Caiquén'                       },
          { value: 'I1881', label: 'Carmen 72'                     },
          { value: 'I1561', label: 'Carrión 2'                     },
          { value: 'I1691', label: 'Colombia 7664'                 },
          { value: 'I1711', label: 'Edificio IV Centenario 1025'   },
          { value: 'I2211', label: 'Exequiel Fernández 3.430'      },
          { value: 'I2341', label: 'Mercado Serrano 245'           },
          { value: 'I2021', label: 'Mosaic Art'                    },
          { value: 'I1661', label: 'Neo Art'                       },
          { value: 'I1521', label: 'Parque Arboleda Lo Curro Et. 2' },
          { value: 'I1731', label: 'Plaza Lira Santa Victoria 382' },
          { value: 'I2361', label: 'Plaza Lira Santa Victoria 382B' },
          { value: 'I2291', label: 'San Francisco 211'             },
          { value: 'I1771', label: 'Santa Elvira 46'               },
          { value: 'I1971', label: 'Seminario 2'                   },
          { value: 'I1961', label: 'Seminario 850'                 },
          { value: 'I2141', label: 'Teresa Vial 1139'              },
          { value: 'I1361', label: 'Verdece II'                    },
          { value: 'I2371', label: 'Vista Golf II'                 },
          { value: 'I1321', label: 'Vista Golf La Dehesa'          },
          { value: 'I1741', label: 'Workin Oficinas'               },
          { value: 'I1911', label: 'Zorzal'                        },
        ],
      },
    ],
  };
}
