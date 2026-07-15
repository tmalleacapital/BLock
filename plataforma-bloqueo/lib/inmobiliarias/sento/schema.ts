import type { FieldSchema } from '../types';

const COMUNAS = [
  'Arica','Camarones','Putre','General Lagos',
  'Iquique','Alto Hospicio','Pozo Almonte','Camiña','Colchane','Huara','Pica',
  'Antofagasta','Mejillones','Sierra Gorda','Taltal','Calama','Ollagüe','San Pedro de Atacama','Tocopilla','María Elena',
  'Copiapó','Caldera','Tierra Amarilla','Chañaral','Diego de Almagro','Vallenar','Alto del Carmen','Freirina','Huasco',
  'La Serena','Coquimbo','Andacollo','La Higuera','Paiguano','Vicuña','Illapel','Canela','Los Vilos','Salamanca','Ovalle','Combarbalá','Monte Patria','Punitaqui','Río Hurtado',
  'Valparaíso','Casablanca','Concón','Juan Fernández','Puchuncaví','Quintero','Viña del Mar','Isla de Pascua','Los Andes','Calle Larga','Rinconada','San Esteban','La Ligua','Cabildo','Papudo','Petorca','Zapallar','Quillota','Calera','Hijuelas','La Cruz','Nogales','San Antonio','Algarrobo','Cartagena','El Quisco','El Tabo','Santo Domingo','San Felipe','Catemu','Llaillay','Panquehue','Putaendo','Santa María','Quilpué','Limache','Olmué','Villa Alemana',
  'Santiago','Cerrillos','Cerro Navia','Conchalí','El Bosque','Estación Central','Huechuraba','Independencia','La Cisterna','La Florida','La Granja','La Pintana','La Reina','Las Condes','Lo Barnechea','Lo Espejo','Lo Prado','Macul','Maipú','Ñuñoa','Pedro Aguirre Cerda','Peñalolén','Providencia','Pudahuel','Quilicura','Quinta Normal','Recoleta','Renca','San Joaquín','San Miguel','San Ramón','Vitacura','Puente Alto','Pirque','San José de Maipo','Colina','Lampa','Tiltil','San Bernardo','Buin','Calera de Tango','Paine','Melipilla','Alhué','Curacaví','María Pinto','San Pedro','Talagante','El Monte','Isla de Maipo','Padre Hurtado','Peñaflor',
  'Rancagua','Codegua','Coinco','Coltauco','Doñihue','Graneros','Las Cabras','Machalí','Malloa','Mostazal','Olivar','Peumo','Pichidegua','Quinta de Tilcoco','Rengo','Requínoa','San Vicente','Pichilemu','La Estrella','Litueche','Marchihue','Navidad','Paredones','San Fernando','Chépica','Chimbarongo','Lolol','Nancagua','Palmilla','Peralillo','Placilla','Pumanque','Santa Cruz',
  'Talca','Constitución','Curepto','Empedrado','Maule','Pelarco','Pencahue','Río Claro','San Clemente','San Rafael','Cauquenes','Chanco','Pelluhue','Curicó','Hualañé','Licantén','Molina','Rauco','Romeral','Sagrada Familia','Teno','Vichuquén','Linares','Colbún','Longaví','Parral','Retiro','San Javier','Villa Alegre','Yerbas Buenas',
  'Chillán','Bulnes','Chillán Viejo','El Carmen','Pemuco','Pinto','Quillón','San Ignacio','Yungay','Cobquecura','Coelemu','Ninhue','Portezuelo','Quirihue','Ránquil','Treguaco','Coihueco','Ñiquén','San Carlos','San Fabián','San Nicolás',
  'Concepción','Coronel','Chiguayante','Florida','Hualqui','Lota','Penco','San Pedro de la Paz','Santa Juana','Talcahuano','Tomé','Hualpén','Lebu','Arauco','Cañete','Contulmo','Curanilahue','Los Álamos','Tirúa','Los Ángeles','Antuco','Cabrero','Laja','Mulchén','Nacimiento','Negrete','Quilaco','Quilleco','San Rosendo','Santa Bárbara','Tucapel','Yumbel','Alto Biobío',
  'Temuco','Carahue','Cunco','Curarrehue','Freire','Galvarino','Gorbea','Lautaro','Loncoche','Melipeuco','Nueva Imperial','Padre Las Casas','Perquenco','Pitrufquén','Pucón','Saavedra','Teodoro Schmidt','Toltén','Vilcún','Villarrica','Cholchol','Angol','Collipulli','Curacautín','Ercilla','Lonquimay','Los Sauces','Lumaco','Purén','Renaico','Traiguén','Victoria',
  'Valdivia','Corral','Futrono','La Unión','Lago Ranco','Lanco','Los Lagos','Máfil','Mariquina','Paillaco','Panguipulli','Río Bueno',
  'Puerto Montt','Calbuco','Cochamó','Fresia','Frutillar','Los Muermos','Llanquihue','Maullín','Puerto Varas','Castro','Ancud','Chonchi','Curaco de Vélez','Dalcahue','Puqueldón','Queilén','Quellón','Quemchi','Quinchao','Osorno','Puerto Octay','Purranque','Puyehue','Río Negro','San Juan de la Costa','San Pablo','Chaitén','Futaleufú','Hualaihué','Palena',
  'Coyhaique','Lago Verde','Aysén','Cisnes','Guaitecas','Cochrane','O\'Higgins','Tortel','Chile Chico','Río Ibáñez',
  'Punta Arenas','Laguna Blanca','Río Verde','San Gregorio','Cabo de Hornos','Antártica','Porvenir','Primavera','Timaukel','Puerto Natales','Torres del Paine',
].sort();

// Sento pasó a bloqueo por plataforma (portal GCI / PlanOK). El proyecto es fijo
// (ZA_NUEVA CATEDRAL) porque la cuenta de Capital Inteligente solo opera ese, así
// que el asesor no elige proyecto: basta con los datos personales que exige el alta.
export function getFieldSchema(): FieldSchema {
  return {
    inmobiliaria: 'sento',
    fields: [
      { key: 'rut',             label: 'RUT',              type: 'rut',  required: true },
      { key: 'nombres',         label: 'Nombres',          type: 'text', required: true },
      { key: 'apellidoPaterno', label: 'Apellido paterno', type: 'text', required: true },
      {
        key: 'edad',
        label: 'Edad',
        type: 'select',
        required: true,
        options: [
          { value: '1-25',  label: '18 a 25 años'  },
          { value: '26-35', label: '26 a 35 años'  },
          { value: '36-45', label: '36 a 45 años'  },
          { value: '46-55', label: '46 a 55 años'  },
          { value: '56-65', label: '56 a 65 años'  },
          { value: '66-99', label: '66 años o más' },
        ],
      },
      {
        key: 'comuna',
        label: 'Comuna',
        type: 'select',
        required: true,
        options: COMUNAS.map((c) => ({ value: c, label: c })),
      },
      { key: 'telefonoCelular',   label: 'Teléfono celular',   type: 'phone', required: true },
      { key: 'correoElectronico', label: 'Correo electrónico', type: 'email', required: true },
    ],
  };
}
