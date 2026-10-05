# Pendientes — QANBAN

Trabajo acordado que **todavía no se ha hecho**. Es una lista de lo que viene; para el
estado actual del proyecto y las decisiones ya tomadas, ver [HANDOFF.md](HANDOFF.md)
(que además tiene sus propios pendientes: Casos de Prueba, "Compañía", drag & drop sin probar).

Última actualización: 5 de octubre de 2026.

---

## 1. Imágenes en los bugs 🖼️

**Estado:** hay un **mockup visual** ([BugImagesPlaceholder.jsx](src/components/backlog/BugImagesPlaceholder.jsx)),
mostrado en el formulario de bug del Backlog con la etiqueta "Próximamente". Es inerte: no hay
`<input type="file">`, no valida, no sube ni guarda nada. Solo dibuja la zona de arrastrar y soltar.
Al implementar la función hay que **reemplazarlo** por el componente real, no extenderlo.

Al **registrar un bug** (formulario del Backlog, `BugFormSheet` en modo `backlog`) se podrán
adjuntar imágenes como evidencia.

### Requisitos acordados

- **Formatos de imagen** como JPG y PNG, más los otros que se encuentren razonables
  (candidatos: JPEG, WebP, GIF; HEIC/AVIF a evaluar, porque no todos los navegadores los muestran).
- **Peso máximo: 5 MB.**
- **Proveedor: Cloudinary.** La integración se hará más adelante, no en esta etapa.

### Por decidir antes de implementarlo

- ¿Los 5 MB son **por imagen** o en total por bug? (Se asume por imagen.)
- ¿Cuántas imágenes como máximo por bug?
- ¿Se pueden **añadir o quitar** al editar un bug, o solo al crearlo?
- ¿Dónde se ven? Lo natural es una galería en el formulario del Backlog y de solo lectura en
  la hoja *Clasificar Bug* del Tablero, quizá con una miniatura en la tarjeta.
- **Dónde guardar las referencias en Supabase.** Opciones: una tabla `bug_images`
  (`bug_id`, `url`, `public_id`, `created_at`, con `ON DELETE CASCADE` como el resto de la
  jerarquía) o una columna `jsonb` en `bugs`. La tabla permite borrar una imagen sin
  reescribir el bug y es más coherente con el esquema actual; habría que escribir su migración
  y su política RLS en `supabase/migrations/`.
- Qué pasa con las imágenes en Cloudinary **al borrar un bug** (el `CASCADE` borra las filas,
  pero no los archivos remotos).

### Notas para cuando se haga

- **Validar el tipo y el peso en el navegador** antes de subir (mensaje claro si se pasa de
  5 MB o el formato no es válido), y **repetir los límites en Cloudinary** (formatos permitidos y
  tamaño máximo en el upload preset), porque la validación del navegador se puede saltar.
- **No poner el API secret de Cloudinary en el frontend.** Todo lo que lleva `VITE_` viaja
  en el bundle y es público (igual que la anon key de Supabase, ver el aviso de seguridad
  del [README](README.md#seguridad)). Para subir directo desde el navegador se usa un
  *unsigned upload preset*; si hace falta firmar o borrar imágenes, eso requiere un backend o
  una función serverless. Las variables nuevas (`VITE_CLOUDINARY_CLOUD_NAME`, etc.) también
  hay que cargarlas en Vercel y documentarlas en el README.
- Seguir las convenciones del proyecto: la subida va en un **hook** (no en el componente),
  que devuelva `{ success }` / `{ success: false, error }` y lance sus toasts.
- Mientras el proyecto no tenga autenticación, cualquiera podría subir archivos a la cuenta
  de Cloudinary con ese preset. Poner límites de cuota en Cloudinary y no subir material sensible.
