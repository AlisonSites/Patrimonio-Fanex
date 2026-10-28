-- =====================================================================
-- MÓDULO CHROMEBOOK — script complementar
-- Execute no "SQL Editor" do Supabase DEPOIS do supabase_schema.sql.
-- Pode ser executado mais de uma vez sem problemas.
-- =====================================================================

-- =====================================================================
-- 1. TURMAS E ALUNOS
-- =====================================================================

create table if not exists public.turmas (
  id bigint generated always as identity primary key,
  nome text not null,
  unidade_id bigint references public.unidades (id) on delete set null,
  ano_letivo int not null default extract(year from now())::int,
  turno text check (turno in ('manha', 'tarde', 'noite', 'integral')),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

create index if not exists idx_turmas_unidade on public.turmas (unidade_id);

create table if not exists public.alunos (
  id bigint generated always as identity primary key,
  nome text not null,
  cpf text unique,        -- opcional; só dígitos
  matricula text unique,  -- opcional
  turma_id bigint references public.turmas (id) on delete set null,
  status text not null default 'ativo' check (status in ('ativo', 'transferido', 'formado', 'inativo')),
  created_at timestamptz not null default now()
);

create index if not exists idx_alunos_turma on public.alunos (turma_id);

-- =====================================================================
-- 2. CHROMEBOOKS (do aluno e da escola na mesma tabela)
-- =====================================================================
-- propriedade = 'aluno'  -> pertence a um aluno (aluno_id obrigatório)
-- propriedade = 'escola' -> da escola, pode ser emprestado
-- status 'emprestado' e 'manutencao' são controlados automaticamente
-- pelos empréstimos e manutenções (ver triggers abaixo).

create table if not exists public.chromebooks (
  id bigint generated always as identity primary key,
  numero_serie text not null unique,
  marca text,
  propriedade text not null check (propriedade in ('aluno', 'escola')),
  aluno_id bigint references public.alunos (id) on delete restrict,
  status text not null default 'disponivel'
    check (status in ('disponivel', 'emprestado', 'manutencao', 'baixado')),
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_chromebook_aluno check (propriedade = 'escola' or aluno_id is not null),
  constraint chk_chromebook_emprestado check (status <> 'emprestado' or propriedade = 'escola')
);

create index if not exists idx_chromebooks_aluno on public.chromebooks (aluno_id);
create index if not exists idx_chromebooks_status on public.chromebooks (status);

drop trigger if exists trg_chromebooks_updated_at on public.chromebooks;
create trigger trg_chromebooks_updated_at
  before update on public.chromebooks
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 3. MANUTENÇÕES
-- =====================================================================

create table if not exists public.manutencoes (
  id bigint generated always as identity primary key,
  chromebook_id bigint not null references public.chromebooks (id) on delete restrict,
  aluno_id bigint references public.alunos (id) on delete set null,
  data_ida date not null default current_date,
  data_retorno date,
  tipos_quebra text[] not null
    check (cardinality(tipos_quebra) > 0
       and tipos_quebra <@ array['bateria', 'tela', 'teclado', 'outro']::text[]),
  descricao text,
  ticket_geekie text not null,
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'finalizado')),
  custo numeric(14,2),
  responsavel_custo text check (responsavel_custo in ('escola', 'familia', 'garantia')),
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_manutencoes_chromebook on public.manutencoes (chromebook_id);
create index if not exists idx_manutencoes_aluno on public.manutencoes (aluno_id);

-- Só pode existir uma manutenção em aberto por Chromebook
create unique index if not exists uq_manutencao_aberta
  on public.manutencoes (chromebook_id) where status <> 'finalizado';

drop trigger if exists trg_manutencoes_updated_at on public.manutencoes;
create trigger trg_manutencoes_updated_at
  before update on public.manutencoes
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 4. EMPRÉSTIMOS (apenas Chromebooks da escola)
-- =====================================================================

create table if not exists public.emprestimos (
  id bigint generated always as identity primary key,
  chromebook_id bigint not null references public.chromebooks (id) on delete restrict,
  aluno_id bigint not null references public.alunos (id) on delete restrict,
  manutencao_id bigint references public.manutencoes (id) on delete set null, -- motivo: Chromebook do aluno em manutenção
  data_retirada date not null default current_date,
  devolucao_prevista date,
  data_devolucao date,         -- null = ainda em aberto
  estado_devolucao text,
  observacao text,
  registrado_por text,         -- id do usuário do sistema que registrou
  created_at timestamptz not null default now()
);

create index if not exists idx_emprestimos_chromebook on public.emprestimos (chromebook_id);
create index if not exists idx_emprestimos_aluno on public.emprestimos (aluno_id);

