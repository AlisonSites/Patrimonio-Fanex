-- =====================================================================
-- SISTEMA DE CONTROLE DE PATRIMÔNIO ESCOLAR
-- Script de criação do banco de dados para o Supabase (PostgreSQL)
-- Execute este script inteiro no "SQL Editor" do Supabase
-- =====================================================================

-- Extensão usada para gerar timestamps automáticos (geralmente já vem ativa)
create extension if not exists "uuid-ossp";

-- =====================================================================
-- 1. TABELAS BASE (sem dependências)
-- =====================================================================

create table if not exists public.tipos (
  id bigint generated always as identity primary key,
  nome text not null,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

create table if not exists public.unidades (
  id bigint generated always as identity primary key,
  nome text not null,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

create table if not exists public.fornecedores (
  id bigint generated always as identity primary key,
  nome text not null,
  cidade text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 2. TABELAS COM DEPENDÊNCIA (setor depende de unidade)
-- =====================================================================

create table if not exists public.setores (
  id bigint generated always as identity primary key,
  nome text not null,
  unidade_id bigint references public.unidades (id) on delete set null,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

-- Responsável depende de setor (a unidade é obtida automaticamente via join)
create table if not exists public.responsaveis (
  id bigint generated always as identity primary key,
  nome text not null,
  setor_id bigint references public.setores (id) on delete set null,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 3. TABELA PRINCIPAL: PATRIMÔNIOS
-- =====================================================================

create table if not exists public.patrimonios (
  id bigint generated always as identity primary key,
  modelo text not null,
  nome text not null,
  numero_serie text,
  nota_fiscal_numero text,
  nota_fiscal_arquivo text,          -- caminho do arquivo no Storage (bucket notas-fiscais)
  data_aquisicao date,
  valor_original numeric(14,2),
  valor_compra numeric(14,2),
  vencimento_garantia date,
  tipo_id bigint references public.tipos (id) on delete set null,
  unidade_id bigint references public.unidades (id) on delete set null,
  setor_id bigint references public.setores (id) on delete set null,
  responsavel_id bigint references public.responsaveis (id) on delete set null,
  fornecedor_id bigint references public.fornecedores (id) on delete set null,
  observacao text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices para acelerar filtros e relatórios
create index if not exists idx_patrimonios_tipo on public.patrimonios (tipo_id);
create index if not exists idx_patrimonios_unidade on public.patrimonios (unidade_id);
create index if not exists idx_patrimonios_setor on public.patrimonios (setor_id);
create index if not exists idx_patrimonios_responsavel on public.patrimonios (responsavel_id);
create index if not exists idx_patrimonios_fornecedor on public.patrimonios (fornecedor_id);
create index if not exists idx_patrimonios_status on public.patrimonios (status);
create index if not exists idx_setores_unidade on public.setores (unidade_id);
create index if not exists idx_responsaveis_setor on public.responsaveis (setor_id);

-- Atualiza automaticamente "updated_at" a cada alteração
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_patrimonios_updated_at on public.patrimonios;
create trigger trg_patrimonios_updated_at
  before update on public.patrimonios
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 4. SEGURANÇA (Row Level Security)
-- =====================================================================
-- Este é um sistema interno de uso administrativo. Para simplificar,
-- liberamos leitura e escrita para a chave pública (anon/publishable key)
-- usada pelo site em React. Se depois você adicionar login de usuários,
-- troque estas políticas por regras baseadas em auth.uid().

alter table public.tipos enable row level security;
alter table public.unidades enable row level security;
alter table public.setores enable row level security;
alter table public.responsaveis enable row level security;
alter table public.fornecedores enable row level security;
alter table public.patrimonios enable row level security;

-- Política única "permitir tudo" por tabela (SELECT, INSERT, UPDATE, DELETE)
do $$
declare
  t text;
begin
  foreach t in array array['tipos','unidades','setores','responsaveis','fornecedores','patrimonios']
  loop
    execute format('drop policy if exists "allow_all_%s" on public.%I;', t, t);
    execute format(
      'create policy "allow_all_%s" on public.%I for all using (true) with check (true);',
      t, t
    );
  end loop;
end $$;

-- =====================================================================
-- 5. STORAGE — bucket para anexar as notas fiscais em PDF/imagem
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('notas-fiscais', 'notas-fiscais', false)
on conflict (id) do nothing;

-- Políticas de acesso ao bucket (liberado para a chave pública do site)
drop policy if exists "notas_fiscais_select" on storage.objects;
create policy "notas_fiscais_select"
  on storage.objects for select
  using (bucket_id = 'notas-fiscais');

drop policy if exists "notas_fiscais_insert" on storage.objects;
create policy "notas_fiscais_insert"
  on storage.objects for insert
  with check (bucket_id = 'notas-fiscais');

drop policy if exists "notas_fiscais_update" on storage.objects;
create policy "notas_fiscais_update"
  on storage.objects for update
  using (bucket_id = 'notas-fiscais');

drop policy if exists "notas_fiscais_delete" on storage.objects;
create policy "notas_fiscais_delete"
  on storage.objects for delete
  using (bucket_id = 'notas-fiscais');

-- =====================================================================
-- 6. DADOS INICIAIS (opcional) — remova este bloco se não quiser exemplos
-- =====================================================================

insert into public.tipos (nome) values
  ('Informática'), ('Mobiliário'), ('Eletrodoméstico'), ('Material Pedagógico')
on conflict do nothing;

insert into public.unidades (nome) values
  ('Unidade Sede'), ('Unidade Anexo')
on conflict do nothing;

-- =====================================================================
-- FIM DO SCRIPT
-- =====================================================================
