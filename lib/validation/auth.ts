import { z } from 'zod';

const email = z.string().trim().email('Ingresa un correo electrónico válido.').max(254);
const password = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar 72 caracteres.')
  .regex(/[A-Z]/, 'Incluye al menos una letra mayúscula.')
  .regex(/[a-z]/, 'Incluye al menos una letra minúscula.')
  .regex(/[0-9]/, 'Incluye al menos un número.');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Ingresa tu contraseña.').max(72)
});

export const signUpSchema = z
  .object({
    email,
    password,
    confirmPassword: z.string().min(1, 'Confirma tu contraseña.').max(72)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword']
  });

export const forgotPasswordSchema = z.object({ email });

export const updatePasswordSchema = z
  .object({
    password,
    confirmPassword: z.string().min(1, 'Confirma tu contraseña.').max(72)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword']
  });
