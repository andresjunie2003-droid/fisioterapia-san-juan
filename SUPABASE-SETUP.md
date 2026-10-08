# Activar el panel de administración

La web estática puede seguir en GitHub Pages. El panel está disponible en `/admin/` y `/admin.html`. Supabase guarda el contenido, autentica al propietario y publica las imágenes.

## 1. Crear Supabase

1. Crea un proyecto en Supabase y, en **Authentication → Users**, crea el usuario del propietario con su correo. Usa una contraseña única. Desactiva el registro público de usuarios en Authentication para que nadie más pueda crear cuentas en el proyecto.
2. En **Project Settings → API**, copia la **Project URL** y la clave **publishable** (o `anon` heredada). Nunca uses `service_role` ni una clave `secret` en este sitio.
3. La `Project URL` y la clave publishable ya están guardadas en `assets/js/supabase-config.js`. Esos valores son públicos en una web estática; las políticas RLS del paso siguiente son las que impiden que terceros escriban.
4. En **SQL Editor**, ejecuta `supabase/setup.sql`.
5. En Authentication → Users, copia el UUID del usuario creado. En SQL Editor ejecuta `insert into public.site_admins (user_id) values ('UUID-DEL-PROPIETARIO');` sustituyendo el texto por el UUID real. No compartas ese UUID públicamente.
6. Publica la carpeta en GitHub Pages. Abre `https://TU-DOMINIO/admin.html`, inicia sesión y guarda los cambios. La clave se guarda únicamente como configuración pública y la sesión de acceso en el navegador del propietario.

## Variables y secretos

- `SUPABASE_URL`: URL del proyecto; pública.
- `SUPABASE_PUBLISHABLE_KEY` (o la clave heredada `anon`): clave pública limitada por RLS.
- Contraseña: se introduce en el formulario de Supabase Auth, nunca se guarda en archivos.
- `service_role` / secret key: **no necesaria**; nunca ponerla en HTML, JavaScript, GitHub o variables `VITE_*`.

La URL y clave publicable ya están configuradas localmente. Todavía falta ejecutar el SQL, autorizar la cuenta propietaria y publicar los cambios.

## Contenido editable

Datos del centro, teléfono, dirección, horarios, descripción, servicios y precios, imágenes existentes o imágenes subidas, y una oferta opcional. El propietario puede gestionar el panel desde el navegador; no necesita Claude ni GitHub.
