// POST /api/bug-images/delete   (solo QA)
//   { publicId }  -> borra UNA imagen de Cloudinary y su fila.
//   { bugId }     -> limpieza COMPLETA: borra todos los assets de qanban_bugs/<bugId>/
//                    por prefijo. Las filas de bug_images caen solas por CASCADE cuando
//                    después se borra el bug (ver src/hooks/useBugs.js deleteBug), por eso
//                    aquí solo se tocan los archivos de Cloudinary.
import { getAuthContext, requireRole, HttpError, sendError, assertUuid } from '../_lib/auth.js';
import { cloudinary, BUGS_FOLDER } from '../_lib/cloudinary.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Método no permitido.');

    const ctx = await getAuthContext(req);
    requireRole(ctx, 'qa');

    const { publicId, bugId } = req.body || {};

    if (bugId) {
      assertUuid(bugId, 'identificador del bug');
      const folder = `${BUGS_FOLDER}/${bugId}`;
      await cloudinary.api.delete_resources_by_prefix(`${folder}/`, {
        type: 'authenticated',
        resource_type: 'image',
      });
      // La carpeta vacía es cosmética; si falla (no existe / no vacía) no es un error.
      try {
        await cloudinary.api.delete_folder(folder);
      } catch {
        /* carpeta ya inexistente o aún con restos: se ignora */
      }
      res.status(200).json({ success: true });
      return;
    }

    if (publicId && typeof publicId === 'string') {
      // Confinar el borrado a NUESTRA carpeta: nunca tocar assets de otros proyectos de
      // la misma cuenta de Cloudinary, aunque el que pide sea QA.
      if (!publicId.startsWith(`${BUGS_FOLDER}/`)) {
        throw new HttpError(400, 'La imagen no pertenece a este proyecto.');
      }
      const result = await cloudinary.uploader.destroy(publicId, {
        type: 'authenticated',
        resource_type: 'image',
        invalidate: true,
      });
      if (result.result !== 'ok' && result.result !== 'not found') {
        throw new HttpError(502, 'Cloudinary no pudo eliminar la imagen.');
      }
      const { error } = await ctx.supabase.from('bug_images').delete().eq('public_id', publicId);
      if (error) throw new HttpError(500, 'La imagen se borró de Cloudinary pero no de la base.');
      res.status(200).json({ success: true });
      return;
    }

    throw new HttpError(400, 'Falta la imagen (publicId) o el bug (bugId).');
  } catch (err) {
    sendError(res, err);
  }
}
