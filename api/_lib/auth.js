// Autorización de las funciones serverless. Cada petición trae el access_token de
// Supabase del usuario (Authorization: Bearer). Con él construimos un cliente que
// actúa COMO el usuario, de modo que el RLS de la base aplica igual que en el
// navegador: así la autorización de "quién ve qué" no se duplica aquí, es la misma
// que ya rige en la tabla bug_images.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Valida que un identificador sea un UUID antes de usarlo en rutas/consultas, para
// que ningún valor raro se cuele en el public_id de Cloudinary ni en las queries.
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(value, label = 'identificador') {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new HttpError(400, `El ${label} no es válido.`);
  }
}

/**
 * Verifica el token, devuelve { supabase (como el usuario), user, role }.
 * Lanza HttpError(401) si el token falta o es inválido.
 */
export async function getAuthContext(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (!header.startsWith('Bearer ')) {
    throw new HttpError(401, 'Falta el token de sesión.');
  }
  const token = header.slice('Bearer '.length);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    throw new HttpError(401, 'Sesión inválida o expirada. Vuelve a iniciar sesión.');
  }

  // user_role() es SECURITY DEFINER: devuelve el rol del usuario actual sin recursar RLS.
  const { data: role, error: roleErr } = await supabase.rpc('user_role');
  if (roleErr) {
    throw new HttpError(500, 'No se pudo verificar tu rol.');
  }

  return { supabase, user: userData.user, role };
}

/** Exige que el rol del contexto sea uno de los permitidos; si no, HttpError(403). */
export function requireRole(ctx, ...roles) {
  if (!roles.includes(ctx.role)) {
    throw new HttpError(403, 'No tienes permiso para esta acción.');
  }
}

/** Responde un error de forma uniforme. Loguea los inesperados (status 500). */
export function sendError(res, err) {
  const status = err instanceof HttpError ? err.status : 500;
  if (status >= 500) console.error('[bug-images]', err);
  res.status(status).json({ error: err.message || 'Error interno del servidor.' });
}
