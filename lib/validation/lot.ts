import { z } from 'zod';
const decimal = z.string().trim().regex(/^\d+(?:\.\d{1,12})?$/);
export const lotCalculationSchema = z.object({
  riskAmount: decimal,
  stopDistance: decimal,
  tickSize: decimal.nullable(),
  tickValue: decimal.nullable(),
  contractSize: decimal.nullable().optional(),
  lotStep: decimal.nullable(),
  minimumLot: decimal.nullable().optional(),
  maximumLot: decimal.nullable().optional(),
  baseLot: decimal.nullable().optional()
});
