@AGENTS.md

# Plataforma de bloqueo — Capital Inteligente

Plataforma web interna para que los asesores de Capital Inteligente registren/bloqueen clientes en portales de distintas inmobiliarias.

> 📖 **Documentación completa del producto** (arquitectura, inventario de inmobiliarias,
> variables de entorno, reglas de negocio, seguridad, gotchas por portal, roadmap):
> ver [`DOCUMENTACION.md`](./DOCUMENTACION.md).

## Stack

- **Next.js 16** (App Router) — `app/` con Server Components por defecto
- **TypeScript** en modo `strict`
- **Tailwind CSS 4** — configuración vía CSS `@theme` en `globals.css`, sin `tailwind.config.js`
- **next/font/google** — Fraunces (display serif) + Hanken Grotesk (cuerpo)
- **npm** como gestor de paquetes
- Alias de imports: `@/*` → raíz del proyecto

## Comandos

```bash
npm run dev        # Servidor de desarrollo (http://localhost:3000)
npm run build      # Build de producción
npm run start      # Servidor de producción (requiere build previo)
npx tsc --noEmit   # Type-check sin emitir archivos
npm run lint       # ESLint
```

## Convenciones

- **TypeScript strict**: sin `any` implícito, sin código muerto, todos los tipos explícitos.
- **Sin código muerto**: no dejar imports, variables o funciones sin uso.
- **Tokens semánticos de color**: usar siempre las clases de Tailwind mapeadas a tokens CSS
  (`bg-background`, `text-foreground`, `border-border`, `text-accent`, `bg-card`, `text-muted`,
  `text-danger`, `text-success`). No usar colores hardcodeados en clases.
- **Sentence case** en toda la UI; nada de TODO MAYÚSCULAS.
- **Commits convencionales**: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.

## Arquitectura de adaptadores

Cada inmobiliaria tiene **schema** (campos del asesor) en `lib/inmobiliarias/<key>/schema.ts`
y un **script Python** en `/scripts` (la automatización). Dos tipos: por portal (Playwright)
o por correo (SMTP). El registro único está en `lib/inmobiliarias/schemas.ts`
(`INMOBILIARIAS[]`, con `active`/`paused`/`emailRecipients`/`script`).

```
lib/inmobiliarias/
  types.ts              ← FieldDef, FieldSchema (incluye optionsBy), RunResult
  schemas.ts            ← INMOBILIARIAS[] + getSchema(key) — UI-safe, sin imports de Node
  imagina/
    catalogos.ts        ← datos estáticos (regiones, comunas por región, etc.)
    schema.ts           ← getFieldSchema()
scripts/
  _browser_comun.py     ← helpers Playwright (abrir_navegador, set_input, telefono_9/56)
  _email_comun.py       ← plantilla del correo de solicitud
  Bloqueo … .py         ← un script por inmobiliaria
```

Para agregar una nueva inmobiliaria (detalle en `DOCUMENTACION.md` §7):
1. `lib/inmobiliarias/<key>/schema.ts` con `getFieldSchema()` (+ `catalogos.ts` si aplica).
2. Registrarla en `INMOBILIARIAS[]` y en `getSchema()` de `schemas.ts`, con su `script`.
3. Crear el script Python en `/scripts` (portal → usar `_browser_comun`; correo → `_email_comun`).
4. Setear credenciales del portal en Railway. Nace `active: false`; se prueba en pausa y se activa.

## Pendiente

Ver el roadmap y pendientes actualizados en [`DOCUMENTACION.md`](./DOCUMENTACION.md) §12
(admin operativo, navegación/buscador, consolidar flags de estado, persistir resultado de jobs,
canary de portales). Antes: setear `AUTH_SECRET` en Railway ✅ hecho.
