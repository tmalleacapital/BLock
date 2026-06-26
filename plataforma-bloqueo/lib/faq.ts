// Preguntas frecuentes del chat de ayuda para asesores.
// Para agregar una nueva: añade un objeto { q, a } a la lista. El orden aquí
// es el orden en que aparecen en el chat.

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: '¿Por qué no se me completa la tipología?',
    a: 'La tipología se completa sola cuando eliges el Proyecto y la Unidad. Si quedó vacía, casi siempre es porque el stock no terminó de cargar. Actualiza la página (F5), vuelve a elegir el proyecto y la unidad, y la tipología debería aparecer automáticamente.',
  },
  {
    q: 'No aparecen los proyectos o las unidades en la lista',
    a: 'Los proyectos y unidades se cargan desde el sistema de stock. Si la lista sale vacía, recarga la página y espera unos segundos antes de abrir el desplegable. Si después de actualizar sigue vacía, avísale al administrador: puede estar caído el origen de datos.',
  },
  {
    q: 'El bloqueo terminó con error de "tiempo agotado" o "timeout"',
    a: 'Significa que el portal de la inmobiliaria tardó más de lo normal en responder. Presiona "Reintentar". Si vuelve a fallar dos o tres veces seguidas, espera unos minutos y reintenta; si el error persiste, copia el mensaje y envíaselo al administrador.',
  },
  {
    q: '¿Qué formato debe tener la fecha de nacimiento?',
    a: 'Usa DD-MM-AAAA (día-mes-año). En los portales que lo requieren el campo pone los guiones solo: escribe únicamente los números (por ejemplo 29041988) y queda 29-04-1988.',
  },
  {
    q: 'El cliente tiene un solo apellido, ¿qué pongo en apellido materno?',
    a: 'Repite el mismo apellido en los dos campos (paterno y materno). El sistema necesita ambos para completar la ficha.',
  },
  {
    q: 'Me dice que el RUT ya está registrado / ya fue bloqueado',
    a: 'Quiere decir que ese RUT ya tiene un bloqueo registrado en esa inmobiliaria. Si es correcto y necesitas registrarlo igual, presiona "Continuar de todas formas". Si fue un error, presiona "Cancelar".',
  },
  {
    q: '¿Cuánto demora en bloquearse un cliente?',
    a: 'La automatización entra al portal y completa la ficha; suele tardar entre unos segundos y un par de minutos. Mientras tanto verás el estado "En cola" o "Procesando". No cierres la pestaña hasta que aparezca el resultado.',
  },
  {
    q: 'No me deja entrar a la plataforma después de una actualización',
    a: 'Las sesiones se mantienen aunque se actualice el sistema. Si alguna vez te queda la pantalla cargando, recarga la página (F5). Si insiste, cierra sesión y vuelve a ingresar con tu código.',
  },
  {
    q: '¿A quién contacto si algo no funciona?',
    a: 'Escríbele al administrador de la plataforma con una captura del error y el RUT del cliente. Mientras más detalle, más rápido se resuelve.',
  },
];
