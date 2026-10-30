-- =====================================================================
-- MEU PERFIL — script complementar
-- Execute no "SQL Editor" do Supabase. Pode ser executado mais de uma vez.
-- Adiciona os dados pessoais e a foto do usuário, usados na tela "Meu perfil".
-- =====================================================================

-- 1. Dados pessoais do usuário
alter table public.usuarios add column if not exists email text;
alter table public.usuarios add column if not exists telefone text;      -- só dígitos
alter table public.usuarios add column if not exists data_nascimento date;
alter table public.usuarios add column if not exists foto text;          -- caminho do arquivo no bucket fotos-usuarios

-- 2. STORAGE — bucket público para a foto do usuário (exibida no topo do site)
insert into storage.buckets (id, name, public)
values ('fotos-usuarios', 'fotos-usuarios', true)
on conflict (id) do nothing;

drop policy if exists "fotos_usuarios_select" on storage.objects;
create policy "fotos_usuarios_select"
  on storage.objects for select
  using (bucket_id = 'fotos-usuarios');

drop policy if exists "fotos_usuarios_insert" on storage.objects;
create policy "fotos_usuarios_insert"
  on storage.objects for insert
  with check (bucket_id = 'fotos-usuarios');

drop policy if exists "fotos_usuarios_update" on storage.objects;
create policy "fotos_usuarios_update"
  on storage.objects for update
  using (bucket_id = 'fotos-usuarios');

drop policy if exists "fotos_usuarios_delete" on storage.objects;
create policy "fotos_usuarios_delete"
  on storage.objects for delete
  using (bucket_id = 'fotos-usuarios');

-- 3. LOGIN POR E-MAIL — o e-mail também serve para entrar no sistema,
-- então ele é guardado em minúsculas e não pode se repetir entre usuários.
update public.usuarios
  set email = nullif(lower(trim(email)), '')
  where email is distinct from nullif(lower(trim(email)), '');

create unique index if not exists uq_usuarios_email on public.usuarios (lower(email));
