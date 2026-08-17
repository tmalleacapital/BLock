# B-Lock — Documentación

Plataforma web interna de **Capital Inteligente** para que los asesores **bloqueen
clientes** en los portales de las inmobiliarias, automatizando un proceso que antes
era manual. "Bloquear" = registrar al cliente a nombre de Capital Inteligente para
evitar topes en sala de ventas mientras se lo asesora.

- **Repo:** github.com/tmalleacapital/BLock — branch `main`
- **Deploy:** Railway → `b-lock.up.railway.app` (volumen `block-volume` en `/app/data`, persiste el historial)
- **Local:** `…/BLOQUEO CLIENTES AUTOMATIZACIÓN/plataforma-bloqueo`

---

## 1. Stack

- **Next.js 16** (App Router, Server Components por defecto), **TypeScript strict**
- **Tailwind CSS 4** (config vía `@theme` en `globals.css`, sin `tailwind.config.js`); tokens semánticos de color; tema claro/oscuro
- **Python + Playwright** para los portales; **Python smtplib** para los correos
- **npm**; alias de imports `@/*` → raíz del proyecto
- **API ORED** (`ored.cl/api/public/stock/disponibles?inmobiliaria_id=X`) para stock de proyectos (algunas por correo)
- Historial en `/app/data/historial.json`; auth por **cookie firmada HMAC-SHA256 + OTP por correo**

### Comandos
```bash
npm run dev        # desarrollo (localhost:3000)
npm run build      # build de producción
npx tsc --noEmit   # type-check
npm run lint       # ESLint
```

---

## 2. Arquitectura

```
Asesor → Ficha (React) → POST /api/bloquear → cola (lib/queue) → script Python
                                                                      ├─ Portal: Playwright bloquea directo
                                                                      └─ Correo: smtplib envía la solicitud
   ↑                                                                       │
   └──────────── /api/bloquear/status/[jobId] (polling) ←──── RunResult ───┘
```

- **Frontend:** el asesor llena `components/FichaForm.tsx`; el schema de campos lo
  define cada inmobiliaria en `lib/inmobiliarias/<key>/schema.ts`.
- **Ruta de bloqueo:** `app/api/bloquear/route.ts` valida el RUT (módulo 11),
  arma el job y lo **encola** (`lib/queue.ts`, un job a la vez por portal, timeout 5 min).
- **Scripts Python** (`/scripts`): reciben los datos como JSON por argumento y
  devuelven `{"status": "success|error|pending", "message": "..."}` por stdout.
- **Historial:** `lib/historyServer.ts` guarda cada bloqueo en `historial.json`
  (con `status` para las de correo). El asesor lo ve en **Mis bloqueos**; el admin,
  en **Administración**.

---

## 3. Los dos tipos de bloqueo

### Por PORTAL (Playwright)
El script inicia sesión en el portal de la inmobiliaria y **bloquea directo**. La UI
muestra **"Cliente bloqueado"** al instante. No hay estado posterior (queda "—").

### Por CORREO (SMTP)
El script **envía un correo** de solicitud a la inmobiliaria usando la plantilla común
`scripts/_email_comun.py`, con botones **Aceptar bloqueo / Rechazar** (enlaces firmados).
La UI muestra **"Solicitud enviada, esperando confirmación"** (estado `pendiente`).
Cuando la inmobiliaria hace clic → `app/api/confirmacion/route.ts` valida el token,
actualiza el estado (`aceptado`/`rechazado`) y avisa al asesor por correo.

---

## 4. Inventario de inmobiliarias

Registro único en `lib/inmobiliarias/schemas.ts` (`INMOBILIARIAS[]`). Flags:
`active` (se lista o no), `paused?` (sección "En pausa", solo admin), `emailRecipients?`
(si existe → es por correo), `script` (archivo Python).

