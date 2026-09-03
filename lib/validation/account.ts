import { z } from 'zod';

const decimalString = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,8})?$/, 'Debe ser un número decimal válido');

const accountMetadataFields = {
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  brokerId: z.string().uuid('Broker inválido'),
  platform: z.string().trim().min(1, 'La plataforma es obligatoria').max(30),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, 'La moneda debe tener 3 letras')
    .transform((value) => value.toUpperCase())
};

export const createTradingAccountSchema = z.object({
  ...accountMetadataFields,
  initialBalance: decimalString,
  mt5RegisteredBalance: decimalString
});

export const updateTradingAccountSchema = z.object(accountMetadataFields);

export const registerMt5BalanceSchema = z.object({
  balance: decimalString
});

export const setTradingAccountActiveSchema = z.object({
  active: z.boolean()
});

export type CreateTradingAccountInput = z.infer<typeof createTradingAccountSchema>;
export type UpdateTradingAccountInput = z.infer<typeof updateTradingAccountSchema>;
