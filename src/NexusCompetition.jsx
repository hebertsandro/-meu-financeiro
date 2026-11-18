import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {supabase} from './supabase';
import {Trophy,Users,Globe,CalendarDays,Medal,History,LoaderCircle,RefreshCw,Zap,Clock3,ChevronRight,Gamepad2,ShieldCheck,Package,Swords,Target,Sparkles} from 'lucide-react';
import './nexus-competition.css';
import NexusLoot from './NexusLoot';
import NexusMultiplayer from './NexusMultiplayer';

const games=[{id:'space-nexus',name:'Space Nexus',icon:'🚀'},{id:'piggy-run',name:'Asas da Fortuna',icon:'🐷'},{id:'quiz',name:'Quiz Financeiro',icon:'🧠'},{id:'extra-dungeon',name:'Dungeon Rush',icon:'⚔️'},{id:'extra-gems',name:'Gem Match',icon:'💎'},{id:'extra-race',name:'Corrida do Dinheiro',icon:'🏎️'},{id:'extra-defense',name:'Defesa do Cofrinho',icon:'🏰'}];
const gameName=id=>games.find(g=>g.id===id)?.name||id;
const fmtDate=value=>value?new Date(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',timeZone:'UTC'}):'—';
const fmtDateTime=value=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
const initials=name=>String(name||'Jogador').trim().slice(0,1).toUpperCase();

export default function NexusCompetition({session,gameXp=0,onToast=()=>{}}){
 const userId=session?.user?.id;
 const [tab,setTab]=useState('ranking'),[rankView,setRankView]=useState('global'),[collectionView,setCollectionView]=useState('items'),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false);
 const [globalRows,setGlobalRows]=useState([]),[friendRows,setFriendRows]=useState([]),[season,setSeason]=useState(null),[seasonRows,setSeasonRows]=useState([]);
 const [tournament,setTournament]=useState(null),[tournamentRows,setTournamentRows]=useState([]),[matches,setMatches]=useState([]),[medals,setMedals]=useState([]),[rankMedals,setRankMedals]=useState([]);
 const [friends,setFriends]=useState([]);
 const [challenges,setChallenges]=useState([]);
 const [challengeFriend,setChallengeFriend]=useState('');
 const [challengeGame,setChallengeGame]=useState('space-nexus');
 const [challengeTarget,setChallengeTarget]=useState('500');
 const [challengeTitle,setChallengeTitle]=useState('Desafio amistoso');
 const [challengeBusy,setChallengeBusy]=useState(false);
 const [error,setError]=useState('');

 const load=useCallback(async(silent=false)=>{
  if(!userId)return;
  if(silent)setRefreshing(true);else setLoading(true);
  setError('');
  try{
   await supabase.rpc('competition_finalize_periods');
   const [walletRankingRes,friendshipsRes,seasonRes,tournamentRes,matchRes,medalRes,rankMedalRes,challengeRes]=await Promise.all([
    supabase.from('nexus_loot_wallets').select('user_id,collection_score').order('collection_score',{ascending:false}).order('user_id',{ascending:true}).limit(50),
    supabase.from('social_friendships').select('user_a,user_b').or('user_a.eq.'+userId+',user_b.eq.'+userId),
    supabase.from('competition_seasons').select('*').eq('status','active').gt('ends_at',new Date().toISOString()).order('starts_at',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('competition_weekly_tournaments').select('*').eq('status','active').gt('ends_at',new Date().toISOString()).order('starts_at',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('competition_match_history').select('*').eq('user_id',userId).order('played_at',{ascending:false}).limit(40),
    supabase.from('competition_game_medals').select('*').eq('user_id',userId).order('medals_count',{ascending:false}),
    supabase.from('competition_rank_medals').select('*').eq('user_id',userId).order('medals_count',{ascending:false}),
    supabase.from('competition_challenges').select('*,competition_challenge_members(user_id,best_score,matches_played)').or('creator_id.eq.'+userId+',opponent_id.eq.'+userId).order('created_at',{ascending:false}).limit(30)
   ]);
   const profileRows=walletRankingRes.data||[];
   setGlobalRows(profileRows);
   const friendIds=[...new Set([userId,...(friendshipsRes.data||[]).map(f=>f.user_a===userId?f.user_b:f.user_a)])];
   const friendProfiles=friendIds.length?await supabase.from('social_profiles').select('user_id,username,display_name,avatar,game_xp,game_correct').in('user_id',friendIds):{data:[]};
   const friendWallets=friendIds.length?await supabase.from('nexus_loot_wallets').select('user_id,coins,collection_score').in('user_id',friendIds):{data:[]};
   const lootByUser=new Map((friendWallets.data||[]).map(x=>[x.user_id,x]));
   setFriends((friendProfiles.data||[]).filter(p=>p.user_id!==userId));
   const challengeProfileMap=new Map((friendProfiles.data||[]).map(p=>[p.user_id,p]));
   setChallenges((challengeRes.data||[]).map(ch=>({...ch,creator:challengeProfileMap.get(ch.creator_id),opponent:challengeProfileMap.get(ch.opponent_id)})));
   setFriendRows((friendProfiles.data||[]).map(p=>({...p,...(lootByUser.get(p.user_id)||{coins:0,collection_score:0})})));
   const activeSeason=seasonRes.data||null;setSeason(activeSeason);
   if(activeSeason){
    const scores=await supabase.from('competition_season_scores').select('*').eq('season_id',activeSeason.id).order('xp_points',{ascending:false}).limit(50);
    const ids=(scores.data||[]).map(x=>x.user_id);
    const ps=ids.length?await supabase.from('social_profiles').select('user_id,username,display_name,avatar,game_xp').in('user_id',ids):{data:[]};
    const pmap=new Map((ps.data||[]).map(p=>[p.user_id,p]));
    setSeasonRows((scores.data||[]).map(x=>({...x,profile:pmap.get(x.user_id)})));
   }else setSeasonRows([]);
   const activeTournament=tournamentRes.data||null;setTournament(activeTournament);
   if(activeTournament){
    const entries=await supabase.from('competition_tournament_entries').select('*').eq('tournament_id',activeTournament.id).order('points',{ascending:false}).limit(50);
    const ids=(entries.data||[]).map(x=>x.user_id);
    const ps=ids.length?await supabase.from('social_profiles').select('user_id,username,display_name,avatar').in('user_id',ids):{data:[]};
    const pmap=new Map((ps.data||[]).map(p=>[p.user_id,p]));
    setTournamentRows((entries.data||[]).map(x=>({...x,profile:pmap.get(x.user_id)})));
   }else setTournamentRows([]);
   setMatches(matchRes.data||[]);setMedals(medalRes.data||[]);setRankMedals(rankMedalRes.data||[]);
  }catch(e){setError(e?.message||'Não foi possível carregar a competição.')}
  finally{setLoading(false);setRefreshing(false)}
 },[userId]);

 useEffect(()=>{
   load();
   const channel=supabase.channel('competition-global-rank-'+userId)
    .on('postgres_changes',{event:'*',schema:'public',table:'nexus_loot_wallets'},()=>load(true))
    .subscribe();
   const interval=window.setInterval(()=>load(true),15000);
   return()=>{window.clearInterval(interval);supabase.removeChannel(channel)};
  },[load,userId]);
 const sortedGlobal=useMemo(()=>globalRows.slice().sort((a,b)=>Number(b.collection_score||0)-Number(a.collection_score||0)||String(a.user_id).localeCompare(String(b.user_id))),[globalRows]);
 const sortedFriends=useMemo(()=>friendRows.slice().sort((a,b)=>Number(b.collection_score||0)-Number(a.collection_score||0)||String(a.user_id).localeCompare(String(b.user_id))),[friendRows]);
 const myGlobalRank=sortedGlobal.findIndex(x=>x.user_id===userId)+1;
 const myFriendRank=sortedFriends.findIndex(x=>x.user_id===userId)+1;
 const mySeasonRank=seasonRows.findIndex(x=>x.user_id===userId)+1;
 const myTournamentRank=tournamentRows.findIndex(x=>x.user_id===userId)+1;
 const myMedals=medals.reduce((n,m)=>n+Number(m.medals_count||0),0)+rankMedals.reduce((n,m)=>n+Number(m.medals_count||0),0);
 const display=p=>p?.display_name||p?.username||'Jogador';
 const mastery=games.map(game=>{const rows=matches.filter(m=>m.game_key===game.id);const wins=rows.filter(m=>m.won).length;const xp=rows.reduce((sum,m)=>sum+Number(m.xp_earned||0),0);const best=rows.reduce((value,m)=>Math.max(value,Number(m.score||0)),0);const points=rows.length+wins*2;return {...game,matches:rows.length,wins,xp,best,level:Math.min(10,1+Math.floor(points/3)),progress:Math.min(100,(points%3)/3*100)}});
 const secretAchievements=[
  {id:'first-clear',name:'Primeiro portal',icon:'🌀',desc:'Conclua sua primeira partida.',progress:Math.min(1,matches.length),target:1},
  {id:'all-games',name:'Explorador do universo',icon:'🌌',desc:'Jogue os sete títulos do Arcade.',progress:games.filter(g=>matches.some(m=>m.game_key===g.id)).length,target:7},
  {id:'dungeon-master',name:'Mestre da masmorra',icon:'⚔️',desc:'Vença três partidas de Dungeon Rush.',progress:Math.min(3,matches.filter(m=>m.game_key==='extra-dungeon'&&m.won).length),target:3},
  {id:'gem-alchemist',name:'Alquimista de gemas',icon:'💎',desc:'Conclua dez partidas de Gem Match.',progress:Math.min(10,matches.filter(m=>m.game_key==='extra-gems').length),target:10},
  {id:'street-legend',name:'Lenda das pistas',icon:'🏎️',desc:'Faça 50 pontos em uma corrida.',progress:Math.min(50,matches.filter(m=>m.game_key==='extra-race').reduce((best,m)=>Math.max(best,Number(m.score||0)),0)),target:50},
  {id:'piggy-guardian',name:'Guardião lendário',icon:'🏰',desc:'Vença cinco partidas de Defesa do Cofrinho.',progress:Math.min(5,matches.filter(m=>m.game_key==='extra-defense'&&m.won).length),target:5}
 ];
 const recentMatches=matches.slice(0,5);
 const coachTip=!matches.length?'Sua jornada está começando. Faça uma partida em cada jogo para descobrir seu estilo e liberar as primeiras conquistas.':recentMatches.every(m=>!m.won)?'Experimente reduzir a dificuldade e priorizar consistência. Aprender os padrões dos inimigos vale mais que correr atrás de pontuação.':recentMatches.filter(m=>m.won).length>=3?'Você está em uma boa sequência! Tente superar seu recorde no jogo em que já tem mais vitórias.':'Alterne entre os jogos para desenvolver reflexo, estratégia e conhecimento financeiro.';
 const createChallenge=async()=>{if(!challengeFriend||challengeBusy)return;setChallengeBusy(true);setError('');const finishAt=new Date(Date.now()+7*24*60*60*1000).toISOString();const {error:e}=await supabase.rpc('competition_create_friend_challenge',{target_friend:challengeFriend,challenge_title:challengeTitle,selected_game:challengeGame,target_score:Number(challengeTarget),finish_at:finishAt});setChallengeBusy(false);if(e){setError(e.message);return;}onToast('Desafio enviado! Seu amigo já pode disputar.');await load(true);};
 const rankRow=(p,index,score,detail='XP')=><div className={'nc-rank-row '+(p?.user_id===userId?'is-me':'')} key={p?.user_id||index}>
  <span className={'nc-rank-position rank-'+(index+1)}>{index+1<=3?['🥇','🥈','🥉'][index]:index+1}</span>
  <span className="nc-rank-avatar">{p?.avatar||initials(display(p))}</span>
  <span className="nc-rank-player"><b>{display(p)}{p?.user_id===userId?' · Você':''}</b><small>{p?.username?'@'+p.username:'Jogador NEXUS'}</small></span>
  <span className="nc-rank-score"><b>{Number(score||0).toLocaleString('pt-BR')}</b><small>{detail}</small></span>
 </div>;

 const tabs=[['ranking','Rankings',Globe],['collection','Coleção',Package],['multiplayer','Multiplayer',Gamepad2],['challenges','Desafios',Swords],['mastery','Maestria',Target],['history','Partidas',History]];
 if(!userId)return <section className="nc-panel"><p>Entre na sua conta para participar das competições NEXUS.</p></section>;
 return <section className="nexus-competition">
  <div className="nc-hero"><div><span className="nc-eyebrow">NEXUS · ARENA COMPETITIVA</span><h2>Competição</h2><p>Suba no ranking, dispute torneios e conquiste medalhas jogando.</p></div><div className="nc-hero-xp"><Trophy size={21}/><b>{Number(gameXp).toLocaleString('pt-BR')} XP</b><small>{myMedals} medalhas colecionadas</small></div></div>
  <div className="nc-summary-grid"><article><Globe/><span>Ranking global</span><b>{myGlobalRank?('#'+myGlobalRank):'—'}</b><small>entre os 50 exibidos</small></article><article><Users/><span>Ranking de amigos</span><b>{myFriendRank?('#'+myFriendRank):'—'}</b><small>{friends.length} amigo(s)</small></article><article><CalendarDays/><span>Temporada atual</span><b>{mySeasonRank?('#'+mySeasonRank):'—'}</b><small>{season?('até '+fmtDate(season.ends_at)):'Aguardando partidas'}</small></article><article><Medal/><span>Medalhas</span><b>{myMedals}</b><small>Vitórias acumuladas</small></article></div>
  <div className="nc-tabs" role="tablist">{tabs.map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={16}/>{label}</button>)}</div>
  <div className="nc-content-head"><div><span>PLACAR NEXUS</span><h3>{tabs.find(t=>t[0]===tab)?.[1]}</h3></div><button onClick={()=>load(true)} disabled={refreshing}><RefreshCw size={15} className={refreshing?'nc-spin':''}/> Atualizar</button></div>
  {(loading||refreshing)&&<div className="nc-loading"><LoaderCircle className="nc-spin"/> Carregando competição…</div>}
  {error&&<div className="nc-error">{error}</div>}
  {!loading&&tab==='ranking'&&<><div className="nc-subtabs">{[['global','Global'],['friends','Amigos'],['season','Temporada'],['tournament','Torneios']].map(([id,label])=><button key={id} className={rankView===id?'active':''} onClick={()=>setRankView(id)}>{label}</button>)}</div>{rankView==='global'&&<NexusLoot userId={userId} view="ranking"/>}{rankView==='friends'&&<div className="nc-board"><div className="nc-board-caption">SEUS AMIGOS · VALOR TOTAL DA COLEÇÃO</div>{sortedFriends.length?sortedFriends.map((p,i)=>rankRow(p,i,p.collection_score,'pontos de coleção')):<p className="nc-empty">Adicione amigos no NEXUS Social para montar seu ranking.</p>}</div>}
  {rankView==='season'&&<div className="nc-panel"><div className="nc-season-banner"><CalendarDays/><div><b>{season?.name||'Temporada NEXUS'}</b><small>{season?fmtDate(season.starts_at)+' — '+fmtDate(season.ends_at):'A temporada começa após sua primeira partida registrada.'}</small></div><span>30 DIAS</span></div>{seasonRows.length?seasonRows.map((x,i)=>rankRow(x.profile||{user_id:x.user_id},i,x.xp_points,'XP da temporada')):<p className="nc-empty">Jogue um dos jogos compatíveis para entrar no ranking desta temporada.</p>}</div>}
  {rankView==='tournament'&&<div className="nc-panel"><div className="nc-season-banner"><Trophy/><div><b>{tournament?.name||'Torneio semanal NEXUS'}</b><small>{tournament?fmtDate(tournament.starts_at)+' — '+fmtDate(tournament.ends_at):'O torneio semanal abre automaticamente com a primeira partida registrada.'}</small></div><span>SEMANAL</span></div>{tournamentRows.length?tournamentRows.map((x,i)=>rankRow(x.profile||{user_id:x.user_id},i,x.points,'pontos')):<p className="nc-empty">Nenhuma pontuação neste torneio ainda. Jogue para aparecer no placar!</p>}</div>}</>}
  {!loading&&tab==='collection'&&<><div className="nc-subtabs"><button className={collectionView==='items'?'active':''} onClick={()=>setCollectionView('items')}>Artefatos e drops</button><button className={collectionView==='medals'?'active':''} onClick={()=>setCollectionView('medals')}>Medalhas e conquistas</button></div>{collectionView==='items'?<NexusLoot userId={userId} view="collection"/>:<div className="nc-medal-grid">{games.map(g=>{const item=medals.find(m=>m.game_key===g.id);return <article className="nc-medal-card" key={g.id}><span>{g.icon}</span><div><b>Campeão · {g.name}</b><small>Vitórias registradas</small></div><strong>×{item?.medals_count||0}</strong></article>})}{[{id:'global-season',icon:'🌍',name:'Campeão global'},{id:'weekly-tournament',icon:'🏆',name:'Campeão semanal'},{id:'friends-weekly',icon:'👥',name:'Campeão dos amigos'}].map(g=>{const item=rankMedals.find(m=>m.medal_key===g.id);return <article className="nc-medal-card" key={g.id}><span>{g.icon}</span><div><b>{g.name}</b><small>Vitórias em rankings e torneios</small></div><strong>×{item?.medals_count||0}</strong></article>})}<p className="nc-muted">Cada vitória registrada acrescenta uma medalha à sua coleção.</p></div>}</>}
    {!loading&&tab==='multiplayer'&&<NexusMultiplayer userId={userId} onToast={onToast}/>}
  {!loading&&tab==='challenges'&&<div className="nc-panel nc-challenge-panel">
   <div className="nc-board-caption">DUELOS ENTRE AMIGOS · PRAZO DE 7 DIAS</div>
   <div className="nc-challenge-form">
    <label>Escolha um amigo<select value={challengeFriend} onChange={e=>setChallengeFriend(e.target.value)}><option value="">Selecione...</option>{friends.map(p=><option key={p.user_id} value={p.user_id}>{display(p)} {p.username?'(@'+p.username+')':''}</option>)}</select></label>
    <label>Jogo<select value={challengeGame} onChange={e=>{const key=e.target.value;setChallengeGame(key);setChallengeTarget(key==='extra-race'?'40':key==='extra-gems'?'100':key==='extra-dungeon'?'100':key==='extra-defense'?'100':'500')}}>{games.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
    <label>Meta de pontuação<input type="number" min="1" max="1000000" value={challengeTarget} onChange={e=>setChallengeTarget(e.target.value)}/></label>
    <label>Nome do desafio<input maxLength="60" value={challengeTitle} onChange={e=>setChallengeTitle(e.target.value)}/></label>
    <button className="nc-primary" type="button" disabled={!challengeFriend||!challengeTitle.trim()||Number(challengeTarget)<1||challengeBusy} onClick={createChallenge}><Swords size={16}/>{challengeBusy?'Enviando...':'Desafiar amigo'}</button>
   </div>
   {!friends.length&&<p className="nc-empty">Adicione amigos no NEXUS Social para criar duelos particulares.</p>}
   <div className="nc-challenge-list">{challenges.length?challenges.map(ch=>{const opponent=ch.creator_id===userId?ch.opponent:ch.creator;const mine=(ch.competition_challenge_members||[]).find(m=>m.user_id===userId);const theirs=(ch.competition_challenge_members||[]).find(m=>m.user_id!==userId);const status=ch.status==='active'?'EM ANDAMENTO':ch.status==='completed'?'CONCLUÍDO':ch.status==='expired'?'ENCERRADO':'CANCELADO';return <article className="nc-challenge-card" key={ch.id}><div><span className="nc-challenge-status">{status}</span><h4>{ch.title}</h4><small>{gameName(ch.game_key)} · meta {Number(ch.target_score).toLocaleString('pt-BR')} pts · até {fmtDate(ch.ends_at)}</small></div><div className="nc-challenge-scores"><span><b>{Number(mine?.best_score||0).toLocaleString('pt-BR')}</b><small>Seu recorde</small></span><span><b>{Number(theirs?.best_score||0).toLocaleString('pt-BR')}</b><small>{display(opponent)}</small></span></div>{ch.winner_id&&<strong className="nc-challenge-winner">{ch.winner_id===userId?'🏆 Você venceu!':'🏅 Desafio decidido'}</strong>}</article>}):<p className="nc-empty">Nenhum desafio por enquanto. Escolha um amigo e comece a disputa!</p>}</div>
  </div>}
  {!loading&&tab==='mastery'&&<div className="nc-mastery-wrap">
   <div className="nc-mastery-intro"><div><span className="nc-board-caption">EVOLUÇÃO DO JOGADOR</span><h3>Domine cada jogo</h3><p>A maestria é calculada pelas suas partidas registradas. Cada vitória acelera sua evolução.</p></div><div className="nc-mastery-total"><b>{matches.length}</b><small>PARTIDAS ANALISADAS</small></div></div>
   <div className="nc-mastery-grid">{mastery.map(g=><article className="nc-mastery-card" key={g.id}><div className="nc-mastery-game"><span>{g.icon}</span><div><b>{g.name}</b><small>NÍVEL DE MAESTRIA {g.level}/10</small></div></div><div className="nc-mastery-track"><i style={{width:g.progress+'%'}}/></div><div className="nc-mastery-stats"><span>{g.matches} partidas</span><span>{g.wins} vitórias</span><span>{g.xp} XP</span></div><div className="nc-mastery-record">Melhor pontuação <b>{g.best.toLocaleString('pt-BR')}</b></div></article>)}</div>
      <section className="nc-secret-achievements"><div className="nc-secret-head"><div><span className="nc-board-caption">CONQUISTAS OCULTAS</span><h3>Descubra feitos especiais</h3></div><small>Algumas conquistas só aparecem quando você chega lá.</small></div><div className="nc-secret-grid">{secretAchievements.map(a=>{const done=a.progress>=a.target;return <article key={a.id} className={'nc-secret-card '+(done?'unlocked':'')}><span>{done?a.icon:'🔒'}</span><div><b>{done?a.name:'Conquista oculta'}</b><small>{done?a.desc:'Continue explorando o Arcade para revelar este feito.'}</small><div className="nc-secret-track"><i style={{width:(a.progress/a.target*100)+'%'}}/></div></div><strong>{a.progress}/{a.target}</strong></article>})}</div></section>
<article className="nc-coach-card"><span><Sparkles size={18}/> NEXUS COACH · ANÁLISE LOCAL</span><h3>Seu próximo passo</h3><p>{coachTip}</p><small>Conselhos gerados a partir das suas partidas registradas. Nenhum dado é enviado para uma IA externa.</small></article>
   <p className="nc-muted">Títulos sugeridos: {matches.length>=20?'Veterano do Arcade':matches.length>=10?'Explorador NEXUS':matches.length>=3?'Recruta NEXUS':'Novato NEXUS'} · Os números consideram o histórico recente de até 40 partidas.</p>
  </div>}
  {!loading&&tab==='history'&&<div className="nc-panel"><div className="nc-board-caption">SUAS ÚLTIMAS 40 PARTIDAS</div>{matches.length?matches.map(m=><article className="nc-match-row" key={m.id}><span>{games.find(g=>g.id===m.game_key)?.icon||'🎮'}</span><div><b>{gameName(m.game_key)}</b><small>{fmtDateTime(m.played_at)} · {m.mode}</small></div><div className="nc-match-score"><b>{Number(m.score).toLocaleString('pt-BR')} pts</b><small>+{m.xp_earned} XP {m.won?'· 🏅 Vitória':''}</small></div></article>):<p className="nc-empty">Suas partidas aparecerão aqui depois que concluir um jogo compatível.</p>}</div>}
  <div className="nc-footnote"><ShieldCheck size={15}/> Pontuações, medalhas e resultados são registrados na sua conta. O ranking considera os dados salvos no NEXUS.</div>
 </section>;
}
