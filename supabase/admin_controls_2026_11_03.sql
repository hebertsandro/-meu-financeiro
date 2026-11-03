-- Configuracao global do sistema. Apenas leitura publica do estado de manutencao.
create table if not exists public.app_settings (
  id boolean primary key default true check (id = true),
  maintenance_mode boolean not null default false,
  maintenance_message text not null default 'Estamos realizando uma manutenção. Voltaremos em breve.',
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (true) on conflict (id) do nothing;
alter table public.app_settings enable row level security;
drop policy if exists "Anyone can read maintenance status" on public.app_settings;
create policy "Anyone can read maintenance status" on public.app_settings for select using (true);
revoke insert, update, delete on public.app_settings from anon, authenticated;
grant select on public.app_settings to anon, authenticated;
