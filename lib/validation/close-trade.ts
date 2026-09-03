import { z } from 'zod';

const signedDecimal = z.string().trim().regex(/^-?\d+(?:\.\d{1,12})?$/);

export const closeTradeSchema = z.object({
  status: z.enum(['WON', 'LOST', 'BREAK_EVEN', 'CANCELLED']),
  pnlUsd: signedDecimal,
  pnlPoints: signedDecimal.nullable().optional(),
  emotionAfter: z.enum(['CALM', 'SATISFIED', 'ANXIOUS', 'FRUSTRATED', 'EUPHORIC', 'REVENGE']).nullable().optional(),
  discipline: z.boolean().nullable().optional(),
  exitAt: z.string().datetime({ offset: true }).optional(),
  resultImage: z.object({
    storagePath: z.string().min(1).max(1024),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    sizeBytes: z.number().int().positive()
  }).nullable().optional()
});
