-- =====================================================================
-- VÁRIAS FOTOS POR PATRIMÔNIO — script complementar
-- Execute no "SQL Editor" do Supabase. Pode ser executado mais de uma vez.
-- =====================================================================

-- Lista com os caminhos das fotos no bucket fotos-patrimonio, em ordem.
-- A coluna "foto" continua existindo e guarda a foto principal (a primeira da lista).
alter table public.patrimonios
  add column if not exists fotos text[] not null default '{}';

-- Leva a foto que cada patrimônio já tinha para a nova lista
update public.patrimonios
  set fotos = array[foto]
  where foto is not null and cardinality(fotos) = 0;
