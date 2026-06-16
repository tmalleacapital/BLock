import type { FieldSchema } from './types';
import { getFieldSchema as getConvetSchema }         from './convet/schema';
import { getFieldSchema as getDeisaSchema }          from './deisa/schema';
import { getFieldSchema as getEcasaSchema }          from './ecasa/schema';
import { getFieldSchema as getEuroSchema }           from './euro/schema';
import { getFieldSchema as getFaiSchema }            from './fai/schema';
import { getFieldSchema as getFundamentaSchema }     from './fundamenta/schema';
import { getFieldSchema as getImaginaSchema }        from './imagina/schema';
import { getFieldSchema as getIngevecSchema }        from './ingevec/schema';
import { getFieldSchema as getLarrainPrietoSchema }  from './larrain-prieto/schema';
import { getFieldSchema as getNorteVerdeSchema }     from './norte-verde/schema';
import { getFieldSchema as getPazSchema }            from './paz/schema';
import { getFieldSchema as getSentoSchema }          from './sento/schema';
import { getFieldSchema as getSimonettiSchema }      from './simonetti/schema';
import { getFieldSchema as getVicunaMackennaSchema } from './vicuna-mackenna/schema';
import { getFieldSchema as getVivaSchema }           from './viva/schema';

export interface InmobiliariaEntry {
  key: string;
  name: string;
  enabled: boolean;
  active: boolean;
  emailRecipients?: string[];
}

export const INMOBILIARIAS: InmobiliariaEntry[] = [
  { key: 'convet',          name: 'Convet',          enabled: true, active: true  },
  { key: 'deisa',           name: 'Deisa',           enabled: true, active: false },
  { key: 'ecasa',           name: 'Ecasa',           enabled: true, active: true,  emailRecipients: ['canalinversiones@ecasa.cl'] },
  { key: 'euro',            name: 'Euro',            enabled: true, active: true  },
  { key: 'fai',             name: 'FAI',             enabled: true, active: true,  emailRecipients: ['Francisco.flores@flesan.cl'] },
  { key: 'fundamenta',      name: 'Fundamenta',      enabled: true, active: true,  emailRecipients: ['andres.lopez@fundamenta.cl'] },
  { key: 'imagina',         name: 'Imagina',         enabled: true, active: true  },
  { key: 'ingevec',         name: 'Ingevec',         enabled: true, active: false },
  { key: 'larrain-prieto',  name: 'Larraín Prieto',  enabled: true, active: false },
  { key: 'norte-verde',     name: 'Norte Verde',     enabled: true, active: false },
  { key: 'paz',             name: 'Paz',             enabled: true, active: true,  emailRecipients: ['issys.ferrer@pazcorp.cl', 'fernando.florindo@pazcorp.cl'] },
  { key: 'sento',           name: 'Sento',           enabled: true, active: true,  emailRecipients: ['mvarela@sento.cl'] },
  { key: 'simonetti',       name: 'Simonetti',       enabled: true, active: true  },
  { key: 'vicuna-mackenna', name: 'Vicuña Mackenna', enabled: true, active: false },
  { key: 'viva',            name: 'Viva',            enabled: true, active: true,  emailRecipients: ['ventas@iviva.cl'] },
];

export function getSchema(key: string): FieldSchema | undefined {
  switch (key) {
    case 'convet':          return getConvetSchema();
    case 'deisa':           return getDeisaSchema();
    case 'ecasa':           return getEcasaSchema();
    case 'euro':            return getEuroSchema();
    case 'fai':             return getFaiSchema();
    case 'fundamenta':      return getFundamentaSchema();
    case 'imagina':         return getImaginaSchema();
    case 'ingevec':         return getIngevecSchema();
    case 'larrain-prieto':  return getLarrainPrietoSchema();
    case 'norte-verde':     return getNorteVerdeSchema();
    case 'paz':             return getPazSchema();
    case 'sento':           return getSentoSchema();
    case 'simonetti':       return getSimonettiSchema();
    case 'vicuna-mackenna': return getVicunaMackennaSchema();
    case 'viva':            return getVivaSchema();
    default:                return undefined;
  }
}
