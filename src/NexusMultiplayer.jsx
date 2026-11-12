import React,{useCallback,useEffect,useState} from 'react';
import {supabase} from './supabase';
import {Swords,Users,Copy,Plus,LogIn,Play,RefreshCw,Trophy,Clock3,CheckCircle2} from 'lucide-react';

const names=['Jogador','Piloto','Comandante','Lenda'];
export default function NexusMultiplayer({userId,onToast=()=>{}}){
 const [room,setRoom]=useState(null),[members,setMembers]=useState([]),[profiles,setProfiles]=useState({}),[answers,setAnswers]=useState([]),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[selected,setSelected]=useState(null),[error,setError]=useState('');
 const me=members.find(x=>x.user_id===userId),question=room?.questions?.[room.current_question],myAnswer=answers.find(x=>x.user_id===userId&&x.question_index===room?.current_question);
 const load=useCallback(async(roomId)=>{
  if(!roomId)return;
  await supabase.rpc('competition_mp_sync_room',{room_id_input:roomId});
  const [{data:r,error:re},{data:m,error:me},{data:a}]=await Promise.all([
   supabase.from('competition_mp_rooms').select('*').eq('id',roomId).maybeSingle(),
   supabase.from('competition_mp_members').select('room_id,user_id,score,joined_at').eq('room_id',roomId).order('joined_at'),
   supabase.from('competition_mp_answers').select('user_id,question_index,is_correct').eq('room_id',roomId)
  ]);
  if(re){setError(re.message);return;}if(me){setError(me.message);return;}
  if(!r){setRoom(null);return;}setRoom(r);setMembers(m||[]);setAnswers(a||[]);const ids=(m||[]).map(x=>x.user_id);if(ids.length){const {data:ps}=await supabase.from('social_profiles').select('user_id,display_name,username,avatar').in('user_id',ids);setProfiles(Object.fromEntries((ps||[]).map(p=>[p.user_id,p])));}else setProfiles({});
 },[]);
 useEffect(()=>{
  if(!room?.id)return;
  load(room.id);
  const ch=supabase.channel('nexus-mp-'+room.id)
   .on('postgres_changes',{event:'*',schema:'public',table:'competition_mp_rooms',filter:'id=eq.'+room.id},()=>load(room.id))
   .on('postgres_changes',{event:'*',schema:'public',table:'competition_mp_members',filter:'room_id=eq.'+room.id},()=>load(room.id))
   .subscribe();
  const timer=window.setInterval(()=>load(room.id),2500);
  return()=>{window.clearInterval(timer);supabase.removeChannel(ch)};
 },[room?.id,load]);
 async function createRoom(){
  setBusy(true);setError('');
  const {data,error:e}=await supabase.rpc('competition_mp_create_room');
  setBusy(false);if(e){setError(e.message);return;}
  await load(data.id);setCode(data.code);onToast('Sala criada! Compartilhe o código com seus amigos.');
 }
 async function joinRoom(e){
  e.preventDefault();if(!code.trim())return;setBusy(true);setError('');
  const {data,error:e1}=await supabase.rpc('competition_mp_join_room',{room_code_input:code.trim().toUpperCase()});
  setBusy(false);if(e1){setError(e1.message);return;}await load(data);onToast('Você entrou na sala!');
 }
 async function start(){
  if(!room)return;setBusy(true);const {error:e}=await supabase.rpc('competition_mp_start_room',{room_id_input:room.id});setBusy(false);
  if(e)setError(e.message);else await load(room.id);
 }
 async function answer(index){
  if(!room||myAnswer||selected!==null)return;setSelected(index);setBusy(true);
  const {data,error:e}=await supabase.rpc('competition_mp_answer',{room_id_input:room.id,selected_index_input:index});
  setBusy(false);setSelected(null);if(e){setError(e.message);return;}
  if(data?.correct)onToast('Resposta certa! +100 pontos');await load(room.id);
 }
 async function leave(){
  // Leaving a live match would invalidate the shared player count, so the room stays available until it finishes.
  setRoom(null);setMembers([]);setProfiles({});setAnswers([]);setCode('');setSelected(null);setError('');
 }
 const copy=async()=>{try{await navigator.clipboard.writeText(room.room_code);onToast('Código copiado!');}catch{onToast('Código da sala: '+room.room_code)}};
 const sorted=members.slice().sort((a,b)=>b.score-a.score);
 return <section className="nc-multiplayer">
  {!room?<div className="nc-mp-landing"><div className="nc-mp-art"><div className="nc-mp-orbit">⚡</div><Swords size={34}/><span>2–4 JOGADORES</span></div><div className="nc-mp-intro"><span className="nc-eyebrow">NEXUS · JOGO EM TEMPO REAL</span><h3>Quiz Battle</h3><p>Monte uma sala, chame seus amigos e disputem 5 perguntas. Cada acerto vale 100 pontos. Vence quem somar mais!</p><div className="nc-mp-actions"><button className="nc-primary" onClick={createRoom} disabled={busy}><Plus size={17}/>{busy?'Criando…':'Criar sala'}</button><form onSubmit={joinRoom}><input value={code} onChange={e=>setCode(e.target.value.toUpperCase().slice(0,6))} placeholder="Código da sala" maxLength={6}/><button type="submit" disabled={busy||code.trim().length!==6}><LogIn size={16}/> Entrar</button></form></div><small>Compartilhe o código de 6 caracteres. Até 4 jogadores podem participar.</small></div></div>:<div className="nc-mp-room">
   <div className="nc-mp-room-head"><div><span className="nc-eyebrow">SALA MULTIPLAYER</span><h3>{room.status==='waiting'?'Aguardando jogadores':room.status==='playing'?'Partida em andamento':'Partida finalizada'}</h3></div><div className="nc-mp-code"><small>CÓDIGO DA SALA</small><b>{room.room_code}</b><button onClick={copy}><Copy size={14}/> Copiar</button></div></div>
   <div className="nc-mp-roster">{sorted.map((p,i)=><div className={'nc-mp-player '+(p.user_id===userId?'is-me':'')} key={p.user_id}><span>{profiles[p.user_id]?.avatar||['👑','🎮','🚀','⚡'][i]}</span><div><b>{p.user_id===userId?'Você':profiles[p.user_id]?.display_name||profiles[p.user_id]?.username||'Jogador '+(i+1)}</b><small>{p.user_id===room.host_id?'Anfitrião':profiles[p.user_id]?.username?'@'+profiles[p.user_id].username:'Na partida'}</small></div><strong>{p.score} pts</strong></div>)}</div>
   {room.status==='waiting'&&<div className="nc-mp-wait"><Users size={24}/><b>{members.length}/4 jogadores</b><p>Envie o código para seus amigos entrarem. O anfitrião inicia quando houver pelo menos 2 jogadores.</p>{room.host_id===userId?<button className="nc-primary" onClick={start} disabled={busy||members.length<2}><Play size={16}/> Iniciar partida</button>:<small>Aguardando o anfitrião iniciar…</small>}</div>}
   {room.status==='playing'&&question&&<div className="nc-mp-question"><div className="nc-mp-progress"><span>PERGUNTA {room.current_question+1} DE {room.questions.length}</span><span><Clock3 size={13}/> Ao vivo</span></div><div className="nc-mp-track"><i style={{width:((room.current_question+1)/room.questions.length*100)+'%'}}/></div><h4>{question.question}</h4><div className="nc-mp-options">{question.options.map((option,i)=><button key={i} className={(myAnswer&&selected===i?'selected':'')} onClick={()=>answer(i)} disabled={!!myAnswer||busy}>{String.fromCharCode(65+i)} <span>{option}</span></button>)}</div>{myAnswer?<p className="nc-mp-waiting"><CheckCircle2 size={16}/> Resposta registrada. Aguardando os outros jogadores…</p>:<small>Escolha uma resposta. A pergunta avança quando todos responderem.</small>}</div>}
   {room.status==='completed'&&<div className="nc-mp-result"><Trophy size={36}/><h3>{sorted[0]?.user_id===userId?'Você venceu!':'Partida concluída!'}</h3><p>{sorted[0]?.user_id===userId?'Mandou bem! Você ficou em primeiro lugar.':'Confira o placar final da partida.'}</p>{sorted.map((p,i)=><div key={p.user_id}><b>{i+1}º · {p.user_id===userId?'Você':'Jogador '+(i+1)}</b><strong>{p.score} pts</strong></div>)}</div>}
   <button className="nc-mp-leave" onClick={leave}>Voltar para a Arena</button>
  </div>}
  {error&&<div className="nc-error">{error}</div>}
 </section>;
}
