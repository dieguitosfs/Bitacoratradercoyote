import { z } from 'zod';

export const riskCalculationSchema = z.object({
  balance: z.string().trim().min(1, 'Ingresa el balance').max(64, 'Balance demasiado largo').regex(/^\d+(?:\.\d{1,8})?$/, 'Balance inválido')
});

export type RiskCalculationInput = z.infer<typeof riskCalculationSchema>;
