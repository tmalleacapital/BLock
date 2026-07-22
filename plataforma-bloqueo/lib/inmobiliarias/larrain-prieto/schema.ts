import type { FieldSchema } from '../types';

// Larraín Prieto bloquea por plataforma (GCI / PlanOK, igual que Sento). El
// portal solo exige estos campos del cliente (ni tipo de cliente, ni edad, ni
// comuna). El bloqueo registra al cliente con la leyenda "CAPITAL INTELIGENTE"
// en el proyecto fijo EDIFICIO MISSOURI 3885.
export function getFieldSchema(): FieldSchema {
  return {
    inmobiliaria: 'larrain-prieto',
    fields: [
      { key: 'rut',             label: 'RUT',              type: 'rut',  required: true  },
      { key: 'nombres',         label: 'Nombres',          type: 'text', required: true  },
      { key: 'apellidoPaterno', label: 'Apellido paterno', type: 'text', required: true  },
      { key: 'apellidoMaterno', label: 'Apellido materno', type: 'text', required: false },
      { key: 'telefonoCelular', label: 'Teléfono celular', type: 'phone', required: true },
      { key: 'correoElectronico', label: 'Correo electrónico', type: 'email', required: true },
    ],
  };
}