### Activas por PORTAL (Playwright)
| Inmobiliaria | key | Portal | Credenciales (Railway) |
|---|---|---|---|
| Grupo Araucana | `araucana` | Cliperty (`app.cliperty.com`) | `ARAUCANA_USER`, `ARAUCANA_PASS` |
| Euro | `euro` | Mobysuite | `EURO_USER`, `EURO_PASS` |
| Imagina | `imagina` | Cubit (`cubit.cl`) | `IMAGINA_CUENTA`, `IMAGINA_DOMINIO`, `IMAGINA_CLAVE` |
| Larraín Prieto | `larrain-prieto` | GCI / PlanOK (`comercialinmobiliarias.cl`) | `LARRAINPRIETO_USER`, `LARRAINPRIETO_PASS` |
| Maestra | `maestra` | MaestraNet | `MAESTRA_USER`, `MAESTRA_PASS` |
| Simonetti | `simonetti` | Mobysuite | `SIMONETTI_USER`, `SIMONETTI_PASS` |

### Activas por CORREO
| Inmobiliaria | key | Destinatario |
|---|---|---|
| Convet | `convet` | vcorrales@convet.cl |
| Deisa | `deisa` | dsanchez@deisa.cl |
| Ecasa | `ecasa` | canalinversiones@ecasa.cl |
| FAI | `fai` | Francisco.flores@flesan.cl |
| Fundamenta | `fundamenta` | andres.lopez@fundamenta.cl |
| Leben | `leben` | lsilva@ileben.cl, jfoppiano@ileben.cl |
| Paz | `paz` | issys.ferrer@pazcorp.cl, fernando.florindo@pazcorp.cl |
| Viva | `viva` | ventas@iviva.cl |

### Inactivas (`active: false` — no se listan)
- **Sento** (`sento`, portal GCI/PlanOK) — retirada por falta de habilitación en el portal; `SENTO_USER`/`SENTO_PASS`. Script listo, reactivable.
- **Danacorp** (`danacorp`, correo a sdonoso@danacorp.cl) — retirada a pedido.
- **Ingevec, Norte Verde, Vicuña Mackenna** — sin adaptador.

---

## 5. Reglas de negocio

- **Vigencia 15 días** (`lib/vigencia.ts`, `DIAS_BLOQUEO`): un bloqueo toma al cliente
  por 15 días desde su fecha; pasado el plazo se libera y se puede volver a bloquear.
- **Duplicados** (`isDuplicate` en `lib/historyServer.ts`): la ficha advierte si el RUT
  ya tiene un bloqueo **vigente** en esa inmobiliaria (un rechazo o >15 días no cuentan).
  El asesor puede continuar igual.
- **RUT** validado por módulo 11 en el cliente y de nuevo en la ruta.
- **Teléfono**: el asesor lo puede escribir como quiera (`+56…`, con espacios o guiones);
  cada script lo normaliza con `_browser_comun.telefono_9` (9 dígitos, portales con
  intl-tel/vue-tel: Araucana, Euro, Simonetti, Maestra) o `telefono_56` (`+56…`: Sento,
  Larraín Prieto, Imagina).
- **Campos obligatorios**: los define cada schema; se pide solo lo que exige el portal.

---

## 6. Variables de entorno (Railway)

| Variable | Uso |
|---|---|
| `AUTH_SECRET` | **Obligatoria en prod.** Firma sesiones y tokens Aceptar/Rechazar. La app se niega a arrancar si falta (ver `lib/authSecret.ts`). Valor largo y aleatorio. |
| `GMAIL_USER`, `GMAIL_PASS` | Cuenta Gmail (app password) para enviar OTP, correos de solicitud y comprobantes. |
| `ARAUCANA_USER/PASS`, `EURO_USER/PASS`, `SIMONETTI_USER/PASS`, `MAESTRA_USER/PASS`, `LARRAINPRIETO_USER/PASS`, `SENTO_USER/PASS` | Credenciales de cada portal. |
| `IMAGINA_CUENTA`, `IMAGINA_DOMINIO`, `IMAGINA_CLAVE` | Login de Cubit (Imagina). |
| `PYTHON_BIN` | Binario de Python (default `python3`). |
| `DATA_DIR` | Carpeta del historial (default `/app/data` en prod). |
| `PUBLIC_BASE_URL` | Base para los enlaces Aceptar/Rechazar (default `b-lock.up.railway.app`). |
| `HEADLESS=0` | Solo dev: ver el navegador en los scripts que lo soportan. |

