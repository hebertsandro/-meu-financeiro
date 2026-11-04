-- Corrige a restrição de status da tabela debts.
-- Execute no SQL Editor do MESMO projeto Supabase conectado ao site.

alter table public.debts
  alter column status set default 'Pendente';

-- Remove a regra antiga antes de normalizar os dados existentes.
alter table public.debts
  drop constraint if exists debts_status_check;

-- Primeiro normaliza todos os registros antigos; depois cria a nova regra.
update public.debts
set status = case
  when lower(trim(coalesce(status, ''))) in ('pago', 'paid', 'quitado', 'quitada')
    then 'Pago'
  else 'Pendente'
end;

alter table public.debts
  add constraint debts_status_check
  check (status in ('Pendente', 'Pago'));

-- Confere a regra que ficou ativa.
select conname, pg_get_constraintdef(oid) as regra
from pg_constraint
where conrelid = 'public.debts'::regclass
  and conname = 'debts_status_check';
