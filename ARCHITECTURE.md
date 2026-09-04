# Price Action Pro – Arquitectura Fase 1

## A. Arquitectura

Arquitectura modular monolítica sobre Next.js App Router, desplegable en Vercel. La UI usa Server Components por defecto y Client Components únicamente para formularios, gráficos e interacción. Supabase ofrece Auth, PostgreSQL, Storage y RLS. Las acciones sensibles (registro de operaciones reales, cálculo contractual, validación del plan, uploads firmados y Groq) pasan por servidor.

Capas:
1. `app/`: rutas, layouts, Server Components, Route Handlers.
2. `components/`: UI presentacional y shadcn/ui.
3. `lib/`: reglas de dominio, decimales, validación Zod, Supabase y utilidades.
4. `supabase/`: migraciones, RLS y seeds.
5. `tests/`: pruebas unitarias del motor financiero y reglas de horario/stop.

Principio crítico: el navegador puede prevalidar, pero no autoriza una operación real. El servidor vuelve a obtener usuario, cuenta, configuración, trades del día/mes e instrumento desde fuentes confiables.

## B. Árbol de carpetas

```text
app/
  (auth)/login/
  (dashboard)/dashboard/
  (dashboard)/accounts/
  (dashboard)/instruments/
  (dashboard)/trades/new/
  api/ai/analyze-trade/
components/
  layout/
  ui/
lib/
  decimal/
  supabase/
  validation/
  trading-rules.ts
supabase/
  migrations/
  seed/
tests/
public/
```

## C. Esquema de base de datos

Tablas: `profiles`, `trading_accounts`, `brokers`, `instruments`, `trades`, `trade_images`, `trading_plans`, `user_trading_settings`, `monthly_snapshots`, `ai_trade_reviews`, `strategies`, `pretrade_checklists`, `balance_snapshots`.

Dinero, precios, lotes, puntos y métricas sensibles usan `numeric`, no `real/double precision`.

## D. Relaciones

- `auth.users 1:1 profiles`
- `auth.users 1:N trading_accounts`
- `brokers 1:N trading_accounts`
- `brokers 1:N instruments`
- `auth.users 1:N strategies`
- `trading_accounts 1:N trades`
- `instruments 1:N trades`
- `strategies 1:N trades`
- `trades 1:N trade_images`
- `trades 1:1 pretrade_checklists`
- `trades 1:N ai_trade_reviews`
- `trading_accounts 1:N monthly_snapshots`
- `trading_accounts 1:N balance_snapshots`

## E. Flujo de Nueva Operación

1. Usuario autenticado selecciona cuenta.
2. Servidor obtiene `mt5_registered_balance`, balance calculado y configuración.
3. Motor calcula `% riesgo` y `riesgo USD`.
4. Usuario selecciona activo.
5. Se validan `tick_size`, `tick_value`, `lot_step` y límites contractuales.
6. Usuario ingresa entrada + SL en precio o puntos.
7. Motor calcula lote dinámico; si faltan datos contractuales, bloquea el cálculo preciso.
8. Usuario selecciona RR 1:1, 1:2, 1:3 o personalizado y se calcula TP.
9. Se sube captura previa obligatoria al Storage privado.
10. Usuario completa checklist pre-trade.
11. Cliente muestra resumen de riesgo.
12. Al confirmar, backend vuelve a validar sesión, horario Bogotá, stops diarios, máximo 3, límite mensual, sobreriego, propiedad de cuenta/activo y presencia de captura.
13. Solo entonces persiste trade + checklist + metadata de imagen en una transacción/flujo atómico.
14. Una operación `STUDY` se persiste separada y no entra en estadísticas financieras ni límites reales.

## F. Fórmula exacta de riesgo

```text
0 <= balance <= 500       => 4%
500 < balance <= 1000     => 3%
1000 < balance <= 5000    => 2%
balance > 5000            => 1%

riskAmount = balance * (riskPercentage / 100)
```

Se implementa una única vez en `lib/trading-rules.ts` con `Decimal`.

## G. Estrategia de cálculo de lotaje

Si existen `tick_size` y `tick_value` válidos:

```text
riskPerLot = (stopDistance / tickSize) * tickValue
rawLot = riskAmount / riskPerLot
lot = floor(rawLot / lotStep) * lotStep
realRisk = riskPerLot * lot
```

El redondeo siempre es hacia abajo. `minimum_lot`/`maximum_lot` se respetan. `contract_size` se almacena porque algunos instrumentos/brokers pueden requerir una fórmula contractual distinta; no se asumirá una fórmula genérica si la especificación real exige otra. `base_lot` es solo referencia y nunca reemplaza el lote dinámico.

Si faltan datos contractuales: `MISSING_CONTRACT_DATA` y no se inventa lote.

## H. Seguridad

- Supabase Auth con sesión SSR por cookies.
- RLS por `auth.uid()` en todas las tablas de usuario.
- `user_id` nunca se acepta como autoridad desde el cliente.
- `SUPABASE_SERVICE_ROLE_KEY` solo en módulos `server-only`.
- `GROQ_API_KEY` solo Route Handler/backend.
- Zod en frontera de entrada y revalidación de dominio en servidor.
- Storage privado con paths `user_id/trades/year/month/<uuid>.<ext>`.
- MIME allowlist: JPEG/PNG/WebP; tamaño máximo configurable.
- Rate limiting para las solicitudes a Groq.
- Evitar logs con secretos, signed URLs o payloads sensibles.
- Operaciones financieras con `numeric` en Postgres y `Decimal` en TypeScript.
- Para operaciones reales, el backend debe volver a evaluar horario, límites diario/mensual y riesgo inmediatamente antes del insert.

## I. Plan de implementación

1. Arquitectura/estructura base.
2. Supabase schema, RLS, catálogo y Storage policies.
3. Login/registro/refresh de sesión.
4. CRUD cuentas + balance MT5 vs bitácora.
5. CRUD catálogo activos + configuración contractual.
6. Motor de riesgo + pruebas.
7. Calculadora de lotaje + validaciones contractuales.
8. Nueva operación + servidor autoritativo.
9. Upload privado de imágenes.
10. Reglas completas del plan diario/mensual.
11. Dashboard financiero.
12. Estadísticas y filtros.
13. Calendario/heatmap.
14. Groq con JSON estructurado, análisis visual y rate limiting.
15. PWA e instalación.
16. Hardening, tests E2E, observabilidad y deploy Vercel.
