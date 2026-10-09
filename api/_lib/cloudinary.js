// Configuración de Cloudinary para las funciones serverless. El API secret vive
// SOLO aquí (variable de entorno de servidor en Vercel, nunca VITE_*), jamás llega
// al navegador. Los assets se suben y entregan como `authenticated` (no públicos):
// su URL de visualización debe ir firmada, y esa firma se hace con este secreto.
import { v2 as cloudinary } from 'cloudinary';

export const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

export const BUGS_FOLDER = 'qanban_bugs';

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

/**
 * URL firmada de un asset `authenticated`. Sin la firma (que solo se puede generar
 * con el secreto) Cloudinary responde 401, así que la imagen no es de consulta pública.
 */
export function signedUrl(publicId, rawTransformation) {
  return cloudinary.url(publicId, {
    type: 'authenticated',
    resource_type: 'image',
    sign_url: true,
    secure: true,
    transformation: [{ raw_transformation: rawTransformation }],
  });
}

export { cloudinary, API_SECRET };
