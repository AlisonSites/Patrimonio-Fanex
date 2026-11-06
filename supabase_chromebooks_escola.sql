-- =====================================================================
-- CARGA — Novos Chromebooks da escola (Samsung)
-- Execute no "SQL Editor" do Supabase DEPOIS do supabase_chromebook.sql.
-- Entram como disponíveis para empréstimo. Pode ser executado mais de uma
-- vez: números de série já cadastrados são ignorados.
-- =====================================================================

insert into public.chromebooks (numero_serie, marca, propriedade, status) values
  ('09WZ9QCTC02256R', 'Samsung', 'escola', 'disponivel'),
  ('09X09QCW303543V', 'Samsung', 'escola', 'disponivel'),
  ('09X09QAT802858A', 'Samsung', 'escola', 'disponivel'),
  ('09X09QAT803043A', 'Samsung', 'escola', 'disponivel'),
  ('09X09QAT802806E', 'Samsung', 'escola', 'disponivel'),
  ('09X09QAT802660P', 'Samsung', 'escola', 'disponivel'),
  ('09X09QAT800351P', 'Samsung', 'escola', 'disponivel'),
  ('09WZ9QBW100008T', 'Samsung', 'escola', 'disponivel'),
  ('09X09QCW506625X', 'Samsung', 'escola', 'disponivel'),
  ('09X09QAT803086Z', 'Samsung', 'escola', 'disponivel'),
  ('09X09QAT800020J', 'Samsung', 'escola', 'disponivel'),
  ('09X09QCW506208Z', 'Samsung', 'escola', 'disponivel'),
  ('09WZ9QCTC06088J', 'Samsung', 'escola', 'disponivel'),
  ('09X09QAT802864J', 'Samsung', 'escola', 'disponivel'),
  ('09WZ9QBTC00618B', 'Samsung', 'escola', 'disponivel'),
  ('09WZ9QBW100366A', 'Samsung', 'escola', 'disponivel'),
  ('09X09QCW302990E', 'Samsung', 'escola', 'disponivel'),
  ('09WZ9QCTC06017X', 'Samsung', 'escola', 'disponivel'),
  ('09X09QCW303529L', 'Samsung', 'escola', 'disponivel'),
  ('09WZ9QCTC05876B', 'Samsung', 'escola', 'disponivel')
on conflict (numero_serie) do nothing;

-- Conferência: mostra como cada um desses números ficou cadastrado.
-- Se algum aparecer como 'aluno', ele já existia antes e não foi alterado.
select numero_serie, propriedade, status
from public.chromebooks
where numero_serie in (
  '09WZ9QCTC02256R', '09X09QCW303543V', '09X09QAT802858A', '09X09QAT803043A',
  '09X09QAT802806E', '09X09QAT802660P', '09X09QAT800351P', '09WZ9QBW100008T',
  '09X09QCW506625X', '09X09QAT803086Z', '09X09QAT800020J', '09X09QCW506208Z',
  '09WZ9QCTC06088J', '09X09QAT802864J', '09WZ9QBTC00618B', '09WZ9QBW100366A',
  '09X09QCW302990E', '09WZ9QCTC06017X', '09X09QCW303529L', '09WZ9QCTC05876B'
)
order by numero_serie;
