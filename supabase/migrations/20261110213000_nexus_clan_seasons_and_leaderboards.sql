create table if not exists public.social_clan_seasons(
 id uuid primary key default gen_random_uuid(),
 clan_id uuid not null references public.social_clans(id) on delete cascade,
 name text not null check(char_length(name) between 3 and 50),
 starts_at timestamptz not null default now(),
 ends_at timestamptz not null default (now()+interval '30 days'),
 status text not null default 'active' check(status in ('active','completed')),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 check(ends_at>starts_at)
);
create index if not exists social_clan_seasons_active_idx on public.social_clan_seasons(clan_id,status,ends_at desc);
alter table public.social_clan_seasons enable row level security;
drop policy if exists "Clan members read seasons" on public.social_clan_seasons;
create policy "Clan members read seasons" on public.social_clan_seasons for select to authenticated
using(exists(select 1 from public.social_clan_members m where m.clan_id=social_clan_seasons.clan_id and m.user_id=(select auth.uid())));

create table if not exists public.social_clan_season_scores(
 season_id uuid not null references public.social_clan_seasons(id) on delete cascade,
 clan_id uuid not null references public.social_clans(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 points bigint not null default 0 check(points>=0),
 updated_at timestamptz not null default now(),
 primary key(season_id,user_id)
);
alter table public.social_clan_season_scores enable row level security;
drop policy if exists "Clan members read season scores" on public.social_clan_season_scores;
create policy "Clan members read season scores" on public.social_clan_season_scores for select to authenticated
using(exists(select 1 from public.social_clan_members m where m.clan_id=social_clan_season_scores.clan_id and m.user_id=(select auth.uid())));

create or replace function private.social_track_clan_season_xp()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare delta_xp bigint;
begin
 delta_xp := greatest(0,new.contributed_xp-coalesce(old.contributed_xp,0));
 if delta_xp>0 then
  insert into public.social_clan_season_scores(season_id,clan_id,user_id,points,updated_at)
  select s.id,new.clan_id,new.user_id,delta_xp,now()
  from public.social_clan_seasons s
  where s.clan_id=new.clan_id and s.status='active' and now() between s.starts_at and s.ends_at
  on conflict(season_id,user_id) do update set points=public.social_clan_season_scores.points+excluded.points,updated_at=now();
 end if;
 return new;
end;
$function$;
drop trigger if exists social_track_clan_season_xp on public.social_clan_member_xp;
create trigger social_track_clan_season_xp after insert or update of contributed_xp on public.social_clan_member_xp
for each row execute function private.social_track_clan_season_xp();
revoke all on function private.social_track_clan_season_xp() from public,anon,authenticated;

create or replace function public.social_create_clan_season(target_clan uuid,season_name text)
returns uuid language plpgsql security definer set search_path=''
as $function$
declare new_id uuid; clean_name text;
begin
 if auth.uid() is null then raise exception 'Faça login.'; end if;
 clean_name:=trim(season_name);
 if char_length(clean_name)<3 or char_length(clean_name)>50 then raise exception 'O nome da temporada deve ter de 3 a 50 caracteres.'; end if;
 if not exists(select 1 from public.social_clans c where c.id=target_clan and c.created_by=auth.uid()) then raise exception 'Somente o líder fundador pode abrir uma temporada.'; end if;
 if exists(select 1 from public.social_clan_seasons s where s.clan_id=target_clan and s.status='active' and s.ends_at>now()) then raise exception 'Já existe uma temporada ativa neste clã.'; end if;
 insert into public.social_clan_seasons(clan_id,name,starts_at,ends_at,created_by)
 values(target_clan,clean_name,now(),now()+interval '30 days',auth.uid()) returning id into new_id;
 insert into public.social_clan_season_scores(season_id,clan_id,user_id,points)
 select new_id,target_clan,m.user_id,0 from public.social_clan_members m where m.clan_id=target_clan
 on conflict(season_id,user_id) do nothing;
 return new_id;
end;
$function$;
revoke all on function public.social_create_clan_season(uuid,text) from public,anon;
grant execute on function public.social_create_clan_season(uuid,text) to authenticated;