---

## 7. Cómo agregar una inmobiliaria

1. `lib/inmobiliarias/<key>/schema.ts` con `getFieldSchema()` (los campos que llena el asesor).
2. Registrarla en `INMOBILIARIAS[]` y en el `switch` de `getSchema()` de `schemas.ts`, con su `script`.
3. **Por portal:** crear `scripts/Bloqueo … .py` (usar `_browser_comun.py` para login/navegador/`set_input`/teléfono). Setear sus credenciales en Railway.
4. **Por correo:** crear el script con `DESTINATARIOS` + `LABELS` que llame a `_email_comun.enviar_bloqueo()`.
5. Nace con `active: false`; se prueba desde "En pausa" (con `paused: true`) y se activa al validar.

### Selects dependientes (ej. región → comuna)
`FieldDef.optionsBy = { field: 'region', options: COMUNAS_POR_REGION }` habilita un
select cuyas opciones dependen de otro campo (ver Imagina: `lib/inmobiliarias/imagina/catalogos.ts`).

---

## 8. Autenticación y seguridad

- **Login:** OTP de 6 dígitos por correo (solo dominios `capitalinteligente.cl/.me`).
  Sesión = cookie firmada HMAC-SHA256, TTL 8 h, stateless (sobrevive reinicios).
- **`middleware.ts`** protege todas las rutas (Edge, Web Crypto). `/api/*` valida su
  propia sesión en cada handler.
- **`AUTH_SECRET`** centralizado en `lib/authSecret.ts`: en runtime de producción, si
  falta o quedó el default, la app **falla** (evita forjar cookies de admin / tokens).
- **Admins:** lista fija en `lib/auth.ts` (`ADMIN_EMAILS`), `isAdmin(email)`.
- **Endpoints protegidos:** `GET /api/history` (sin `?mine=1`) exige admin;
  `/api/bloquear/status/[jobId]` y `/api/queue-status` exigen sesión.

### Pendiente de seguridad
- **S4** — el panel/CSV de admin muestran el RUT completo (admin autorizado; opcional enmascarar).
- **S5** — Aceptar/Rechazar se ejecuta por GET (un prefetch de correo podría dispararlo). Decidido dejar así por ahora.

---

## 9. Sección de administración (`/admin`, solo admins)

**Hoy (solo lectura):** contadores (total, pendientes, por portal, por asesor),
tabla del historial completo y export CSV.

