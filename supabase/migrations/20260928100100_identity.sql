-- Identidad pública: Carnet BOIA y sus 5 preguntas.
-- Spec: REQ-IDE-010, REQ-IDE-013, REQ-IDE-014, REQ-IDE-016 (versión de la
-- pregunta, L2), REQ-ARQ-011. La cuenta privada (email, sesiones, factores)
-- vive en auth.users y nunca se expone: el Carnet sólo guarda lo público.

-- ---------------------------------------------------------------------------
-- Preguntas del Carnet. Son contenido fijado por D-08 / §44.1, no muestra.

create table public.carnet_questions (
  id text primary key,
  version integer not null default 1,
  position smallint not null unique,
  prompt text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger carnet_questions_touch before update on public.carnet_questions
  for each row execute function private.touch_version();

insert into public.carnet_questions (id, position, prompt) values
  ('cosa-mas-rara', 1, '¿Cuál ha sido la cosa más rara que has visto pasar en una fiesta o festival?'),
  ('descubrimiento', 2, '¿Cuál es el mejor descubrimiento musical que hiciste por casualidad?'),
  ('obra', 3, '¿Qué obra, fotografía, película, disco o pieza artística te cambió un poco la cabeza?'),
  ('mejor-recuerdo', 4, '¿Cuál es tu mejor recuerdo relacionado con la música?'),
  ('buena-fiesta', 5, 'Completa la frase: una buena fiesta necesita siempre…');

alter table public.carnet_questions enable row level security;
revoke all on public.carnet_questions from anon, authenticated, service_role;
grant select on public.carnet_questions to anon, authenticated;
grant select, insert, update on public.carnet_questions to service_role;

create policy carnet_questions_read on public.carnet_questions
  for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Carnet: apodo, avatar, «Miembro de BOIA desde…».

create table public.carnets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null
    check (char_length(nickname) between 2 and 30 and nickname = btrim(nickname)),
  avatar_key text,
  member_since timestamptz not null default now(),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index carnets_nickname_key on public.carnets (lower(nickname));

create trigger carnets_touch before update on public.carnets
  for each row execute function private.touch_version();

alter table public.carnets enable row level security;
revoke all on public.carnets from anon, authenticated, service_role;
grant select on public.carnets to anon, authenticated;
-- member_since y version no los fija el cliente.
grant insert (user_id, nickname, avatar_key) on public.carnets to authenticated;
grant update (nickname, avatar_key) on public.carnets to authenticated;
grant select, insert, update, delete on public.carnets to service_role;

create policy carnets_read on public.carnets
  for select to anon, authenticated
  using (true);

create policy carnets_insert_own on public.carnets
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_member()));

create policy carnets_update_own on public.carnets
  for update to authenticated
  using (user_id = (select auth.uid()) and (select private.is_member()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Respuestas públicas (se muestran siempre con su pregunta, REQ-IDE-015).

create table public.carnet_answers (
  user_id uuid not null references public.carnets (user_id) on delete cascade,
  question_id text not null references public.carnet_questions (id),
  question_version integer not null,
  answer text not null check (char_length(answer) between 1 and 500),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);
create index carnet_answers_question_idx on public.carnet_answers (question_id);

create trigger carnet_answers_touch before update on public.carnet_answers
  for each row execute function private.touch_version();

alter table public.carnet_answers enable row level security;
revoke all on public.carnet_answers from anon, authenticated, service_role;
grant select on public.carnet_answers to anon, authenticated;
grant insert (user_id, question_id, question_version, answer) on public.carnet_answers to authenticated;
grant update (answer, question_version) on public.carnet_answers to authenticated;
grant delete on public.carnet_answers to authenticated;
grant select, insert, update, delete on public.carnet_answers to service_role;

create policy carnet_answers_read on public.carnet_answers
  for select to anon, authenticated
  using (true);

create policy carnet_answers_insert_own on public.carnet_answers
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_member()));

create policy carnet_answers_update_own on public.carnet_answers
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy carnet_answers_delete_own on public.carnet_answers
  for delete to authenticated
  using (user_id = (select auth.uid()));
