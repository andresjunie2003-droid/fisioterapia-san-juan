-- Centro de Fisioterapia San Juan: CMS de una sola web.
-- En Supabase SQL Editor, ejecuta el archivo completo después de crear el usuario propietario.
create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.site_content (
  id integer primary key check (id = 1),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_admins enable row level security;
alter table public.site_content enable row level security;
grant select on public.site_content to anon, authenticated;
grant insert, update on public.site_content to authenticated;
grant select on public.site_admins to authenticated;

-- El propietario puede verificar su propia membresía; no puede listar otros admins.
drop policy if exists "Admins can read own membership" on public.site_admins;
create policy "Admins can read own membership" on public.site_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- El sitio público solo puede leer el contenido publicado.
drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content" on public.site_content for select using (true);
-- Solo el usuario que se añada a site_admins puede crear/editar el documento.
drop policy if exists "Admins can insert site content" on public.site_content;
create policy "Admins can insert site content" on public.site_content for insert to authenticated
  with check (exists (select 1 from public.site_admins a where a.user_id = (select auth.uid())));
drop policy if exists "Admins can update site content" on public.site_content;
create policy "Admins can update site content" on public.site_content for update to authenticated
  using (exists (select 1 from public.site_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.site_admins a where a.user_id = (select auth.uid())));

-- La lista de administradores nunca es escribible desde el navegador.
-- El bucket es público para mostrar imágenes; solo el propietario puede subir.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update set public = true, file_size_limit = 8388608;
drop policy if exists "Public can view site images" on storage.objects;
create policy "Public can view site images" on storage.objects for select using (bucket_id = 'site-images');
drop policy if exists "Admins can upload site images" on storage.objects;
create policy "Admins can upload site images" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-images' and exists (select 1 from public.site_admins a where a.user_id = (select auth.uid())));
drop policy if exists "Admins can update site images" on storage.objects;
create policy "Admins can update site images" on storage.objects for update to authenticated
  using (bucket_id = 'site-images' and exists (select 1 from public.site_admins a where a.user_id = (select auth.uid())))
  with check (bucket_id = 'site-images' and exists (select 1 from public.site_admins a where a.user_id = (select auth.uid())));
