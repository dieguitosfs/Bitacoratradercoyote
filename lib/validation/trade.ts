import { z } from 'zod';

const positiveDecimal = z.string().trim().regex(/^\d+(?:\.\d{1,12})?$/);
const optionalDecimal = z.union([positiveDecimal, z.literal(''), z.null()]).optional();

export const tradeSchema = z.object({
  accountId: z.string().uuid(),
  instrumentId: z.string().uuid(),
  mode: z.enum(['REAL', 'STUDY']).default('REAL'),
  direction: z.enum(['BUY', 'SELL']),
  origin: z.enum(['OWN', 'SIGNAL']),
  timeframe: z.enum(['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1']),
  entryType: z.enum(['MARKET', 'LIMIT', 'STOP']),
  entryPrice: positiveDecimal,
  stopLossPrice: optionalDecimal,
  stopLossPoints: optionalDecimal,
  takeProfitPrice: optionalDecimal,
  takeProfitPoints: optionalDecimal,
  rrPlanned: positiveDecimal,
  actualLot: positiveDecimal,
  strategyId: z.string().uuid().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  emotionBefore: z.enum(['CALM', 'CONFIDENT', 'ANXIOUS', 'ANGRY', 'EUPHORIC', 'TIRED', 'FOMO', 'REVENGE']).nullable().optional(),
  followedPlan: z.boolean(),
  entryAt: z.string().datetime({ offset: true }).optional(),
  analysisImage: z.object({
    storagePath: z.string().min(1).max(1024),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    sizeBytes: z.number().int().positive()
  }).nullable().optional(),
  checklist: z.object({
    marketStructure: z.boolean(),
    supportResistance: z.boolean(),
    entryConfirmation: z.boolean(),
    slDefined: z.boolean(),
    tpDefined: z.boolean(),
    riskCorrect: z.boolean(),
    compliesWithPlan: z.boolean()
  })
}).superRefine((value, ctx) => {
  if (!value.stopLossPrice && !value.stopLossPoints) {
    ctx.addIssue({ code: 'custom', message: 'Debe indicar Stop Loss por precio o puntos', path: ['stopLossPoints'] });
  }
  if (!value.takeProfitPrice && !value.takeProfitPoints) {
    ctx.addIssue({ code: 'custom', message: 'Debe indicar Take Profit por precio o puntos', path: ['takeProfitPoints'] });
  }
  if (value.mode === 'REAL' && !value.analysisImage) {
    ctx.addIssue({ code: 'custom', message: 'La captura previa es obligatoria', path: ['analysisImage'] });
  }
});

export type TradeInput = z.infer<typeof tradeSchema>;
