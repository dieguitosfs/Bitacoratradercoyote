import { z } from 'zod';

const optionalPositiveDecimal = z.union([
  z.literal(''),
  z.string().trim().regex(/^\d+(?:\.\d{1,12})?$/, 'Debe ser un decimal válido')
]).refine((value) => value === '' || Number(value) > 0, 'Debe ser mayor que cero');

export const instrumentSettingsSchema = z.object({
  symbol: z.string().trim().max(80).default(''),
  minimumLot: optionalPositiveDecimal,
  lotStep: optionalPositiveDecimal,
  maximumLot: optionalPositiveDecimal,
  tickSize: optionalPositiveDecimal,
  tickValue: optionalPositiveDecimal,
  contractSize: optionalPositiveDecimal,
  baseLot: optionalPositiveDecimal,
  active: z.boolean().default(true)
}).superRefine((value, ctx) => {
  if (value.minimumLot && value.maximumLot && Number(value.maximumLot) < Number(value.minimumLot)) {
    ctx.addIssue({ code: 'custom', path: ['maximumLot'], message: 'El lote máximo no puede ser menor al lote mínimo' });
  }
});

export type InstrumentSettingsInput = z.infer<typeof instrumentSettingsSchema>;
