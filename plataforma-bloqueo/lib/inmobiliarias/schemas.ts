import type { FieldSchema } from './types';
import { getFieldSchema as getAraucanaSchema }       from './araucana/schema';
import { getFieldSchema as getConvetSchema }         from './convet/schema';
import { getFieldSchema as getDanacorpSchema }       from './danacorp/schema';
import { getFieldSchema as getDeisaSchema }          from './deisa/schema';
import { getFieldSchema as getEcasaSchema }          from './ecasa/schema';
import { getFieldSchema as getEuroSchema }           from './euro/schema';
import { getFieldSchema as getFaiSchema }            from './fai/schema';
import { getFieldSchema as getFundamentaSchema }     from './fundamenta/schema';
import { getFieldSchema as getImaginaSchema }        from './imagina/schema';
import { getFieldSchema as getIngevecSchema }        from './ingevec/schema';
import { getFieldSchema as getLarrainPrietoSchema }  from './larrain-prieto/schema';
import { getFieldSchema as getLebenSchema }          from './leben/schema';
import { getFieldSchema as getMaestraSchema }        from './maestra/schema';
import { getFieldSchema as getNorteVerdeSchema }     from './norte-verde/schema';
import { getFieldSchema as getPazSchema }            from './paz/schema';
import { getFieldSchema as getSentoSchema }          from './sento/schema';
import { getFieldSchema as getSimonettiSchema }      from './simonetti/schema';
import { getFieldSchema as getVicunaMackennaSchema } from './vicuna-mackenna/schema';
import { getFieldSchema as getVivaSchema }           from './viva/schema';

export interface InmobiliariaEntry {
  key: string;
  name: string;
  active: boolean;
  paused?: boolean;
  emailRecipients?: string[];
  /** Nombre del script Python en /scripts que ejecuta el bloqueo. Si falta, la
   *  automatización aún no está disponible (la ruta responde "pending"). */
  script?: string;
}

export const INMOBILIARIAS: InmobiliariaEntry[] = [
  { key: 'araucana',        name: 'Grupo Araucana',  active: true,  script: 'Bloqueo de Clientes Grupo Araucana.py' },
  { key: 'convet',          name: 'Convet',          active: true,  emailRecipients: ['vcorrales@convet.cl'], script: 'Bloqueo Clientes Convet.py' },
  // Danacorp: fuera de servicio a pedido — no se lista en ningún lado. Se
  // conserva la configuración por si se reactiva (basta con active: true).
  { key: 'danacorp',        name: 'Danacorp',        active: false, emailRecipients: ['sdonoso@danacorp.cl'], script: 'Bloqueo Cliente Danacorp.py' },
  { key: 'deisa',           name: 'Deisa',           active: true,  emailRecipients: ['dsanchez@deisa.cl'], script: 'Bloqueo Cliente Deisa.py' },
  { key: 'ecasa',           name: 'Ecasa',           active: true,  emailRecipients: ['canalinversiones@ecasa.cl'], script: 'Bloqueo Clientes Ecasa.py' },
  { key: 'euro',            name: 'Euro',            active: true,  script: 'Bloqueo Cliente Euro.py' },
  { key: 'fai',             name: 'FAI',             active: true,  emailRecipients: ['Francisco.flores@flesan.cl'], script: 'Bloqueo Clientes Fai.py' },
  { key: 'fundamenta',      name: 'Fundamenta',      active: true,  emailRecipients: ['andres.lopez@fundamenta.cl'], script: 'Bloqueo Clientes Fundamenta.py' },
  { key: 'imagina',         name: 'Imagina',         active: true,  script: 'Bloqueo Cliente Imagina.py' },
  { key: 'ingevec',         name: 'Ingevec',         active: false },
  { key: 'larrain-prieto',  name: 'Larraín Prieto',  active: true,  script: 'Bloqueo Cliente Larrain Prieto.py' },
  { key: 'leben',           name: 'Leben',           active: true,  emailRecipients: ['lsilva@ileben.cl', 'jfoppiano@ileben.cl'], script: 'Bloqueo Cliente Leben.py' },
  { key: 'maestra',         name: 'Maestra',         active: true,  script: 'Bloqueo de Clientes Maestra.py' },
  { key: 'norte-verde',     name: 'Norte Verde',     active: false },
  // Paz Corp: por PLATAFORMA (Sistema de Brokers → Registro de leads). Paz
  // whitelisteó las IP de salida de Railway. Validada end-to-end y ACTIVA.
  { key: 'paz',             name: 'Paz',             active: true,  script: 'Bloqueo Clientes Paz.py' },
  // Sento: fuera de servicio (falta habilitar algo del portal) — no se lista en
  // ningún lado. Se conserva la config para reactivarla con active: true.
  { key: 'sento',           name: 'Sento',           active: false, script: 'Bloqueo Cliente Sento.py' },
  { key: 'simonetti',       name: 'Simonetti',       active: true,  script: 'Bloqueo Cliente Simonetti.py' },
  { key: 'vicuna-mackenna', name: 'Vicuña Mackenna', active: false },
  { key: 'viva',            name: 'Viva',            active: true,  emailRecipients: ['ventas@iviva.cl'], script: 'Bloqueo Clientes Viva.py' },
];

export function getSchema(key: string): FieldSchema | undefined {
  switch (key) {
    case 'araucana':         return getAraucanaSchema();
    case 'convet':          return getConvetSchema();
    case 'danacorp':        return getDanacorpSchema();
    case 'deisa':           return getDeisaSchema();
    case 'ecasa':           return getEcasaSchema();
    case 'euro':            return getEuroSchema();
    case 'fai':             return getFaiSchema();
    case 'fundamenta':      return getFundamentaSchema();
    case 'imagina':         return getImaginaSchema();
    case 'ingevec':         return getIngevecSchema();
    case 'larrain-prieto':  return getLarrainPrietoSchema();
    case 'leben':           return getLebenSchema();
    case 'maestra':         return getMaestraSchema();
    case 'norte-verde':     return getNorteVerdeSchema();
    case 'paz':             return getPazSchema();
    case 'sento':           return getSentoSchema();
    case 'simonetti':       return getSimonettiSchema();
    case 'vicuna-mackenna': return getVicunaMackennaSchema();
    case 'viva':            return getVivaSchema();
    default:                return undefined;
  }
}
