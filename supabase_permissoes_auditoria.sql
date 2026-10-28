-- =====================================================================
-- PERMISSÕES DETALHADAS POR PERFIL + LOG DE AUDITORIA
-- Execute no "SQL Editor" do Supabase DEPOIS do supabase_perfis.sql e
-- do supabase_chromebook.sql. Pode ser executado mais de uma vez.
-- =====================================================================

-- =====================================================================
-- 1. PERMISSÕES POR PÁGINA
-- =====================================================================
-- Formato: { "chave.da.pagina": "ver" | "editar" }. Página ausente = sem acesso.
-- Perfis com is_admin = true têm acesso total e ignoram este campo.

alter table public.perfis
  add column if not exists permissoes jsonb not null default '{}'::jsonb;

-- Perfis que já existiam continuam com o mesmo acesso de antes:
-- todas as telas do patrimônio (exceto relatórios) e o cadastro de unidades.
update public.perfis
   set permissoes = '{
     "patrimonio.dashboard": "ver",
     "patrimonio.bens": "editar",
     "patrimonio.conservacao": "editar",
     "patrimonio.quebrados": "editar",
     "patrimonio.movimentacao": "editar",
     "patrimonio.tipos": "editar",
     "patrimonio.setores": "editar",
     "patrimonio.responsaveis": "editar",
     "patrimonio.fornecedores": "editar",
     "admin.unidades": "editar"
   }'::jsonb
 where is_admin = false and permissoes = '{}'::jsonb;

-- =====================================================================
-- 2. LOG DE AUDITORIA
-- =====================================================================
-- O site envia o id do usuário logado no cabeçalho "x-usuario-id" de cada
-- requisição; o trigger abaixo grava quem fez cada inclusão/alteração/exclusão.

create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id text,
  acao text not null check (acao in ('inclusao', 'alteracao', 'exclusao')),
  dados_antes jsonb,
  dados_depois jsonb,
  usuario_id text,
  usuario_nome text,
  created_at timestamptz not null default now()
);

create index if not exists idx_auditoria_created on public.auditoria (created_at desc);
create index if not exists idx_auditoria_tabela on public.auditoria (tabela);

alter table public.auditoria enable row level security;

-- Somente leitura pelo site; gravação apenas pelo trigger (security definer)
drop policy if exists "auditoria_select" on public.auditoria;
create policy "auditoria_select" on public.auditoria for select using (true);

create or replace function public.registrar_auditoria()
returns trigger
security definer
set search_path = public
as $$
declare
  v_usuario_id text;
  v_usuario_nome text;
  v_antes jsonb;
  v_depois jsonb;
begin
  begin
    v_usuario_id := nullif(current_setting('request.headers', true)::json ->> 'x-usuario-id', '');
  exception when others then
    v_usuario_id := null;
  end;

  if v_usuario_id is not null then
    select nome into v_usuario_nome from public.usuarios where id::text = v_usuario_id;
  end if;

  -- Nunca guarda senhas no log
  if tg_op in ('UPDATE', 'DELETE') then v_antes := to_jsonb(old) - 'senha'; end if;
  if tg_op in ('INSERT', 'UPDATE') then v_depois := to_jsonb(new) - 'senha'; end if;

  -- Ignora alterações que não mudaram nada
  if tg_op = 'UPDATE' and (v_antes - 'updated_at') = (v_depois - 'updated_at') then
    return null;
  end if;

  insert into public.auditoria (tabela, registro_id, acao, dados_antes, dados_depois, usuario_id, usuario_nome)
  values (
    tg_table_name,
    coalesce(v_depois, v_antes) ->> 'id',
    case tg_op when 'INSERT' then 'inclusao' when 'UPDATE' then 'alteracao' else 'exclusao' end,
    v_antes,
    v_depois,
    v_usuario_id,
    v_usuario_nome
  );
  return null;
end;
$$ language plpgsql;

-- Liga o trigger em todas as tabelas do sistema que existirem
do $$
declare
  t text;
begin
  foreach t in array array[
    'tipos', 'unidades', 'setores', 'responsaveis', 'fornecedores', 'patrimonios',
    'patrimonio_conservacoes', 'patrimonio_movimentacoes', 'patrimonio_quebrados',
    'usuarios', 'perfis',
    'turmas', 'alunos', 'chromebooks', 'manutencoes', 'emprestimos'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_auditoria on public.%I;', t);
      execute format(
        'create trigger trg_auditoria after insert or update or delete on public.%I
           for each row execute function public.registrar_auditoria();',
        t
      );
    end if;
  end loop;
end $$;

-- =====================================================================
-- FIM DO SCRIPT
-- =====================================================================
