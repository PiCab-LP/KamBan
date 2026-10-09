// Utilidades de imágenes para los bugs: validación, compresión en el navegador y
// las llamadas al backend serverless (api/bug-images/*). La compresión y la firma
// mantienen los archivos originales fuera de este bundle (no hay secretos aquí).
import imageCompression from 'browser-image-compression';
import { supabase } from './supabaseClient';

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,image/gif';
export const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGES = 10;

const TYPE_LABEL = 'JPG, PNG, WebP o GIF';
const toMB = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

export function validateType(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `"${file.name}" no es un formato válido. Solo se permiten ${TYPE_LABEL}.`;
  }
  return null;
}

/**
 * Deja el archivo listo para subir: valida el tipo y, si pesa más de 5 MB, lo
 * comprime en el navegador. Devuelve { ok, file } o { ok:false, error } con un
 * mensaje claro de por qué no se pudo. Los GIF no se comprimen (perderían la
 * animación), así que si pesan de más se rechazan.
 */
export async function prepareFile(file) {
  const typeError = validateType(file);
  if (typeError) return { ok: false, error: typeError };

  let out = file;
  if (file.size > MAX_BYTES && file.type !== 'image/gif') {
    try {
      out = await imageCompression(file, {
        maxSizeMB: 5,
        maxWidthOrHeight: 2560,
        useWebWorker: true,
        fileType: file.type,
      });
    } catch {
      out = file; // si la compresión falla, decide la validación de abajo
    }
  }

  if (out.size > MAX_BYTES) {
    return {
      ok: false,
      error: `"${file.name}" pesa ${toMB(out.size)} MB y el máximo es 5 MB`
        + (file.type === 'image/gif' ? ' (los GIF no se comprimen).' : ', incluso tras comprimirla.'),
    };
  }
  return { ok: true, file: out };
}

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error del servidor (${res.status}).`);
  return json;
}

export async function apiGet(path) {
  const res = await fetch(path, { headers: { ...(await authHeaders()) } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error del servidor (${res.status}).`);
  return json;
}

/** Sube a Cloudinary un archivo ya preparado, con la firma del backend. */
export async function uploadToCloudinary(file, sig) {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', sig.timestamp);
  form.append('signature', sig.signature);
  form.append('public_id', sig.publicId);
  form.append('type', sig.type);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || 'Cloudinary rechazó la subida.');
  return json; // { public_id, format, bytes, width, height, ... }
}
