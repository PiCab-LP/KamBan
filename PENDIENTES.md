# Pendientes — QANBAN

Trabajo acordado que **todavía no se ha hecho**. Es una lista de lo que viene; para el
estado actual del proyecto y las decisiones ya tomadas, ver [HANDOFF.md](HANDOFF.md)
(que además tiene sus propios pendientes: Casos de Prueba, "Compañía", drag & drop sin probar).

Última actualización: 9 de octubre de 2026.

---

## 1. Imágenes en los bugs 🖼️ — ✅ IMPLEMENTADO (9 oct 2026)

Ya está hecho. Detalle de la arquitectura y de la configuración (variables de entorno en Vercel y
en Cloudinary) en [README.md](README.md#imágenes-de-bugs-cloudinary) y [HANDOFF.md](HANDOFF.md).
Resumen de lo que se construyó y de cómo quedaron las decisiones que estaban abiertas:

- **Proveedor:** Cloudinary, carpeta `qanban_bugs`, un asset por imagen en `qanban_bugs/<bug_id>/`.
  Los assets son **`authenticated`** (no públicos): se ven solo con URL firmada que genera el backend.
- **Backend nuevo:** funciones serverless en `api/bug-images/*` (Vercel) que firman la subida y la
  visualización y autorizan con el **JWT + rol** de Supabase. El API secret vive solo en Vercel
  (variable no-`VITE_`). Reemplazó al plan anterior del *unsigned upload preset* público, que no
  cumplía la privacidad por rol.
- **Límites:** máximo **5 MB por imagen** (con **compresión automática** en el navegador vía
  `browser-image-compression`) y hasta **10 imágenes por bug**. Formatos **JPG, PNG, WebP, GIF**.
- **Dónde:** se suben al **crear** el bug (Backlog) y se editan (agregar/eliminar) desde el **Tablero**;
  galería de solo lectura para Dev (en "Mis Bugs") y Viewer. La tarjeta del tablero muestra un
  indicador de clip con el conteo.
- **Almacenamiento:** tabla hija `bug_images` (`public_id`, `format`, metadata) con `ON DELETE CASCADE`
  y RLS espejo de `bugs`/`comments` (migración `20261009120000_bug_images.sql`). No se guarda URL:
  las firmadas se generan on-demand.
- **Borrado:** quitar una imagen la borra de Cloudinary; borrar un bug limpia su subcarpeta completa
  por prefijo antes del `CASCADE` (cero huérfanos).
- Doble validación de tipo/peso (navegador + Cloudinary), hook propio (`useBugImages`) con toasts y
  `{ success }`, siguiendo las convenciones del proyecto.

> Pendiente de evaluación futura: URLs firmadas con expiración (token-based auth de Cloudinary); hoy
> la firma no caduca pero solo la entrega el backend a quien el RLS autoriza.
