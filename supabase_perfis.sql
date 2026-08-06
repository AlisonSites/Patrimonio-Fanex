-- =====================================================================
-- PERFIS DE ACESSO — script complementar ao supabase_schema.sql
-- Execute este script no "SQL Editor" do Supabase DEPOIS de já ter a
-- tabela public.usuarios criada (ela não está no supabase_schema.sql
-- original, então este script assume que ela já existe no seu projeto).
-- =====================================================================

-- 1. Tabela de perfis de acesso (Administrador, Financeiro, etc.)
create table if not exists public.perfis (
  id bigint generated always as identity primary key,
  nome text not null unique,
  descricao text,
  is_admin boolean not null default false, -- true = perfil com acesso de administrador
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

alter table public.perfis enable row level security;

drop policy if exists "allow_all_perfis" on public.perfis;
create policy "allow_all_perfis" on public.perfis for all using (true) with check (true);

-- Perfis iniciais de exemplo (pode editar/apagar depois pela tela de Perfis)
insert into public.perfis (nome, descricao, is_admin) values
  ('Administrador', 'Acesso total ao sistema, incluindo cadastro de usuários e perfis', true),
  ('Financeiro', 'Acesso aos módulos financeiros e relatórios', false)
on conflict (nome) do nothing;

-- 2. Vincula cada usuário a um perfil
alter table public.usuarios
  add column if not exists perfil_id bigint references public.perfis (id) on delete set null;

create index if not exists idx_usuarios_perfil on public.usuarios (perfil_id);

-- Observação: a função autenticar_usuario() usada no login não precisa ser
-- alterada — o front-end busca o perfil do usuário em uma consulta separada
-- logo após o login, então não corremos o risco de mexer na lógica de senha
-- que já está funcionando no seu projeto.
