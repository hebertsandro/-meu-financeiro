import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {supabase} from './supabase';
import {Trophy,Users,Globe,CalendarDays,Swords,Medal,History,LoaderCircle,RefreshCw,Target,Zap,Clock3,Plus,ChevronRight,Gamepad2,ShieldCheck} from 'lucide-react';
import './nexus-competition.css';

const games=[{id:'space-nexus',name:'Space Nexus',icon:'🚀'},{id:'piggy-run',name:'Asas da Fortuna',icon:'🐷'},{id:'quiz',name:'Quiz Financeiro',icon:'🧠'}];
const gameName=id=>games.find(g=>g.id===id)?.name||id;
const fmtDate=value=>value?new Date(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'—';
const fmtDateTime=value=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
const initials=name=>String(name||'Jogador').trim().slice(0,1).toUpperCase();

export default function NexusCompetition({session,gameXp=0,onToast=()=>{}}){
 const userId=session?.user?.id;
 const [tab,setTab]=useState('global'),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false);
 const [globalRows,setGlobalRows]=useState([]),[friendRows,setFriendRows]=useState([]),[season,setSeason]=useState(null),[seasonRows,setSeasonRows]=useState([]);
 const [tournament,setTournament]=useState(null),[tournamentRows,setTournamentRows]=useState([]),[matches,setMatches]=useState([]),[medals,setMedals]=useState([]),[rankMedals,setRankMedals]=useState([]),[challenges,setChallenges]=useState([]),[challengeScores,setChallengeScores]=useState({});
 const [friends,setFriends]=useState([]),[challengeFriend,setChallengeFriend]=useState(''),[challengeTitle,setChallengeTitle]=useState('Duelo NEXUS'),[challengeGame,setChallengeGame]=useState('piggy-run'),[challengeTarget,setChallengeTarget]=useState('50'),[challengeEnd,setChallengeEnd]=useState(()=>new Date(Date.now()+7*86400000).toISOString().slice(0,16)),[creating,setCreating]=useState(false);
 const [error,setError]=useState('');

 const load=useCallback(async(silent=false)=>{
  if(!userId)return;
  if(silent)setRefreshing(true);else setLoading(true);
  setError('');
  try{
   await supabase.rpc('competition_finalize_periods');
   const [profilesRes,friendshipsRes,seasonRes,tournamentRes,matchRes,medalRes,rankMedalRes,challengeRes]=await Promise.all([
    supabase.from('social_profiles').select('user_id,username,display_name,avatar,game_xp,game_correct').order('game_xp',{ascending:false}).limit(50),
    supabase.from('social_friendships').select('user_a,user_b').or('user_a.eq.'+userId+',user_b.eq.'+userId),
    supabase.from('competition_seasons').select('*').eq('status','active').gt('ends_at',new Date().toISOString()).order('starts_at',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('competition_weekly_tournaments').select('*').eq('status','active').gt('ends_at',new Date().toISOString()).order('starts_at',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('competition_match_history').select('*').eq('user_id',userId).order('played_at',{ascending:false}).limit(40),
    supabase.from('competition_game_medals').select('*').eq('user_id',userId).order('medals_count',{ascending:false}),
    supabase.from('competition_rank_medals').select('*').eq('user_id',userId).order('medals_count',{ascending:false}),
    supabase.from('competition_challenges').select('*').or('creator_id.eq.'+userId+',opponent_id.eq.'+userId).order('created_at',{ascending:false}).limit(30)
   ]);
   const profileRows=profilesRes.data||[];
   setGlobalRows(profileRows);
   const friendIds=[...new Set([userId,...(friendshipsRes.data||[]).map(f=>f.user_a===userId?f.user_b:f.user_a)])];
   const friendProfiles=friendIds.length?await supabase.from('social_profiles').select('user_id,username,display_name,avatar,game_xp,game_correct').in('user_id',friendIds):{data:[]};
   setFriends(friendProfiles.data||[]);
   setFriendRows(friendProfiles.data||[]);
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
   setMatches(matchRes.data||[]);setMedals(medalRes.data||[]);setRankMedals(rankMedalRes.data||[]);setChallenges(challengeRes.data||[]);
   const cids=(challengeRes.data||[]).map(c=>c.id);
   if(cids.length){
    const cs=await supabase.from('competition_challenge_members').select('*').in('challenge_id',cids);
    const map={};(cs.data||[]).forEach(x=>{(map[x.challenge_id]??=[]).push(x)});setChallengeScores(map);
   }else setChallengeScores({});
  }catch(e){setError(e?.message||'Não foi possível carregar a competição.')}
  finally{setLoading(false);setRefreshing(false)}
 },[userId]);

 useEffect(()=>{load()},[load]);
 const sortedGlobal=useMemo(()=>globalRows.slice().sort((a,b)=>Number(b.game_xp||0)-Number(a.game_xp||0)),[globalRows]);
 const sortedFriends=useMemo(()=>friendRows.slice().sort((a,b)=>Number(b.game_xp||0)-Number(a.game_xp||0)),[friendRows]);
 const myGlobalRank=sortedGlobal.findIndex(x=>x.user_id===userId)+1;
 const myFriendRank=sortedFriends.findIndex(x=>x.user_id===userId)+1;
 const mySeasonRank=seasonRows.findIndex(x=>x.user_id===userId)+1;
 const myTournamentRank=tournamentRows.findIndex(x=>x.user_id===userId)+1;
 const myMedals=medals.reduce((n,m)=>n+Number(m.medals_count||0),0);
 const display=p=>p?.display_name||p?.username||'Jogador';
 const rankRow=(p,index,score,detail='XP')=><div className={'nc-rank-row '+(p?.user_id===userId?'is-me':'')} key={p?.user_id||index}>
  <span className={'nc-rank-position rank-'+(index+1)}>{index+1<=3?['🥇','🥈','🥉'][index]:index+1}</span>
  <span className="nc-rank-avatar">{p?.avatar||initials(display(p))}</span>
  <span className="nc-rank-player"><b>{display(p)}{p?.user_id===userId?' · Você':''}</b><small>{p?.username?'@'+p.username:'Jogador NEXUS'}</small></span>
  <span className="nc-rank-score"><b>{Number(score||0).toLocaleString('pt-BR')}</b><small>{detail}</small></span>
 </div>;

 async function createChallenge(e){
  e.preventDefault();
  if(!challengeFriend){onToast('Escolha um amigo para desafiar.');return}
  setCreating(true);
  const {data,error:e2}=await supabase.rpc('competition_create_friend_challenge',{target_friend:challengeFriend,challenge_title:challengeTitle,selected_game:challengeGame,target_score:Number(challengeTarget),finish_at:new Date(challengeEnd).toISOString()});
  setCreating(false);
  if(e2){onToast(e2.message||'Não foi possível criar o desafio.');return}
  onToast('Desafio enviado! ⚔️');setTab('challenges');await load(true);
 }
 const tabs=[['global','Global',Globe],['friends','Amigos',Users],['season','Temporada',CalendarDays],['tournament','Torneios',Trophy],['challenges','Desafios',Swords],['medals','Medalhas',Medal],['history','Partidas',History]];
 if(!userId)return <section className="nc-panel"><p>Entre na sua conta para participar das competições NEXUS.</p></section>;
 return <section className="nexus-competition">
  <div className="nc-hero"><div><span className="nc-eyebrow">NEXUS · ARENA COMPETITIVA</span><h2>Competição</h2><p>Suba no ranking, dispute torneios e conquiste medalhas jogando.</p></div><div className="nc-hero-xp"><Trophy size={21}/><b>{Number(gameXp).toLocaleString('pt-BR')} XP</b><small>{myMedals} medalhas colecionadas</small></div></div>
  <div className="nc-summary-grid"><article><Globe/><span>Ranking global</span><b>{myGlobalRank?('#'+myGlobalRank):'—'}</b><small>entre os 50 exibidos</small></article><article><Users/><span>Ranking de amigos</span><b>{myFriendRank?('#'+myFriendRank):'—'}</b><small>{friends.length} amigo(s)</small></article><article><CalendarDays/><span>Temporada atual</span><b>{mySeasonRank?('#'+mySeasonRank):'—'}</b><small>{season?('até '+fmtDate(season.ends_at)):'Aguardando partidas'}</small></article><article><Medal/><span>Medalhas</span><b>{myMedals}</b><small>Vitórias acumuladas</small></article></div>
  <div className="nc-tabs" role="tablist">{tabs.map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={16}/>{label}</button>)}</div>
  <div className="nc-content-head"><div><span>PLACAR NEXUS</span><h3>{tabs.find(t=>t[0]===tab)?.[1]}</h3></div><button onClick={()=>load(true)} disabled={refreshing}><RefreshCw size={15} className={refreshing?'nc-spin':''}/> Atualizar</button></div>
  {(loading||refreshing)&&<div className="nc-loading"><LoaderCircle className="nc-spin"/> Carregando competição…</div>}
  {error&&<div className="nc-error">{error}</div>}
  {!loading&&tab==='global'&&<div className="nc-board"><div className="nc-board-caption">OS JOGADORES COM MAIS XP NO MEU FINANCEIRO</div>{sortedGlobal.length?sortedGlobal.map((p,i)=>rankRow(p,i,p.game_xp,'XP')):<p className="nc-empty">Ainda não há jogadores no ranking.</p>}</div>}
  {!loading&&tab==='friends'&&<div className="nc-board"><div className="nc-board-caption">SEUS AMIGOS ORDENADOS POR XP</div>{sortedFriends.length?sortedFriends.map((p,i)=>rankRow(p,i,p.game_xp,'XP')):<p className="nc-empty">Adicione amigos no NEXUS Social para montar seu ranking.</p>}</div>}
  {!loading&&tab==='season'&&<div className="nc-panel"><div className="nc-season-banner"><CalendarDays/><div><b>{season?.name||'Temporada NEXUS'}</b><small>{season?fmtDate(season.starts_at)+' — '+fmtDate(season.ends_at):'A temporada começa após sua primeira partida registrada.'}</small></div><span>30 DIAS</span></div>{seasonRows.length?seasonRows.map((x,i)=>rankRow(x.profile||{user_id:x.user_id},i,x.xp_points,'XP da temporada')):<p className="nc-empty">Jogue um dos jogos compatíveis para entrar no ranking desta temporada.</p>}</div>}
  {!loading&&tab==='tournament'&&<div className="nc-panel"><div className="nc-season-banner"><Trophy/><div><b>{tournament?.name||'Torneio semanal NEXUS'}</b><small>{tournament?fmtDate(tournament.starts_at)+' — '+fmtDate(tournament.ends_at):'O torneio semanal abre automaticamente com a primeira partida registrada.'}</small></div><span>SEMANAL</span></div>{tournamentRows.length?tournamentRows.map((x,i)=>rankRow(x.profile||{user_id:x.user_id},i,x.points,'pontos')):<p className="nc-empty">Nenhuma pontuação neste torneio ainda. Jogue para aparecer no placar!</p>}</div>}
  {!loading&&tab==='challenges'&&<div className="nc-challenges-layout"><form className="nc-panel nc-challenge-form" onSubmit={createChallenge}><div className="nc-form-title"><Swords/><div><b>Desafiar um amigo</b><small>Quem alcançar a meta primeiro vence.</small></div></div><label>Amigo<select value={challengeFriend} onChange={e=>setChallengeFriend(e.target.value)} required><option value="">Selecione um amigo</option>{friends.map(f=><option key={f.user_id} value={f.user_id}>{display(f)}</option>)}</select></label><label>Nome do desafio<input value={challengeTitle} onChange={e=>setChallengeTitle(e.target.value)} minLength={3} maxLength={60} required/></label><div className="nc-form-two"><label>Jogo<select value={challengeGame} onChange={e=>setChallengeGame(e.target.value)}>{games.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><label>Pontuação-alvo<input type="number" min="1" max="1000000" value={challengeTarget} onChange={e=>setChallengeTarget(e.target.value)} required/></label></div><label>Prazo<input type="datetime-local" value={challengeEnd} onChange={e=>setChallengeEnd(e.target.value)} required/></label><button className="nc-primary" disabled={creating||!friends.length}><Plus size={16}/>{creating?'Enviando…':'Enviar desafio'}</button>{!friends.length&&<small className="nc-muted">Você precisa ter amigos adicionados para criar um duelo.</small>}</form>
   <div className="nc-panel"><div className="nc-form-title"><Target/><div><b>Seus desafios</b><small>Duelo de pontuação entre amigos.</small></div></div>{challenges.length?challenges.map(c=>{const mine=(challengeScores[c.id]||[]).find(x=>x.user_id===userId),other=(challengeScores[c.id]||[]).find(x=>x.user_id!==(userId));return <article className="nc-challenge-card" key={c.id}><div><b>{c.title}</b><small>{gameName(c.game_key)} · meta {c.target_score.toLocaleString('pt-BR')} pts</small></div><span className={'nc-status '+c.status}>{c.status==='active'?'EM ANDAMENTO':c.status==='completed'?'CONCLUÍDO':'ENCERRADO'}</span><div className="nc-challenge-scores"><span>Você <b>{mine?.best_score||0}</b></span><span>Adversário <b>{other?.best_score||0}</b></span></div><small>Prazo: {fmtDateTime(c.ends_at)}{c.winner_id?' · Vencedor definido':''}</small></article>}) :<p className="nc-empty">Você ainda não tem desafios. Convide um amigo para disputar!</p>}</div></div>}
  {!loading&&tab==='medals'&&<div className="nc-medal-grid">{games.map(g=>{const item=medals.find(m=>m.game_key===g.id);return <article className="nc-medal-card" key={g.id}><span>{g.icon}</span><div><b>Campeão · {g.name}</b><small>Medalhas conquistadas neste jogo</small></div><strong>×{item?.medals_count||0}</strong></article>})}{[{id:'global-season',icon:'🌍',name:'Campeão global'},{id:'weekly-tournament',icon:'🏆',name:'Campeão semanal'},{id:'friends-weekly',icon:'👥',name:'Campeão dos amigos'}].map(g=>{const item=rankMedals.find(m=>m.medal_key===g.id);return <article className="nc-medal-card" key={g.id}><span>{g.icon}</span><div><b>{g.name}</b><small>Vitórias em rankings e torneios</small></div><strong>×{item?.medals_count||0}</strong></article>})}<p className="nc-muted">Cada vitória registrada acrescenta uma medalha à sua coleção. Vitórias repetidas não substituem as anteriores.</p></div>}
  {!loading&&tab==='history'&&<div className="nc-panel"><div className="nc-board-caption">SUAS ÚLTIMAS 40 PARTIDAS</div>{matches.length?matches.map(m=><article className="nc-match-row" key={m.id}><span>{games.find(g=>g.id===m.game_key)?.icon||'🎮'}</span><div><b>{gameName(m.game_key)}</b><small>{fmtDateTime(m.played_at)} · {m.mode}</small></div><div className="nc-match-score"><b>{Number(m.score).toLocaleString('pt-BR')} pts</b><small>+{m.xp_earned} XP {m.won?'· 🏅 Vitória':''}</small></div></article>):<p className="nc-empty">Suas partidas aparecerão aqui depois que concluir um jogo compatível.</p>}</div>}
  <div className="nc-footnote"><ShieldCheck size={15}/> Pontuações, medalhas e resultados são registrados na sua conta. O ranking considera os dados salvos no NEXUS.</div>
 </section>;
}
