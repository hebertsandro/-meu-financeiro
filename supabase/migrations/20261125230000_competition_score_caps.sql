-- Os limites antigos (1000 pts / 100 XP) rejeitavam partidas legítimas de Gem Match (placar na casa dos milhares)
-- e Finance Flap (XP até 120). Isso fazia desafios e rankings não contabilizarem.
do $$ declare d text;
 a text:='match_score>1000 or earned_xp>100 or (coalesce(did_win,false) and match_score<10)';
 b text:='match_score>1000 or earned_xp>100 or (coalesce(did_win,false) and match_score<100)';
begin
 select pg_get_functiondef('public.competition_record_match'::regproc) into d;
 d:=replace(replace(d,a,'match_score>200000 or earned_xp>200 or (coalesce(did_win,false) and match_score<10)'),b,'match_score>20000 or earned_xp>200 or (coalesce(did_win,false) and match_score<100)');
 execute d;
end $$;
