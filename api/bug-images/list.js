// GET /api/bug-images/list?bugId=...   (cualquier usuario autenticado)
// Devuelve las imágenes del bug que el usuario PUEDE ver (el RLS de bug_images filtra:
// qa/viewer todo, dev solo sus asignados) con URLs de visualización ya firmadas.
import { getAuthContext, HttpError, sendError, assertUuid } from '../_lib/auth.js';
import { signedUrl } from '../_lib/cloudinary.js';

const THUMB = 'c_fill,w_400,h_300,q_auto,f_auto';
const FULL = 'q_auto,f_auto';
// fl_attachment hace que Cloudinary sirva el archivo con Content-Disposition: attachment,
// así el navegador lo DESCARGA en vez de abrirlo. Sin esto, el atributo download de un <a>
// se ignora por ser otro origen y solo navega a la imagen.
const DOWNLOAD = 'fl_attachment';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') throw new HttpError(405, 'Método no permitido.');

    const ctx = await getAuthContext(req); // basta con estar autenticado; el RLS hace el resto

    const bugId = req.query.bugId;
    assertUuid(bugId, 'identificador del bug');

    const { data, error } = await ctx.supabase
      .from('bug_images')
      .select('id, public_id, format, width, height, created_at')
      .eq('bug_id', bugId)
      .order('created_at', { ascending: true });
    if (error) throw new HttpError(500, 'No se pudieron leer las imágenes.');

    const images = (data || []).map((img) => ({
      id: img.id,
      publicId: img.public_id,
      format: img.format,
      width: img.width,
      height: img.height,
      createdAt: img.created_at,
      thumbUrl: signedUrl(img.public_id, THUMB),
      fullUrl: signedUrl(img.public_id, FULL),
      downloadUrl: signedUrl(img.public_id, DOWNLOAD),
    }));

    res.status(200).json({ images });
  } catch (err) {
    sendError(res, err);
  }
}
