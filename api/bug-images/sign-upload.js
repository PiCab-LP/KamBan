// POST /api/bug-images/sign-upload   { bugId }   (solo QA)
// Devuelve una firma para que el NAVEGADOR suba el archivo directo a Cloudinary
// (los bytes no pasan por esta función). El public_id y el type=authenticated se
// fijan aquí en el servidor: el cliente no puede elegir la ruta ni hacer el asset
// público.
import { getAuthContext, requireRole, HttpError, sendError } from '../_lib/auth.js';
import { cloudinary, API_SECRET, API_KEY, CLOUD_NAME, BUGS_FOLDER } from '../_lib/cloudinary.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Método no permitido.');

    const ctx = await getAuthContext(req);
    requireRole(ctx, 'qa');

    const { bugId } = req.body || {};
    if (!bugId || typeof bugId !== 'string') {
      throw new HttpError(400, 'Falta el identificador del bug.');
    }

    // El bug debe existir y ser visible para este QA (RLS).
    const { data: bug, error } = await ctx.supabase
      .from('bugs').select('id').eq('id', bugId).maybeSingle();
    if (error) throw new HttpError(500, 'No se pudo verificar el bug.');
    if (!bug) throw new HttpError(404, 'El bug no existe.');

    const timestamp = Math.round(Date.now() / 1000);
    const rand = Math.random().toString(36).slice(2, 10);
    const assetFolder = `${BUGS_FOLDER}/${bugId}`;
    const publicId = `${assetFolder}/${timestamp}-${rand}`;

    // asset_folder ubica el asset en la carpeta de la Media Library en cuentas con
    // "dynamic folders" (donde las barras del public_id NO crean carpetas). El public_id
    // conserva la ruta completa para que la limpieza por prefijo siga funcionando.
    // Firmar EXACTAMENTE los parámetros que el cliente enviará a Cloudinary.
    const signature = cloudinary.utils.api_sign_request(
      { asset_folder: assetFolder, public_id: publicId, timestamp, type: 'authenticated' },
      API_SECRET,
    );

    res.status(200).json({
      signature,
      timestamp,
      apiKey: API_KEY,
      cloudName: CLOUD_NAME,
      publicId,
      assetFolder,
      type: 'authenticated',
    });
  } catch (err) {
    sendError(res, err);
  }
}
