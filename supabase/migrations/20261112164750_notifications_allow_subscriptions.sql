alter table public.notifications drop constraint if exists notifications_category_check;

alter table public.notifications
add constraint notifications_category_check
check (category = any(array['cartoes','contas','metas','entradas','gastos','parcelas','geral','social','assinaturas']::text[]));
