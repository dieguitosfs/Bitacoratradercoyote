import { z } from 'zod';
export const planSettingsSchema=z.object({maxMonthlyTrades:z.number().int().positive().max(1000).nullable(),allowRiskOverride:z.boolean().default(false)});
