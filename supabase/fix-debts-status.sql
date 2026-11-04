-- Corrige a restrição antiga da tabela debts para aceitar os status usados pelo aplicativo.
-- Execute uma única vez no SQL Editor do Supabase.

alter table public.debts
  alter column status set default 'Pendente';

alter table public.debts
  drop constraint if exists debts_status_check;

alter table public.debts
  add constraint debts_status_check
  check (status in ('Pendente', 'Pago'));

-- Garante que registros antigos permaneçam compatíveis com o aplicativo.
update public.debts
set status = case
  when lower(trim(status)) in ('pago', 'paid', 'quitado', 'quitada') then 'Pago'
  else 'Pendente'
end
where status not in ('Pendente', 'Pago');