-- Um Chromebook só pode estar emprestado uma vez, e um aluno só pode ter um empréstimo em aberto
create unique index if not exists uq_emprestimo_aberto_chromebook
  on public.emprestimos (chromebook_id) where data_devolucao is null;
create unique index if not exists uq_emprestimo_aberto_aluno
  on public.emprestimos (aluno_id) where data_devolucao is null;

-- =====================================================================
-- 5. REGRAS AUTOMÁTICAS DE STATUS
-- =====================================================================

-- Recalcula o status do Chromebook a partir das manutenções e empréstimos em aberto.
-- 'baixado' é definido manualmente e nunca é sobrescrito.
create or replace function public.recalcular_status_chromebook(p_id bigint)
returns void as $$
declare
  v_novo text;
begin
  if p_id is null then return; end if;

  if exists (select 1 from public.manutencoes where chromebook_id = p_id and status <> 'finalizado') then
    v_novo := 'manutencao';
  elsif exists (select 1 from public.emprestimos where chromebook_id = p_id and data_devolucao is null) then
    v_novo := 'emprestado';
  else
    v_novo := 'disponivel';
  end if;

  update public.chromebooks
     set status = v_novo
   where id = p_id and status <> 'baixado' and status <> v_novo;
end;
$$ language plpgsql;

-- Validações antes de registrar um empréstimo
create or replace function public.validar_emprestimo()
returns trigger as $$
declare
  cb record;
begin
  -- Ao apenas registrar a devolução não precisa validar o aparelho de novo
  if tg_op = 'UPDATE' and new.chromebook_id = old.chromebook_id and new.data_devolucao is not null then
    return new;
  end if;

  select * into cb from public.chromebooks where id = new.chromebook_id;
  if cb.propriedade <> 'escola' then
    raise exception 'Somente Chromebooks da escola podem ser emprestados.';
  end if;
  if cb.status = 'baixado' then
    raise exception 'Este Chromebook está baixado e não pode ser emprestado.';
  end if;
  if exists (select 1 from public.manutencoes where chromebook_id = new.chromebook_id and status <> 'finalizado') then
    raise exception 'Este Chromebook está em manutenção.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_emprestimos_validar on public.emprestimos;
create trigger trg_emprestimos_validar
  before insert or update on public.emprestimos
  for each row execute function public.validar_emprestimo();

-- Validações antes de registrar uma manutenção
create or replace function public.validar_manutencao()
returns trigger as $$
declare
  cb record;
begin
  -- Ao finalizar, preenche a data de retorno se ninguém informou
  if new.status = 'finalizado' and new.data_retorno is null then
    new.data_retorno := current_date;
  end if;

  if new.status = 'finalizado' then
    return new;
  end if;

  select * into cb from public.chromebooks where id = new.chromebook_id;
  if cb.status = 'baixado' then
    raise exception 'Este Chromebook está baixado e não pode ir para manutenção.';
  end if;
  if exists (select 1 from public.emprestimos where chromebook_id = new.chromebook_id and data_devolucao is null) then
    raise exception 'Este Chromebook está emprestado. Registre a devolução antes de enviá-lo para manutenção.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_manutencoes_validar on public.manutencoes;
create trigger trg_manutencoes_validar
  before insert or update on public.manutencoes
  for each row execute function public.validar_manutencao();

-- Depois de qualquer alteração em empréstimos/manutenções, atualiza o status do(s) Chromebook(s)
create or replace function public.atualizar_status_chromebook()
returns trigger as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.recalcular_status_chromebook(old.chromebook_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.chromebook_id <> old.chromebook_id) then
    perform public.recalcular_status_chromebook(new.chromebook_id);
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_emprestimos_status on public.emprestimos;
create trigger trg_emprestimos_status
  after insert or update or delete on public.emprestimos
  for each row execute function public.atualizar_status_chromebook();

drop trigger if exists trg_manutencoes_status on public.manutencoes;
create trigger trg_manutencoes_status
  after insert or update or delete on public.manutencoes
  for each row execute function public.atualizar_status_chromebook();

-- =====================================================================
-- 6. SEGURANÇA (mesmo padrão das demais tabelas do sistema)
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array['turmas', 'alunos', 'chromebooks', 'manutencoes', 'emprestimos']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "allow_all_%s" on public.%I;', t, t);
    execute format(
      'create policy "allow_all_%s" on public.%I for all using (true) with check (true);',
      t, t
    );
  end loop;
end $$;

-- =====================================================================
-- FIM DO SCRIPT
-- =====================================================================
