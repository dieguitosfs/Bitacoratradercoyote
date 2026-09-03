'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSiteOrigin } from '@/lib/server/site-url';
import {
  forgotPasswordSchema,
  loginSchema,
  signUpSchema,
  updatePasswordSchema
} from '@/lib/validation/auth';

function firstIssue(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message ?? 'Revisa los datos ingresados.';
}

function encoded(value: string) {
  return encodeURIComponent(value);
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password')
  });

  if (!parsed.success) {
    redirect(`/login?error=${encoded(firstIssue(parsed.error))}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirect(`/login?error=${encoded('Correo o contraseña incorrectos.')}`);
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signUpAction(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword')
  });

  if (!parsed.success) {
    redirect(`/register?error=${encoded(firstIssue(parsed.error))}`);
  }

  const origin = await getSiteOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`
    }
  });

  if (error) {
    redirect(`/register?error=${encoded('No fue posible crear la cuenta. Intenta nuevamente.')}`);
  }

  if (data.session) {
    revalidatePath('/', 'layout');
    redirect('/dashboard');
  }

  redirect(`/login?message=${encoded('Cuenta creada. Revisa tu correo para confirmar el acceso.')}`);
}

export async function forgotPasswordAction(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    redirect(`/forgot-password?error=${encoded(firstIssue(parsed.error))}`);
  }

  const origin = await getSiteOrigin();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`
  });

  // Respuesta deliberadamente neutra para evitar enumeración de usuarios.
  redirect(
    `/forgot-password?message=${encoded(
      'Si existe una cuenta con ese correo, recibirás instrucciones para restablecer la contraseña.'
    )}`
  );
}

export async function updatePasswordAction(formData: FormData) {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword')
  });

  if (!parsed.success) {
    redirect(`/update-password?error=${encoded(firstIssue(parsed.error))}`);
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect(`/login?error=${encoded('El enlace de recuperación expiró o no es válido.')}`);
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    redirect(`/update-password?error=${encoded('No fue posible actualizar la contraseña.')}`);
  }

  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect(`/login?message=${encoded('Contraseña actualizada. Inicia sesión nuevamente.')}`);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
