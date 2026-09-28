-- Retira los datos de muestra (REQ-ARQ-006). Se ejecuta con el rol dueño
-- de las migraciones (postgres en Supabase), p. ej. desde el editor SQL:
--
--   psql "$DATABASE_URL" -f supabase/sample/remove-sample.sql
--
-- Después se cargan los datos reales desde el Admin o se vuelve a sembrar la
-- muestra con supabase/seeds/*.sql. Falla entero, sin borrar nada, si algún
-- dato real depende de la muestra (una compra de un evento de muestra, un
-- logro de muestra ya concedido, objetos reales en una temporada de muestra).

begin;

update public.site_settings
set active_home_revision_id = null
where active_home_revision_id in (select id from public.home_revisions where is_sample);

update public.seasons
set active_world_revision_id = null
where active_world_revision_id in (select id from public.world_revisions where is_sample);

delete from public.home_revisions where is_sample;
delete from public.home_blocks where is_sample;
delete from public.world_revisions where is_sample;
delete from public.world_objects where is_sample;
delete from public.achievements where is_sample;
delete from public.events where is_sample;
delete from public.islands where is_sample;
delete from public.seasons where is_sample;

commit;
