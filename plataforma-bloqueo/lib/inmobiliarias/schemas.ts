import type { FieldSchema } from './types';
import { getFieldSchema as getImaginaSchema }      from './imagina/schema';
import { getFieldSchema as getIngevecSchema }      from './ingevec/schema';
import { getFieldSchema as getSentoSchema }        from './sento/schema';
import { getFieldSchema as getLarrainPrietoSchema } from './larrain-prieto/schema';
import { getFieldSchema as getVicunaMackennaSchema } from './vicuna-mackenna/schema';
import { getFieldSchema as getEuroSchema }         from './euro/schema';
import { getFieldSchema as getSimonettiSchema }    from './simonetti/schema';
import { getFieldSchema as getEcasaSchema }        from './ecasa/schema';
import { getFieldSchema as getDeisaSchema }        from './deisa/schema';
import { getFieldSchema as getNorteVerdeSchema }   from './norte-verde/schema';
import { getFieldSchema as getPazSchema }          from './paz/schema';
import { getFieldSchema as getFaiSchema }          from './fai/schema';

export interface InmobiliariaEntry {
  key: string;
  name: string;
  enabled: boolean;
  active: boolean;
}

export const INMOBILIARIAS: InmobiliariaEntry[] = [
  { key: 'imagina',         name: 'Imagina',          enabled: true, active: true  },
  { key: 'ingevec',         name: 'Ingevec',          enabled: true, active: false },
  { key: 'sento',           name: 'Sento',            enabled: true, active: true  },
  { key: 'larrain-prieto',  name: 'Larraín Prieto',   enabled: true, active: false },
  { key: 'vicuna-mackenna', name: 'Vicuña Mackenna',  enabled: true, active: false },
  { key: 'euro',            name: 'Euro',             enabled: true, active: true  },
  { key: 'simonetti',       name: 'Simonetti',        enabled: true, active: true  },
  { key: 'ecasa',           name: 'Ecasa',            enabled: true, active: true  },
  { key: 'deisa',           name: 'Deisa',            enabled: true, active: false },
  { key: 'norte-verde',     name: 'Norte Verde',      enabled: true, active: false },
  { key: 'paz',             name: 'Paz',              enabled: true, active: true  },
  { key: 'fai',             name: 'FAI',              enabled: true, active: true  },
];

export function getSchema(key: string): FieldSchema | undefined {
  switch (key) {
    case 'imagina':         return getImaginaSchema();
    case 'ingevec':         return getIngevecSchema();
    case 'sento':           return getSentoSchema();
    case 'larrain-prieto':  return getLarrainPrietoSchema();
    case 'vicuna-mackenna': return getVicunaMackennaSchema();
    case 'euro':            return getEuroSchema();
    case 'simonetti':       return getSimonettiSchema();
    case 'ecasa':           return getEcasaSchema();
    case 'deisa':           return getDeisaSchema();
    case 'norte-verde':     return getNorteVerdeSchema();
    case 'paz':             return getPazSchema();
    case 'fai':             return getFaiSchema();
    default:                return undefined;
  }
}