**Roadmap (de la auditoría, sin implementar):** filtros + búsqueda + paginación;
cambiar estado manual (aceptar/rechazar/**liberar**); persistir el resultado real del
job + **reintentar** fallos; gestionar inmobiliarias desde la UI (activar/pausar/destinatarios);
métricas ampliadas (por día, tasa aceptación, pendientes envejecidos, por vencer);
cola en vivo; log de acciones.

---

## 10. Peculiaridades por portal (gotchas verificados en producción)

- **GCI / PlanOK** (Sento, Larraín Prieto): Inicio Cotización → Crear Cliente → wizard 4
  pasos → leyenda `CAPITAL INTELIGENTE dd-mm-aaaa` en `#nat_descripcion_adicional` →
  Finalizar (`#test`) → medio de llegada → Evaluación → captura de `#panel_tab_cliente`
  → correo con la captura a la inmobiliaria. **El botón Finalizar (`#test`) es visible en
  TODOS los pasos** (no sirve para detectar el paso 4; usar la visibilidad de la leyenda).
  Los `alert()` nativos se auto-aceptan con `page.on('dialog', d => d.accept())`.
  Larraín Prieto: proyecto fijo MISSOURI 3885, medio BROKERS, obligatorios mínimos.
- **Cliperty** (Araucana): el bloqueo = crear cliente **Y generar la cotización** (Medio de
  Origen = Capital Inteligente); crear el cliente solo NO bloquea. El asesor elige proyecto
  (Aires de Marañón=5, Las Brisas=9, Miraflores=1) — hay que **clickear la tarjeta** antes de
  abrir el cotizador. Los campos (teléfono intl-tel, RUT) necesitan **`blur`** para validar
  (`set_input`); si el RUT ya existe, el portal lo prefill y se avisa en vez de colgarse.
- **Cubit** (Imagina): región y comuna son selects; al elegir región el portal **recarga las
  comunas por postback** — hay que esperar a que aparezca la comuna objetivo (la lista por
  defecto es RM). El catálogo exacto (15 regiones, 345 comunas) está en `catalogos.ts`.
- **Mobysuite** (Euro, Simonetti): CAPTCHA Altcha en el login; selects vue-select; teléfono de 9 dígitos.

---

## 11. Archivos clave

| Archivo | Rol |
|---|---|
| `lib/inmobiliarias/schemas.ts` | Registro `INMOBILIARIAS[]` + `getSchema()` |
| `lib/inmobiliarias/<key>/schema.ts` | Campos que llena el asesor por inmobiliaria |
| `lib/inmobiliarias/types.ts` | `FieldDef`, `FieldSchema` (incluye `optionsBy`), `RunResult` |
| `app/api/bloquear/route.ts` | Recibe la ficha, valida RUT, encola el job |
| `lib/queue.ts` | Cola (1 job por portal, timeout 5 min) |
| `scripts/_browser_comun.py` | Helpers Playwright: `abrir_navegador`, `set_input`, `telefono_9/56` |
| `scripts/_email_comun.py` | Plantilla única del correo de solicitud |
| `lib/historyServer.ts` | Historial + `status` + `isDuplicate` (con vigencia) |
| `lib/vigencia.ts` | Regla de los 15 días |
| `lib/auth.ts` / `lib/authSecret.ts` / `middleware.ts` | Sesión, secreto, protección de rutas |
| `lib/confirmToken.ts` + `app/api/confirmacion/route.ts` | Flujo Aceptar/Rechazar |
| `components/FichaForm.tsx` | Formulario (el corazón) |
| `components/MisBloqueosClient.tsx` / `app/mis-bloqueos/page.tsx` | Vista del asesor (filtros, vigencia, auto-refresh) |
| `app/admin/page.tsx` | Panel admin |

---

## 12. Auditoría (resumen) y pendientes

Se hizo una auditoría multi-agente (Admin, UI/UX del asesor, IA/navegación). Estado:

- ✅ **Seguridad**: `AUTH_SECRET` obligatorio (candado + variable en Railway); `/api/history`
  y endpoints de estado/cola protegidos.
- ✅ **Quick wins UI/UX**: token de color en TopBar, anti-FOUC de tema, scroll al panel de
  estado al enviar, `aria-live`/labels de accesibilidad, badge **Portal/Correo**, copy
  contextual portal vs correo.
- ⏳ **Admin operativo** (filtros, estado manual, reintentos) — pendiente.
- ⏳ **Navegación** (buscador de inmobiliarias, recientes/favoritos, consolidar flags de estado) — pendiente.

**Otros pendientes / ideas:**
- Modelo de estado de inmobiliaria con 3 flags (`enabled`/`active`/`paused`) a consolidar; `paused` está a medias (nunca es `true`).
- Persistir el resultado real de cada job (hoy los fallos no quedan en el historial).
- Screenshot-al-fallar + canary diario que detecte cuándo un portal cambia y rompe un script.
- Limpiar clientes de prueba creados en los portales durante las validaciones.
