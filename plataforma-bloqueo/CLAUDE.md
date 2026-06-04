@AGENTS.md

# Plataforma de bloqueo — Capital Inteligente

Plataforma web interna para que los asesores de Capital Inteligente registren/bloqueen clientes en portales de distintas inmobiliarias.

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

Cada inmobiliaria tiene su propio adaptador en `lib/inmobiliarias/<key>/`:

```
lib/inmobiliarias/
  types.ts              ← FieldDef, FieldSchema, RunResult, InmobiliariaAdapter
  schemas.ts            ← INMOBILIARIAS[] + getSchema(key) — UI-safe, sin imports de Node
  imagina/
    catalogos.ts        ← datos estáticos (regiones, etc.)
    schema.ts           ← getFieldSchema()
    adapter.ts          ← (a crear) InmobiliariaAdapter con run()
```

Para agregar una nueva inmobiliaria:
1. Crear `lib/inmobiliarias/<key>/catalogos.ts` (si aplica)
2. Crear `lib/inmobiliarias/<key>/schema.ts` con `getFieldSchema()`
3. Añadir entrada en `INMOBILIARIAS` y `getSchema()` en `schemas.ts`
4. Crear `lib/inmobiliarias/<key>/adapter.ts` con la automatización (Playwright)
5. Conectar en `app/api/bloquear/route.ts` (ver TODO)

## Pendiente

- [ ] Integrar Playwright en `app/api/bloquear/route.ts` (ver TODO en el archivo)
- [ ] Crear `lib/inmobiliarias/imagina/adapter.ts` con `run()` real
- [ ] Soporte multi-inmobiliaria en la navegación (routing / state)
