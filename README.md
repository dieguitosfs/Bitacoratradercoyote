# Price Action Pro – Trading Journal

Aplicación web de bitácora de trading, gestión de riesgo, cálculo de lotaje, estadísticas y análisis educativo con IA.

## Estado

Fase 1 iniciada: arquitectura, estructura Next.js, esquema Supabase/RLS, catálogo inicial, motor central de reglas, helpers decimales y pruebas unitarias críticas.

## Stack

- Next.js App Router + TypeScript + React
- Tailwind CSS + shadcn/ui (componentes se incorporan por módulos)
- Supabase Auth/PostgreSQL/Storage/RLS
- Zod + React Hook Form
- Recharts
- date-fns/date-fns-tz
- decimal.js
- Vitest
- Vercel

## Instalación

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
XAI_API_KEY=
```

Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` ni `XAI_API_KEY` al navegador.

## Supabase

1. Crear proyecto.
2. Ejecutar `supabase/migrations/202609020001_initial_schema.sql`.
3. Ejecutar `supabase/seed/001_instruments.sql` si se desea cargar el catálogo inicial.
4. En una fase posterior se agregan las policies del bucket privado `trade-images` y el flujo de upload.

## Reglas financieras

El motor está en `lib/trading-rules.ts`. Todo cálculo de dinero/lote usa `decimal.js` y la base usa `numeric`.

## Tests

```bash
npm test
npm run typecheck
npm run build
```

## Deploy Vercel

Importar el repositorio en Vercel y definir las cuatro variables de entorno. La arquitectura usa Server Components/Route Handlers y es compatible con ejecución serverless.

## xAI

El endpoint base existe en `/api/ai/analyze-trade`, pero permanece deliberadamente sin llamada a xAI hasta la Fase 14, cuando se añadan Zod, rate limiting, normalización de imagen y persistencia de respuesta estructurada.

## Seguridad

RLS está habilitado para datos de usuario. Los catálogos globales son legibles por usuarios autenticados y su modificación debe hacerse por rutas administrativas de confianza. La capa servidor debe obtener siempre el usuario desde sesión y nunca confiar en `user_id` enviado por frontend.

## Estado de implementación

### Fase 2 — Supabase + RLS + transacciones

Implementada en código:

- RLS explícito y mínimo privilegio.
- Bootstrap automático de perfil/configuración/plan al registrarse.
- Configuración privada de instrumentos por usuario.
- Storage privado endurecido.
- Creación transaccional de cuentas.
- Registro independiente del balance MT5.
- Creación transaccional de operaciones con reglas del plan verificadas en PostgreSQL.
- Cierre transaccional de operaciones y actualización exclusiva del balance calculado por bitácora.
- SSR Auth/Proxy para Next.js.
- Route Handlers con Zod.

Ver [PHASE2.md](./PHASE2.md) para las decisiones y controles implementados.
