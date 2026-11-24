import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {supabase} from './supabase';
import {Zap,MessageCircle,Send,ImagePlus,MoreHorizontal,Trash2,Flag,X,ArrowLeft,CornerUpLeft,LoaderCircle,Pencil,Check,Bookmark,Smile,Clock3,Users,Flame,Plus,ChevronLeft,Video,Eye,Trophy,Target,Gamepad2,Lightbulb,Radio,Link2,Pin,BarChart3,Sparkles,RefreshCw,Heart} from 'lucide-react';
import './nexus-feed-v2.css';

const MAX_IMAGE=5*1024*1024,MAX_VIDEO=20*1024*1024,EMPTY_FRIENDS=[];
/* As chaves das reações continuam sendo as mesmas gravadas no banco; só a apresentação é própria do NEXUS. */
const REACTIONS=[
 {key:'❤️',label:'Apoio',Icon:Heart},
 {key:'🔥',label:'Em chamas',Icon:Flame},
 {key:'👏',label:'Respeito',Icon:Sparkles},
 {key:'💡',label:'Boa ideia',Icon:Lightbulb},
 {key:'😂',label:'Risada',Icon:Smile}
];
const reactionMeta=Object.fromEntries(REACTIONS.map(r=>[r.key,r]));
/* Tipos de sinal: identificados pela hashtag no texto, sem nenhuma coluna nova no banco. */
const KINDS=[
 {key:'conquista',label:'Conquista',tag:'#conquista',Icon:Trophy,aliases:['#conquista','#recorde','#nivel','#nível']},
 {key:'meta',label:'Meta',tag:'#meta',Icon:Target,aliases:['#meta','#objetivo']},
 {key:'jogo',label:'Jogo',tag:'#jogo',Icon:Gamepad2,aliases:['#jogo','#jogos','#arcade']},
 {key:'ideia',label:'Ideia',tag:'#ideia',Icon:Lightbulb,aliases:['#ideia','#dica']}
];
const kindOf=body=>{const tags=(String(body||'').toLowerCase().match(/#[\p{L}\p{N}_]+/gu)||[]);for(const k of KINDS)if(tags.some(t=>k.aliases.includes(t)))return k;return null;};
const timeAgo=value=>{const diff=Math.max(0,Date.now()-new Date(value).getTime()),mins=Math.floor(diff/60000);if(mins<1)return 'agora';if(mins<60)return mins+' min';const hours=Math.floor(mins/60);if(hours<24)return hours+' h';const days=Math.floor(hours/24);return days<7?days+' d':new Date(value).toLocaleDateString('pt-BR');};
const dayLabel=value=>{const d=new Date(value),now=new Date(),start=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime(),diff=Math.round((start(now)-start(d))/86400000);if(diff<=0)return 'Hoje';if(diff===1)return 'Ontem';if(diff<7)return d.toLocaleDateString('pt-BR',{weekday:'long'});return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});};
const initials=name=>String(name||'NX').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
const profileName=p=>p?.display_name||p?.username||'Jogador';
const reactionEntries=post=>Object.entries(post.reactions||{}).filter(([k])=>k!=='mine');

function Avatar({person,frame,size=38,chromatic=false}){
 return <span className={'nxv-av frame-'+(frame||person?.avatar_frame||'violet')+(chromatic?' frame-chromatic':'')} style={{'--s':size+'px'}}>{person?.avatar||initials(profileName(person))}</span>;
}

function PostImageCarousel({images,onDoubleTap}){
 const [active,setActive]=useState(0),[broken,setBroken]=useState({}),track=useRef(null);
 const move=index=>{const next=Math.max(0,Math.min(images.length-1,index));setActive(next);const el=track.current;if(el)el.scrollTo({left:next*el.clientWidth,behavior:'smooth'});};
 if(!images?.length)return null;
 return <div className="nxv-media">
  <div className="nxv-media-track" ref={track} onScroll={e=>{const el=e.currentTarget,w=el.clientWidth||1;setActive(Math.max(0,Math.min(images.length-1,Math.round(el.scrollLeft/w))));}}>
   {images.map((src,i)=>src&&!broken[i]?<img key={i} src={src} alt={images.length>1?'Foto '+(i+1)+' do sinal':'Imagem do sinal'} loading="lazy" decoding="async" draggable="false" onDoubleClick={onDoubleTap} onTouchEnd={onDoubleTap} onError={()=>setBroken(old=>({...old,[i]:true}))}/>:<div key={i} className="nxv-media-missing">Imagem indisponível no momento</div>)}
  </div>
  {images.length>1&&<><button type="button" className="nxv-media-arrow prev" onClick={()=>move(active-1)} aria-label="Foto anterior" disabled={active===0}><ChevronLeft size={18}/></button><button type="button" className="nxv-media-arrow next" onClick={()=>move(active+1)} aria-label="Próxima foto" disabled={active===images.length-1}><ChevronLeft size={18}/></button><span className="nxv-media-count">{active+1}/{images.length}</span><div className="nxv-media-dots">{images.map((_,i)=><button type="button" key={i} className={i===active?'on':''} onClick={()=>move(i)} aria-label={'Ir para foto '+(i+1)}/>)}</div></>}
 </div>;
}

export default function NexusFeed({userId,playerProfile=null,friends=EMPTY_FRIENDS,gameXp=0,onToast=()=>{},onOpenProfile=()=>{}}){
 const [posts,setPosts]=useState([]),[stories,setStories]=useState([]),[draft,setDraft]=useState(''),[kind,setKind]=useState(''),[photo,setPhoto]=useState(null),[photoPreview,setPhotoPreview]=useState(''),[extraPhotos,setExtraPhotos]=useState([]),[extraPhotoPreviews,setExtraPhotoPreviews]=useState([]),[video,setVideo]=useState(null),[videoPreview,setVideoPreview]=useState('');
 const [storyDraft,setStoryDraft]=useState(''),[storyPhoto,setStoryPhoto]=useState(null),[storyPreview,setStoryPreview]=useState('');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [expanded,setExpanded]=useState({}),[comments,setComments]=useState({}),[commentsLoading,setCommentsLoading]=useState({}),[commentDraft,setCommentDraft]=useState('');
 const [replyTo,setReplyTo]=useState(null),[menuPost,setMenuPost]=useState(null),[editingComment,setEditingComment]=useState(null),[editDraft,setEditDraft]=useState('');
 const [editingPost,setEditingPost]=useState(null),[postEditDraft,setPostEditDraft]=useState('');
 const [reportDraft,setReportDraft]=useState(null),[reportLocation,setReportLocation]=useState(''),[reportReason,setReportReason]=useState(''),[reportBusy,setReportBusy]=useState(false);
 const [pollOpen,setPollOpen]=useState(false),[pollQuestion,setPollQuestion]=useState(''),[pollOptions,setPollOptions]=useState(['','']),[activeTag,setActiveTag]=useState('');
 const [feedMode,setFeedMode]=useState('for-you'),[savedIds,setSavedIds]=useState([]),[storyViewer,setStoryViewer]=useState(null),[storyViewers,setStoryViewers]=useState([]),[storyViewersOpen,setStoryViewersOpen]=useState(false),[storyViewersLoading,setStoryViewersLoading]=useState(false),[showStoryComposer,setShowStoryComposer]=useState(false),[reactionPost,setReactionPost]=useState(null),[shareTarget,setShareTarget]=useState(null),[draftNotice,setDraftNotice]=useState(false);
 const lastPostTap=useRef({}),storyTouchStart=useRef(null),composerRef=useRef(null),loadSeq=useRef(0),hashHandled=useRef(false);
 const [viewedStoryIds,setViewedStoryIds]=useState(()=>{try{return new Set(JSON.parse(localStorage.getItem('nexus-viewed-stories-'+userId)||'[]'))}catch{return new Set()}});
 const friendIds=useMemo(()=>new Set(friends.map(x=>x.person?.user_id).filter(Boolean)),[friends]);
 const friendIdsRef=useRef(friendIds);friendIdsRef.current=friendIds;

 useEffect(()=>{if(storyViewer===null)return;const handleKeyDown=e=>{if(e.key==='Escape'){setStoryViewer(null);setStoryViewersOpen(false);}};const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';window.addEventListener('keydown',handleKeyDown);return()=>{document.body.style.overflow=previousOverflow;window.removeEventListener('keydown',handleKeyDown);};},[storyViewer]);
 useEffect(()=>{try{setViewedStoryIds(new Set(JSON.parse(localStorage.getItem('nexus-viewed-stories-'+userId)||'[]')))}catch{setViewedStoryIds(new Set())}},[userId]);

 const loadStoryViewers=async storyId=>{
  if(!storyId)return;setStoryViewersLoading(true);
  const {data,error:e}=await supabase.from('social_story_views').select('viewer_id,viewed_at').eq('story_id',storyId).order('viewed_at',{ascending:false});
  if(e){setError('Não foi possível carregar as visualizações: '+e.message);setStoryViewers([]);setStoryViewersLoading(false);return;}
  const ids=[...new Set((data||[]).map(v=>v.viewer_id))];
  const {data:people,error:pe}=ids.length?await supabase.from('social_profiles').select('user_id,username,display_name,avatar,avatar_frame').in('user_id',ids):{data:[],error:null};
  if(pe){setError(pe.message);setStoryViewers([]);}else{const map=Object.fromEntries((people||[]).map(p=>[p.user_id,p]));setStoryViewers((data||[]).map(v=>({...v,person:map[v.viewer_id]})).filter(v=>v.person));}
  setStoryViewersLoading(false);
 };
 const openStory=async id=>{
  if(!id)return;const selectedStory=stories.find(s=>s.id===id);
  setViewedStoryIds(old=>{const next=new Set(old);next.add(id);try{localStorage.setItem('nexus-viewed-stories-'+userId,JSON.stringify([...next]))}catch{}return next});
  setStoryViewer(id);setStoryViewersOpen(false);
  if(selectedStory?.author_id===userId){await loadStoryViewers(id);}
  else{const {error:e}=await supabase.from('social_story_views').insert({story_id:id,viewer_id:userId});if(e&&e.code!=='23505')console.warn('Registro de visualização do pulso:',e.message);}
 };

 const load=useCallback(async(silent=false)=>{
  if(!userId||!supabase)return;
  const seq=++loadSeq.current;
  if(!silent)setLoading(true);setError('');
  try{
   const [postRes,storyRes,bookmarkRes]=await Promise.all([
    supabase.from('social_posts').select('id,author_id,body,image_path,image_paths,video_path,created_at,updated_at,is_pinned').order('created_at',{ascending:false}).limit(60),
    supabase.from('social_stories').select('id,author_id,body,image_path,created_at,expires_at').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(60),
    supabase.from('social_post_bookmarks').select('post_id').eq('user_id',userId)
   ]);
   for(const r of [postRes,storyRes,bookmarkRes])if(r.error)throw r.error;
   const rows=postRes.data||[],storyRows=storyRes.data||[],ids=[...new Set([...rows.map(p=>p.author_id),...storyRows.map(p=>p.author_id)])];
   const prof=ids.length?await supabase.from('social_profiles').select('user_id,username,display_name,avatar,avatar_frame,card_frame,equipped_gems,is_suspended').in('user_id',ids):{data:[],error:null};
   if(prof.error)throw prof.error;
   const profileMap=Object.fromEntries((prof.data||[]).map(p=>[p.user_id,p]));
   const seen=new Set();
   const visible=rows.filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return profileMap[p.author_id]&&!profileMap[p.author_id].is_suspended;});
   const visibleStories=storyRows.filter(p=>profileMap[p.author_id]&&!profileMap[p.author_id].is_suspended&&(p.author_id===userId||friendIdsRef.current.has(p.author_id)));
   const postIds=visible.map(p=>p.id);
   const none={data:[],error:null};
   const [pollRes,likes,commentRows,mine,reactionRows]=postIds.length?await Promise.all([
    supabase.from('social_post_polls').select('id,post_id,question,options').in('post_id',postIds),
    supabase.from('social_post_likes').select('post_id,user_id').in('post_id',postIds),
    supabase.from('social_post_comments').select('post_id').in('post_id',postIds).is('deleted_at',null),
    supabase.from('social_post_likes').select('post_id').in('post_id',postIds).eq('user_id',userId),
    supabase.from('social_post_reactions').select('post_id,user_id,reaction').in('post_id',postIds)
   ]):[none,none,none,none,none];
   if(pollRes.error)throw pollRes.error;
   const pollIds=(pollRes.data||[]).map(x=>x.id);
   const pollVoteRes=pollIds.length?await supabase.from('social_post_poll_votes').select('poll_id,user_id,option_index').in('poll_id',pollIds):none;
   if(pollVoteRes.error)throw pollVoteRes.error;
   for(const r of [likes,commentRows,mine,reactionRows])if(r.error)throw r.error;
   const likeCounts={},commentCounts={},liked=new Set((mine.data||[]).map(x=>x.post_id)),reactions={},pollMap={};
   (pollRes.data||[]).forEach(p=>{const votes=(pollVoteRes.data||[]).filter(v=>v.poll_id===p.id),opts=Array.isArray(p.options)?p.options:[];const counts=opts.map((_,i)=>votes.filter(v=>v.option_index===i).length);pollMap[p.post_id]={...p,options:opts,counts,total:votes.length,myVote:votes.find(v=>v.user_id===userId)?.option_index??null};});
   (likes.data||[]).forEach(x=>{likeCounts[x.post_id]=(likeCounts[x.post_id]||0)+1;});
   (commentRows.data||[]).forEach(x=>{commentCounts[x.post_id]=(commentCounts[x.post_id]||0)+1;});
   (reactionRows.data||[]).forEach(x=>{reactions[x.post_id] ||= {};reactions[x.post_id][x.reaction]=(reactions[x.post_id][x.reaction]||0)+1;if(x.user_id===userId)reactions[x.post_id].mine=x.reaction;});
   // URLs assinadas em lote evitam dezenas de requisições concorrentes ao Storage.
   const pathsForPost=p=>(Array.isArray(p.image_paths)&&p.image_paths.length?p.image_paths:(p.image_path?[p.image_path]:[])).filter(Boolean);
   const allMediaPaths=[...new Set([...visible.flatMap(p=>[...pathsForPost(p),p.video_path].filter(Boolean)),...visibleStories.map(p=>p.image_path).filter(Boolean)])];
   const signedByPath=new Map();
   if(allMediaPaths.length){
    const {data:batchData,error:batchError}=await supabase.storage.from('nexus-posts').createSignedUrls(allMediaPaths,3600);
    if(batchData)batchData.forEach((item,index)=>{const path=item.path||allMediaPaths[index];if(item.signedUrl)signedByPath.set(path,item.signedUrl);});
    const missing=allMediaPaths.filter(path=>!signedByPath.has(path));
    if(missing.length){
     const fallback=await Promise.all(missing.map(async path=>{const {data,error}=await supabase.storage.from('nexus-posts').createSignedUrl(path,3600);if(error){console.warn('Falha ao gerar URL da mídia do feed:',path,error.message);return [path,''];}return [path,data?.signedUrl||''];}));
     fallback.forEach(([path,url])=>{if(url)signedByPath.set(path,url);});
     if(batchError)console.warn('Algumas URLs do feed precisaram de nova tentativa:',batchError.message);
    }
   }
   const sign=path=>path?signedByPath.get(path)||'':'';
   const withImages=visible.map(p=>{const imagePaths=pathsForPost(p),imageUrls=imagePaths.map(sign);return {...p,author:profileMap[p.author_id],imagePaths,imageUrls,imageUrl:imageUrls[0]||'',videoUrl:sign(p.video_path),likeCount:likeCounts[p.id]||0,commentCount:commentCounts[p.id]||0,liked:liked.has(p.id),reactions:reactions[p.id]||{},poll:pollMap[p.id]||null};});
   const withStories=visibleStories.map(p=>({...p,author:profileMap[p.author_id],imageUrl:sign(p.image_path)}));
   if(seq!==loadSeq.current)return; // uma carga mais nova já foi iniciada: descarta esta resposta antiga
   setPosts(withImages);setStories(withStories);setSavedIds((bookmarkRes.data||[]).map(x=>x.post_id));
  }catch(e){if(seq===loadSeq.current)setError(e.message||'Não foi possível carregar o feed.');}
  finally{if(seq===loadSeq.current)setLoading(false);}
 },[userId]);
 useEffect(()=>{load();},[load]);
 // quando a lista de amigos chega depois, atualiza só os pulsos de amigos
 useEffect(()=>{if(userId&&friendIds.size)load(true);},[friendIds,userId,load]);
 useEffect(()=>{try{const saved=localStorage.getItem('nexus-feed-draft-'+userId);if(saved){const d=JSON.parse(saved);if(d&&d.body){setDraft(d.body);setDraftNotice(true);}}}catch{}},[userId]);
 useEffect(()=>{if(!userId)return;try{if(draft.trim())localStorage.setItem('nexus-feed-draft-'+userId,JSON.stringify({body:draft,updatedAt:Date.now()}));else localStorage.removeItem('nexus-feed-draft-'+userId);}catch{}},[draft,userId]);
 useEffect(()=>{if(loading||hashHandled.current||!window.location.hash.startsWith('#post-'))return;const target=document.getElementById(window.location.hash.slice(1));if(target){hashHandled.current=true;target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('nxv-highlight');}},[loading,posts]);
 useEffect(()=>{if(!userId)return;const channel=supabase.channel('nexus-feed-live-'+userId);let timer;const refreshQuietly=()=>{clearTimeout(timer);timer=setTimeout(()=>load(true),350);};['social_posts','social_post_likes','social_post_comments','social_stories','social_post_reactions','social_post_polls','social_post_poll_votes'].forEach(table=>channel.on('postgres_changes',{event:'*',schema:'public',table},refreshQuietly));channel.subscribe();return()=>{clearTimeout(timer);supabase.removeChannel(channel);};},[userId,load]);
 const previewsRef=useRef({});previewsRef.current={photoPreview,extraPhotoPreviews,storyPreview,videoPreview};
 useEffect(()=>()=>{const p=previewsRef.current;if(p.photoPreview)URL.revokeObjectURL(p.photoPreview);p.extraPhotoPreviews.forEach(URL.revokeObjectURL);if(p.storyPreview)URL.revokeObjectURL(p.storyPreview);if(p.videoPreview)URL.revokeObjectURL(p.videoPreview);},[]);

 const visiblePosts=useMemo(()=>{
  const q=activeTag.toLowerCase();
  let list=posts.filter(p=>(feedMode==='saved'?savedIds.includes(p.id):feedMode==='reels'?!!p.videoUrl:feedMode==='friends'?friendIds.has(p.author_id)||p.author_id===userId:true)&&(!q||(p.body||'').toLowerCase().includes(q)));
  const score=p=>{const age=Math.max(0,(Date.now()-new Date(p.created_at).getTime())/3600000),eng=1+p.likeCount+p.commentCount*2+reactionEntries(p).reduce((a,[,n])=>a+n,0);return eng/Math.pow(age+2,1.2);};
  return [...list].sort((a,b)=>Number(!!b.is_pinned)-Number(!!a.is_pinned)||(feedMode==='for-you'?score(b)-score(a):new Date(b.created_at)-new Date(a.created_at)));
 },[posts,feedMode,savedIds,friendIds,userId,activeTag]);
 const trendingTags=useMemo(()=>{const counts={};posts.forEach(p=>((p.body||'').match(/#[\p{L}\p{N}_]+/gu)||[]).forEach(t=>{const k=t.toLowerCase();counts[k]=(counts[k]||0)+1;}));return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>x[0]);},[posts]);
 const todayCount=useMemo(()=>posts.filter(p=>Date.now()-new Date(p.created_at).getTime()<86400000).length,[posts]);
 const level=Math.floor(Number(gameXp||0)/500)+1,levelPct=Math.round((Number(gameXp||0)%500)/5);

 function choosePhoto(file,kindOfPhoto='post'){if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Use uma imagem JPG, PNG ou WEBP.');return;}if(file.size>MAX_IMAGE){setError('Cada imagem deve ter no máximo 5 MB.');return;}const preview=URL.createObjectURL(file);if(kindOfPhoto==='story'){if(storyPreview)URL.revokeObjectURL(storyPreview);setStoryPhoto(file);setStoryPreview(preview);}setError('');}
 function removePostPhoto(index){if(index===0){if(photoPreview)URL.revokeObjectURL(photoPreview);setPhoto(extraPhotos[0]||null);setPhotoPreview(extraPhotoPreviews[0]||'');setExtraPhotos(old=>old.slice(1));setExtraPhotoPreviews(old=>old.slice(1));}else{const i=index-1;URL.revokeObjectURL(extraPhotoPreviews[i]);setExtraPhotos(old=>old.filter((_,j)=>j!==i));setExtraPhotoPreviews(old=>old.filter((_,j)=>j!==i));}}
 async function uploadImage(file,folder){if(!file)return null;const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg',path=userId+'/'+folder+'/'+crypto.randomUUID()+'.'+ext;const {error:e}=await supabase.storage.from('nexus-posts').upload(path,file,{contentType:file.type,upsert:false});if(e)throw e;return path;}
 function choosePostPhotos(files){const valid=[];for(const file of files){if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Use imagens JPG, PNG ou WEBP.');continue;}if(file.size>MAX_IMAGE){setError('Cada imagem deve ter no máximo 5 MB.');continue;}valid.push(file);}const available=Math.max(0,10-(photo?1:0)-extraPhotos.length),selected=valid.slice(0,available);if(valid.length>available)setError('Você pode adicionar até 10 fotos por sinal.');if(!selected.length)return;const previews=selected.map(file=>URL.createObjectURL(file));if(!photo){setPhoto(selected[0]);setPhotoPreview(previews[0]);setExtraPhotos(old=>[...old,...selected.slice(1)]);setExtraPhotoPreviews(old=>[...old,...previews.slice(1)]);}else{setExtraPhotos(old=>[...old,...selected]);setExtraPhotoPreviews(old=>[...old,...previews]);}if(valid.length<=available)setError('');}
 function chooseVideo(file){if(!file)return;if(!['video/mp4','video/webm','video/quicktime'].includes(file.type)){setError('Use um vídeo MP4, MOV ou WEBM.');return;}if(file.size>MAX_VIDEO){setError('O vídeo deve ter no máximo 20 MB.');return;}if(videoPreview)URL.revokeObjectURL(videoPreview);setVideo(file);setVideoPreview(URL.createObjectURL(file));setError('');}
 async function uploadVideo(file){if(!file)return null;const ext=file.type==='video/webm'?'webm':file.type==='video/quicktime'?'mov':'mp4',path=userId+'/posts/'+crypto.randomUUID()+'.'+ext;const {error:e}=await supabase.storage.from('nexus-posts').upload(path,file,{contentType:file.type,upsert:false});if(e)throw e;return path;}
 const hasMedia=!!(photo||extraPhotos.length||video);
 const pollActive=pollOpen&&pollQuestion.trim()!=='';
 const canPublish=!busy&&(!!draft.trim()||hasMedia||pollActive);
 function useAchievement(){setKind('conquista');setDraft('Cheguei ao nível '+level+' com '+Number(gameXp||0).toLocaleString('pt-BR')+' XP no NEXUS!');setDraftNotice(false);setTimeout(()=>composerRef.current?.focus(),0);}
 async function publish(e){
  e.preventDefault();if(busy)return;
  const question=pollOpen?pollQuestion.trim():'',options=pollOpen?pollOptions.map(x=>x.trim()).filter(Boolean):[];
  let body=draft.trim();const tag=KINDS.find(k=>k.key===kind)?.tag;
  if(tag&&(body||hasMedia)&&!kindOf(body)?.key!==kind){const lower=body.toLowerCase();if(!lower.includes(tag))body=(body?body+'\n':'')+tag;}
  if(!body&&!hasMedia&&!question){setError('Escreva algo, escolha uma mídia ou crie uma enquete.');return;}
  if(body.length>2000)return setError('O sinal pode ter até 2.000 caracteres.');
  if(pollOpen&&(question.length<5||options.length<2||options.length>4)){setError('A enquete precisa de uma pergunta (mín. 5 letras) e de 2 a 4 opções preenchidas.');return;}
  setBusy(true);setError('');
  try{
   const image_paths=await Promise.all([photo,...extraPhotos].filter(Boolean).map(file=>uploadImage(file,'posts'))),image_path=image_paths[0]||null,video_path=await uploadVideo(video);
   const {data:created,error:e1}=await supabase.from('social_posts').insert({author_id:userId,body:body||(question||''),image_path,image_paths,video_path}).select('id').single();
   if(e1){if(image_paths.length||video_path)await supabase.storage.from('nexus-posts').remove([...image_paths,video_path].filter(Boolean));throw e1;}
   if(question){const {error:pollError}=await supabase.from('social_post_polls').insert({post_id:created.id,created_by:userId,question,options});if(pollError){await supabase.from('social_posts').delete().eq('id',created.id);throw pollError;}}
   setDraft('');setKind('');setDraftNotice(false);try{localStorage.removeItem('nexus-feed-draft-'+userId)}catch{}
   setPollOpen(false);setPollQuestion('');setPollOptions(['','']);setPhoto(null);setExtraPhotos([]);setVideo(null);
   if(photoPreview)URL.revokeObjectURL(photoPreview);extraPhotoPreviews.forEach(URL.revokeObjectURL);if(videoPreview)URL.revokeObjectURL(videoPreview);setPhotoPreview('');setExtraPhotoPreviews([]);setVideoPreview('');
   onToast(question?'Sinal e enquete emitidos!':'Sinal emitido!');await load(true);
  }catch(err){setError(err.message||'Não foi possível publicar.');}finally{setBusy(false);}
 }
 async function publishStory(e){e.preventDefault();const body=storyDraft.trim();if(!body&&!storyPhoto||busy)return;setBusy(true);setError('');try{const image_path=await uploadImage(storyPhoto,'stories');const {error:e1}=await supabase.from('social_stories').insert({author_id:userId,body,image_path,expires_at:new Date(Date.now()+24*60*60*1000).toISOString()});if(e1){if(image_path)await supabase.storage.from('nexus-posts').remove([image_path]);throw e1;}setStoryDraft('');setStoryPhoto(null);if(storyPreview)URL.revokeObjectURL(storyPreview);setStoryPreview('');setShowStoryComposer(false);onToast('Pulso emitido por 24 horas!');await load(true);}catch(err){setError(err.message||'Não foi possível publicar o pulso.');}finally{setBusy(false);}}
 async function votePoll(poll,index){if(poll.myVote===index)return;setPosts(old=>old.map(p=>p.poll?.id===poll.id?{...p,poll:{...p.poll,counts:p.poll.counts.map((n,i)=>n+(i===index?1:0)-(i===poll.myVote?1:0)),total:p.poll.total+(poll.myVote===null?1:0),myVote:index}}:p));const {error:e}=await supabase.from('social_post_poll_votes').upsert({poll_id:poll.id,user_id:userId,option_index:index},{onConflict:'poll_id,user_id'});if(e){setError(e.message);load(true);}}
 async function toggleLike(post){setPosts(old=>old.map(p=>p.id===post.id?{...p,liked:!p.liked,likeCount:Math.max(0,p.likeCount+(p.liked?-1:1))}:p));const result=post.liked?await supabase.from('social_post_likes').delete().eq('post_id',post.id).eq('user_id',userId):await supabase.from('social_post_likes').insert({post_id:post.id,user_id:userId});if(result.error&&result.error.code!=='23505'){setError(result.error.message);load(true);}else if(!post.liked){supabase.functions.invoke('nexus-push',{body:{type:'post_like',post_id:post.id}}).catch(e=>console.warn('Push do Feed:',e?.message||e));}}
 async function toggleBookmark(post){const saved=savedIds.includes(post.id);setSavedIds(old=>saved?old.filter(x=>x!==post.id):[...old,post.id]);const result=saved?await supabase.from('social_post_bookmarks').delete().eq('post_id',post.id).eq('user_id',userId):await supabase.from('social_post_bookmarks').insert({post_id:post.id,user_id:userId});if(result.error&&result.error.code!=='23505'){setError(result.error.message);load(true);}else onToast(saved?'Sinal removido dos salvos.':'Sinal salvo.');}
 async function setReaction(post,reaction){
  const mine=post.reactions?.mine;setReactionPost(null);
  setPosts(old=>old.map(p=>{if(p.id!==post.id)return p;const r={...p.reactions};if(mine){r[mine]=Math.max(0,(r[mine]||1)-1);if(!r[mine])delete r[mine];}if(mine===reaction)delete r.mine;else{r[reaction]=(r[reaction]||0)+1;r.mine=reaction;}return {...p,reactions:r};}));
  const result=mine===reaction?await supabase.from('social_post_reactions').delete().eq('post_id',post.id).eq('user_id',userId):await supabase.from('social_post_reactions').upsert({post_id:post.id,user_id:userId,reaction},{onConflict:'post_id,user_id'});
  if(result.error){setError(result.error.message);load(true);}else if(mine!==reaction)supabase.functions.invoke('nexus-push',{body:{type:'post_reaction',post_id:post.id}}).catch(e=>console.warn('Push da reação:',e?.message||e));
 }
 async function shareToFriend(person,post){if(!person?.user_id||!post)return;setBusy(true);try{const {data:conversationId,error:e1}=await supabase.rpc('social_start_private_chat',{target_user:person.user_id});if(e1)throw e1;const url=window.location.origin+window.location.pathname+'#post-'+post.id;const {data:message,error:e2}=await supabase.from('social_messages').insert({conversation_id:conversationId,sender_id:userId,body:'[NEXUS_POST_SHARE] '+url}).select('id').single();if(e2)throw e2;await supabase.functions.invoke('nexus-push',{body:{type:'message',record_id:message.id}}).catch(()=>{});setShareTarget(null);onToast('Sinal enviado para '+profileName(person)+'.');}catch(err){setError(err.message||'Não foi possível enviar o sinal.');}finally{setBusy(false);}}
 async function sharePost(post){const url=window.location.origin+window.location.pathname+'#post-'+post.id;setMenuPost(null);try{if(navigator.share)await navigator.share({title:'NEXUS Sinais',text:post.body||'Confira este sinal no NEXUS',url});else{await navigator.clipboard.writeText(url);onToast('Link do sinal copiado!');}}catch(err){if(err?.name!=='AbortError')setError('Não foi possível compartilhar este sinal.');}}
 async function savePostEdit(post){const body=postEditDraft.trim();if(!body&&!post.image_path&&!post.image_paths?.length&&!post.video_path)return setError('O sinal precisa ter texto ou mídia.');setBusy(true);const {error:e}=await supabase.from('social_posts').update({body,updated_at:new Date().toISOString()}).eq('id',post.id).eq('author_id',userId);if(e)setError(e.message);else{setEditingPost(null);setPostEditDraft('');onToast('Sinal atualizado.');await load(true);}setBusy(false);}
 async function togglePinPost(post){const {error:e}=await supabase.from('social_posts').update({is_pinned:!post.is_pinned}).eq('id',post.id).eq('author_id',userId);if(e)setError(e.message);else{onToast(post.is_pinned?'Sinal desafixado.':'Sinal fixado no topo.');await load(true);}}
 async function deletePost(post){setMenuPost(null);if(!window.confirm('Excluir este sinal?'))return;const {error:e}=await supabase.from('social_posts').delete().eq('id',post.id).eq('author_id',userId);if(e)setError(e.message);else{if(post.image_path||post.video_path||post.image_paths?.length)await supabase.storage.from('nexus-posts').remove([...new Set([...(post.image_paths||[]),post.image_path,post.video_path].filter(Boolean))]);setPosts(old=>old.filter(p=>p.id!==post.id));onToast('Sinal excluído.');}}
 function reportPost(post){setReportDraft({kind:'publication',postId:post.id,commentId:null,label:'sinal'});setReportLocation('');setReportReason('');setMenuPost(null);}
 async function loadComments(postId){setCommentsLoading(old=>({...old,[postId]:true}));try{const {data,error:e}=await supabase.from('social_post_comments').select('id,post_id,author_id,parent_comment_id,body,created_at,deleted_at').eq('post_id',postId).is('deleted_at',null).order('created_at',{ascending:true}).limit(100);if(e){setError(e.message);return;}const ids=[...new Set((data||[]).map(c=>c.author_id))],commentIds=(data||[]).map(c=>c.id),[profiles,likes]=await Promise.all([ids.length?supabase.from('social_profiles').select('user_id,username,display_name,avatar,avatar_frame').in('user_id',ids):Promise.resolve({data:[],error:null}),commentIds.length?supabase.from('social_post_comment_likes').select('comment_id,user_id').in('comment_id',commentIds):Promise.resolve({data:[],error:null})]);if(profiles.error){setError(profiles.error.message);return;}if(likes.error){setError('Não foi possível carregar as curtidas dos comentários. Execute a atualização do banco de dados do NEXUS Social.');return;}const map=Object.fromEntries((profiles.data||[]).map(p=>[p.user_id,p])),counts={},mine=new Set();(likes.data||[]).forEach(l=>{counts[l.comment_id]=(counts[l.comment_id]||0)+1;if(l.user_id===userId)mine.add(l.comment_id);});setComments(old=>({...old,[postId]:(data||[]).map(c=>({...c,author:map[c.author_id],likeCount:counts[c.id]||0,likedByMe:mine.has(c.id)}))}));}finally{setCommentsLoading(old=>({...old,[postId]:false}));}}
 async function toggleCommentLike(comment){const wasLiked=!!comment.likedByMe;setComments(old=>({...old,[comment.post_id]:(old[comment.post_id]||[]).map(c=>c.id===comment.id?{...c,likedByMe:!wasLiked,likeCount:Math.max(0,(c.likeCount||0)+(wasLiked?-1:1))}:c)}));const result=wasLiked?await supabase.from('social_post_comment_likes').delete().eq('comment_id',comment.id).eq('user_id',userId):await supabase.from('social_post_comment_likes').insert({comment_id:comment.id,user_id:userId});if(result.error&&result.error.code!=='23505'){setError(result.error.message);await loadComments(comment.post_id);}}
 function handlePostDoubleTap(post,event){const now=Date.now();if(event?.type==='touchend'){const previous=lastPostTap.current[post.id]||0;lastPostTap.current[post.id]=now;if(now-previous<320){if(!post.liked)toggleLike(post);}}else{if(now-(lastPostTap.current[post.id]||0)<500)return;if(!post.liked)toggleLike(post);}}
 async function toggleComments(postId){const next=!expanded[postId];setExpanded(old=>({...old,[postId]:next}));if(next&&!comments[postId])await loadComments(postId);}
 async function sendComment(postId,e){e.preventDefault();const body=commentDraft.trim();if(!body||busy)return;setBusy(true);const {data:comment,error:e1}=await supabase.from('social_post_comments').insert({post_id:postId,author_id:userId,body,parent_comment_id:replyTo?.postId===postId?replyTo.id:null}).select('id').single();if(e1)setError(e1.message);else{setCommentDraft('');setReplyTo(null);setPosts(old=>old.map(p=>p.id===postId?{...p,commentCount:p.commentCount+1}:p));await supabase.functions.invoke('nexus-push',{body:{type:'post_comment',record_id:comment.id}}).catch(err=>console.warn('Push do comentário:',err?.message||err));await loadComments(postId);}setBusy(false);}
 async function saveCommentEdit(comment){const body=editDraft.trim();if(!body)return setError('O comentário não pode ficar vazio.');const {error:e}=await supabase.from('social_post_comments').update({body}).eq('id',comment.id).eq('author_id',userId);if(e)setError(e.message);else{setEditingComment(null);setEditDraft('');await loadComments(comment.post_id);onToast('Comentário atualizado.');}}
 async function deleteComment(comment){const {error:e}=await supabase.from('social_post_comments').update({deleted_at:new Date().toISOString()}).eq('id',comment.id).eq('author_id',userId);if(e)setError(e.message);else{setPosts(old=>old.map(p=>p.id===comment.post_id?{...p,commentCount:Math.max(0,p.commentCount-1)}:p));await loadComments(comment.post_id);}}
 function reportComment(comment){setReportDraft({kind:'comment',postId:comment.post_id,commentId:comment.id,label:'comentário'});setReportLocation('');setReportReason('');}
 async function submitReport(e){e.preventDefault();if(!reportDraft||!userId||!reportLocation.trim()||!reportReason.trim()||reportBusy)return;const targetComment=!!reportDraft.commentId,targetId=targetComment?reportDraft.commentId:reportDraft.postId;if(!targetId){setError('Não foi possível identificar o conteúdo denunciado. Feche e tente novamente.');return;}setReportBusy(true);try{const details=('Página ou link: '+reportLocation.trim()+'\nMotivo: '+reportReason.trim()).slice(0,1000);const payload={reporter_id:userId,post_id:targetComment?null:reportDraft.postId,comment_id:targetComment?reportDraft.commentId:null,details};const {error:e2}=await supabase.from('social_post_reports').insert(payload);if(e2)throw e2;onToast('Denúncia enviada para análise. Obrigado por ajudar a comunidade.');setReportDraft(null);setReportLocation('');setReportReason('');setError('');}catch(err){console.error('Falha ao enviar denúncia:',err);setError('Não foi possível enviar a denúncia agora. Tente novamente.');}finally{setReportBusy(false);}}

 const renderBody=body=>String(body||'').split(/(#[\p{L}\p{N}_]+)/gu).map((part,i)=>part.startsWith('#')?<button type="button" className="nxv-tag" key={i} onClick={()=>setActiveTag(part.toLowerCase())}>{part}</button>:<React.Fragment key={i}>{part}</React.Fragment>);
 const personButton=(person,extra)=><button type="button" className="nxv-who" onClick={()=>onOpenProfile(person)}><Avatar person={person} chromatic={(person?.equipped_gems||[]).length===4}/><span><b>{profileName(person)}</b><small>@{person?.username||'jogador'}{extra}</small></span></button>;

 const tabs=[['for-you','Para você',Flame],['recent','Recentes',Clock3],['friends','Amigos',Users],['reels','Vídeos',Video],['saved','Salvos',Bookmark]];
 const ownStories=stories.filter(s=>s.author_id===userId),otherAuthors=[...new Map(stories.filter(s=>s.author_id!==userId).map(s=>[s.author_id,s])).values()];
 const storyGroupUnseen=authorId=>stories.some(s=>s.author_id===authorId&&!viewedStoryIds.has(s.id));
 const firstStoryOf=authorId=>{const list=stories.filter(s=>s.author_id===authorId);return list.find(s=>!viewedStoryIds.has(s.id))||list[0];};

 const renderPost=(post,i,list)=>{
  const k=kindOf(post.body),KIcon=k?.Icon,reacts=reactionEntries(post),mineReaction=post.reactions?.mine,saved=savedIds.includes(post.id);
  const group=post.is_pinned?'Fixados':dayLabel(post.created_at),prevGroup=i>0?(list[i-1].is_pinned?'Fixados':dayLabel(list[i-1].created_at)):null;
  const showDay=feedMode!=='for-you'&&group!==prevGroup;
  const bodyText=post.poll&&post.body===post.poll.question?'':post.body;
  return <React.Fragment key={post.id}>
   {showDay&&<div className="nxv-day"><span>{group}</span></div>}
   <article className={'nxv-sig'+(k?' kind-'+k.key:'')+(post.is_pinned?' pinned':'')} id={'post-'+post.id}>
    <i className="nxv-node" aria-hidden="true"/>
    {k&&<div className="nxv-kind"><KIcon size={14}/><b>{k.label}</b></div>}
    <header className="nxv-sig-head">
     {personButton(post.author,' · '+timeAgo(post.created_at)+(post.updated_at&&new Date(post.updated_at)-new Date(post.created_at)>5000?' · editado':''))}
     {post.is_pinned&&<span className="nxv-pin" title="Fixado"><Pin size={13}/></span>}
     <div className="nxv-menu-wrap"><button type="button" className="nxv-icon-btn" aria-label="Mais opções" aria-expanded={menuPost===post.id} onClick={()=>setMenuPost(menuPost===post.id?null:post.id)}><MoreHorizontal size={20}/></button>
      {menuPost===post.id&&<div className="nxv-menu" role="menu"><button type="button" onClick={()=>sharePost(post)}><Link2 size={15}/> Compartilhar link</button><button type="button" onClick={()=>{setShareTarget(post);setMenuPost(null);}}><Send size={15}/> Enviar no chat</button>{post.author_id===userId?<><button type="button" onClick={()=>{setEditingPost(post.id);setPostEditDraft(post.body||'');setMenuPost(null)}}><Pencil size={15}/> Editar</button><button type="button" onClick={()=>{togglePinPost(post);setMenuPost(null)}}><Pin size={15}/> {post.is_pinned?'Desafixar':'Fixar no topo'}</button><button type="button" className="danger" onClick={()=>deletePost(post)}><Trash2 size={15}/> Excluir</button></>:<button type="button" className="danger" onClick={()=>reportPost(post)}><Flag size={15}/> Denunciar</button>}</div>}
     </div>
    </header>
    {editingPost===post.id?<div className="nxv-edit"><textarea value={postEditDraft} maxLength={2000} rows={3} onChange={e=>setPostEditDraft(e.target.value)} aria-label="Editar sinal"/><div><button type="button" className="nxv-btn primary" onClick={()=>savePostEdit(post)} disabled={busy}><Check size={15}/> Salvar</button><button type="button" className="nxv-btn" onClick={()=>setEditingPost(null)}><X size={15}/> Cancelar</button></div></div>:bodyText?<p className="nxv-body">{renderBody(bodyText)}</p>:null}
    {post.imageUrls?.length>0&&<PostImageCarousel images={post.imageUrls} onDoubleTap={e=>handlePostDoubleTap(post,e)}/>}
    {post.videoUrl&&<video className="nxv-video" src={post.videoUrl} controls playsInline preload="metadata" onDoubleClick={e=>handlePostDoubleTap(post,e)} onTouchEnd={e=>handlePostDoubleTap(post,e)}/>}
    {post.poll&&<div className="nxv-poll"><div className="nxv-poll-q"><BarChart3 size={15}/><b>{post.poll.question}</b></div>{post.poll.options.map((option,index)=>{const count=post.poll.counts[index]||0,pct=post.poll.total?Math.round(count/post.poll.total*100):0;return <button type="button" key={index} className={'nxv-poll-opt'+(post.poll.myVote===index?' voted':'')} onClick={()=>votePoll(post.poll,index)} disabled={post.poll.myVote!==null}><i style={{width:pct+'%'}}/><span>{option}</span><small>{post.poll.myVote!==null?pct+'% · '+count:'Votar'}</small></button>})}<small className="nxv-poll-foot">{post.poll.total} {post.poll.total===1?'voto':'votos'}</small></div>}
    {reacts.length>0&&<div className="nxv-reacts">{reacts.map(([r,n])=>{const M=reactionMeta[r];return <span key={r} className={mineReaction===r?'mine':''}>{M?<M.Icon size={13}/>:<span>{r}</span>}{n}</span>})}</div>}
    <footer className="nxv-bar">
     <button type="button" className={'nxv-act energy'+(post.liked?' on':'')} onClick={()=>toggleLike(post)} aria-pressed={!!post.liked} aria-label="Dar energia"><Zap size={18} fill={post.liked?'currentColor':'none'}/><span>{post.likeCount>0?post.likeCount.toLocaleString('pt-BR'):'Energia'}</span></button>
     <button type="button" className={'nxv-act'+(expanded[post.id]?' on':'')} onClick={()=>toggleComments(post.id)} aria-expanded={!!expanded[post.id]} aria-label="Comentários"><MessageCircle size={18}/><span>{post.commentCount>0?post.commentCount:'Comentar'}</span></button>
     <button type="button" className={'nxv-act icon'+(mineReaction?' on':'')} onClick={()=>setReactionPost(reactionPost===post.id?null:post.id)} aria-label="Reagir" aria-expanded={reactionPost===post.id}>{mineReaction&&reactionMeta[mineReaction]?(()=>{const M=reactionMeta[mineReaction];return <M.Icon size={18}/>})():<Smile size={18}/>}</button>
     <button type="button" className={'nxv-act icon'+(saved?' on':'')} onClick={()=>toggleBookmark(post)} aria-pressed={saved} aria-label={saved?'Remover dos salvos':'Salvar'}><Bookmark size={18} fill={saved?'currentColor':'none'}/></button>
    </footer>
    {reactionPost===post.id&&<div className="nxv-picker" role="group" aria-label="Reagir">{REACTIONS.map(({key,label,Icon})=><button type="button" key={key} className={mineReaction===key?'on':''} onClick={()=>setReaction(post,key)}><Icon size={18}/><span>{label}</span></button>)}</div>}
    {expanded[post.id]&&<div className="nxv-comments">
     {commentsLoading[post.id]&&!(comments[post.id]||[]).length?<p className="nxv-hint"><LoaderCircle size={14} className="nxv-spin"/> Carregando comentários...</p>:(comments[post.id]||[]).length===0?<p className="nxv-hint">Nenhum comentário ainda. Seja o primeiro a responder.</p>:<div className="nxv-comment-list">{(comments[post.id]||[]).map(c=><div className={'nxv-comment'+(c.parent_comment_id?' reply':'')} key={c.id}>
      <Avatar person={c.author} size={30}/>
      <div className="nxv-comment-main"><div className="nxv-comment-name"><b>{profileName(c.author)}</b><small>{timeAgo(c.created_at)}</small></div>
       {editingComment===c.id?<><textarea className="nxv-comment-edit" value={editDraft} maxLength={1000} onChange={e=>setEditDraft(e.target.value)} aria-label="Editar comentário"/><div className="nxv-comment-tools"><button type="button" onClick={()=>saveCommentEdit(c)}><Check size={14}/> Salvar</button><button type="button" onClick={()=>setEditingComment(null)}><X size={14}/> Cancelar</button></div></>:<><p>{c.body}</p><div className="nxv-comment-tools"><button type="button" className={c.likedByMe?'on':''} onClick={()=>toggleCommentLike(c)} aria-label={c.likedByMe?'Remover energia do comentário':'Dar energia ao comentário'}><Zap size={14} fill={c.likedByMe?'currentColor':'none'}/> {c.likeCount||0}</button><button type="button" onClick={()=>setReplyTo({id:c.id,postId:post.id,name:profileName(c.author)})}><CornerUpLeft size={14}/> Responder</button>{c.author_id===userId?<><button type="button" onClick={()=>{setEditingComment(c.id);setEditDraft(c.body)}} aria-label="Editar comentário"><Pencil size={14}/></button><button type="button" onClick={()=>deleteComment(c)} aria-label="Excluir comentário"><Trash2 size={14}/></button></>:<button type="button" onClick={()=>reportComment(c)} aria-label="Denunciar comentário"><Flag size={14}/></button>}</div></>}
      </div></div>)}</div>}
     {replyTo?.postId===post.id&&<div className="nxv-replying">Respondendo a {replyTo.name}<button type="button" onClick={()=>setReplyTo(null)} aria-label="Cancelar resposta"><X size={14}/></button></div>}
     <form className="nxv-comment-form" onSubmit={e=>sendComment(post.id,e)}><input value={commentDraft} onChange={e=>setCommentDraft(e.target.value)} maxLength={1000} placeholder="Escreva um comentário..." aria-label="Comentário"/><button type="submit" disabled={busy||!commentDraft.trim()} aria-label="Enviar comentário"><Send size={17}/></button></form>
    </div>}
   </article>
  </React.Fragment>;
 };

 const activeKind=KINDS.find(x=>x.key===kind);
 const storyOpen=storyViewer!==null?stories.find(s=>s.id===storyViewer):null;
 return <section className="nxv nxv-feed" aria-label="Sinais da comunidade">
  <header className="nxv-head"><div><span className="nxv-eyebrow"><Radio size={13}/> NEXUS · SINAIS</span><h2>Sinais</h2><p>A linha do tempo da comunidade: conquistas, metas e ideias.</p></div><span className="nxv-live" title="Sinais das últimas 24 horas"><i/>{todayCount} hoje</span></header>

  <section className="nxv-pulses" aria-label="Pulsos de 24 horas"><div className="nxv-rail">
   <button type="button" className="nxv-pulse add" onClick={()=>setShowStoryComposer(v=>!v)} aria-expanded={showStoryComposer}><span className="nxv-pulse-ring"><Plus size={20}/></span><b>Novo pulso</b></button>
   {ownStories.length>0&&<button type="button" className={'nxv-pulse'+(storyGroupUnseen(userId)?' unseen':' seen')} onClick={()=>openStory(firstStoryOf(userId).id)}><span className="nxv-pulse-ring"><Avatar person={playerProfile} frame={playerProfile?.frame} size={48}/></span><b>Seu pulso</b></button>}
   {otherAuthors.map(s=><button type="button" key={s.author_id} className={'nxv-pulse'+(storyGroupUnseen(s.author_id)?' unseen':' seen')} onClick={()=>openStory(firstStoryOf(s.author_id).id)}><span className="nxv-pulse-ring"><Avatar person={s.author} size={48}/></span><b>{profileName(s.author)}</b></button>)}
   {!otherAuthors.length&&!ownStories.length&&<p className="nxv-rail-hint">Pulsos de você e de seus amigos aparecem aqui por 24 horas.</p>}
  </div></section>
  {showStoryComposer&&<form className="nxv-sheet-form" onSubmit={publishStory}><div className="nxv-sheet-head"><b>Novo pulso</b><button type="button" className="nxv-icon-btn" onClick={()=>setShowStoryComposer(false)} aria-label="Fechar"><X size={18}/></button></div><textarea value={storyDraft} onChange={e=>setStoryDraft(e.target.value)} maxLength={240} rows={2} placeholder="Um momento rápido, some em 24 horas..." aria-label="Texto do pulso"/>{storyPreview&&<img className="nxv-story-preview" src={storyPreview} alt="Prévia do pulso" loading="lazy" decoding="async"/>}<div className="nxv-sheet-foot"><label className="nxv-tool"><ImagePlus size={18}/><span>Foto</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{choosePhoto(e.target.files?.[0],'story');e.target.value='';}}/></label><small>{storyDraft.length}/240</small><button type="submit" className="nxv-btn primary" disabled={busy||(!storyDraft.trim()&&!storyPhoto)}>{busy?<LoaderCircle size={16} className="nxv-spin"/>:<Zap size={16}/>} Emitir</button></div></form>}

  <form className="nxv-composer" onSubmit={publish}>
   <div className="nxv-compose-row"><Avatar person={playerProfile} frame={playerProfile?.frame} chromatic={(playerProfile?.gems||[]).length===4} size={40}/><textarea ref={composerRef} value={draft} onChange={e=>{setDraft(e.target.value);setDraftNotice(false)}} maxLength={2000} rows={2} placeholder="Emita um sinal: o que você conquistou hoje?" aria-label="Novo sinal"/></div>
   <div className="nxv-kinds" role="group" aria-label="Tipo de sinal">{KINDS.map(({key,label,Icon})=><button type="button" key={key} className={'nxv-chip kind-'+key+(kind===key?' on':'')} aria-pressed={kind===key} onClick={()=>setKind(kind===key?'':key)}><Icon size={14}/>{label}</button>)}</div>
   {Number(gameXp)>0&&<button type="button" className="nxv-xp" onClick={useAchievement}><span className="nxv-xp-level">Nv {level}</span><span className="nxv-xp-bar"><i style={{width:Math.max(4,levelPct)+'%'}}/></span><span className="nxv-xp-cta"><Trophy size={14}/> Compartilhar nível</span></button>}
   {photoPreview&&<div className="nxv-previews">{[photoPreview,...extraPhotoPreviews].map((src,i)=><div className="nxv-preview" key={src}><img src={src} alt={'Prévia da foto '+(i+1)} loading="lazy" decoding="async"/><button type="button" onClick={()=>removePostPhoto(i)} aria-label="Remover foto"><X size={15}/></button></div>)}</div>}
   {videoPreview&&<div className="nxv-preview wide"><video src={videoPreview} controls playsInline preload="metadata"/><button type="button" onClick={()=>{setVideo(null);URL.revokeObjectURL(videoPreview);setVideoPreview('')}} aria-label="Remover vídeo"><X size={15}/></button></div>}
   {draftNotice&&<div className="nxv-notice"><span>Rascunho recuperado automaticamente</span><button type="button" onClick={()=>{setDraft('');setDraftNotice(false)}}>Descartar</button></div>}
   {pollOpen&&<div className="nxv-poll-edit"><input value={pollQuestion} onChange={e=>setPollQuestion(e.target.value)} maxLength={180} placeholder="Qual é a pergunta da enquete?" aria-label="Pergunta da enquete"/>{pollOptions.map((option,i)=><div key={i}><input value={option} onChange={e=>setPollOptions(old=>old.map((x,j)=>j===i?e.target.value:x))} maxLength={80} placeholder={'Opção '+(i+1)} aria-label={'Opção '+(i+1)}/>{pollOptions.length>2&&<button type="button" onClick={()=>setPollOptions(old=>old.filter((_,j)=>j!==i))} aria-label={'Remover opção '+(i+1)}><X size={15}/></button>}</div>)}<div className="nxv-poll-edit-foot"><small>2 a 4 opções · voto único</small>{pollOptions.length<4&&<button type="button" onClick={()=>setPollOptions(old=>[...old,''])}><Plus size={14}/> Opção</button>}</div></div>}
   <div className="nxv-compose-foot">
    <div className="nxv-tools">
     <label className="nxv-tool" title="Adicionar fotos"><ImagePlus size={20}/><span className="sr">Foto</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{choosePostPhotos(Array.from(e.target.files||[]));e.target.value='';}}/></label>
     <label className="nxv-tool" title="Adicionar vídeo"><Video size={20}/><span className="sr">Vídeo</span><input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e=>{chooseVideo(e.target.files?.[0]);e.target.value='';}}/></label>
     <button type="button" className={'nxv-tool'+(pollOpen?' on':'')} onClick={()=>setPollOpen(v=>!v)} aria-pressed={pollOpen} title="Criar enquete"><BarChart3 size={20}/><span className="sr">Enquete</span></button>
    </div>
    <small className="nxv-count">{draft.length>1500?draft.length+'/2000':activeKind?activeKind.tag:''}</small>
    <button type="submit" className="nxv-btn primary send" disabled={!canPublish}>{busy?<LoaderCircle size={16} className="nxv-spin"/>:<Zap size={16}/>} Emitir sinal</button>
   </div>
  </form>

  <nav className="nxv-tabs" aria-label="Filtros do feed">{tabs.map(([key,label,Icon])=><button type="button" key={key} className={feedMode===key?'on':''} aria-pressed={feedMode===key} onClick={()=>setFeedMode(key)}><Icon size={15}/>{label}</button>)}</nav>
  {(trendingTags.length>0||activeTag)&&<div className="nxv-tags" aria-label="Em alta">{activeTag&&<button type="button" className="on clear" onClick={()=>setActiveTag('')}>{activeTag} <X size={13}/></button>}{trendingTags.filter(t=>t!==activeTag).map(tag=><button type="button" key={tag} onClick={()=>setActiveTag(tag)}>{tag}</button>)}</div>}
  {error&&<div className="nxv-error" role="alert"><span>{error}</span><button type="button" onClick={()=>load()} aria-label="Tentar novamente"><RefreshCw size={15}/></button><button type="button" onClick={()=>setError('')} aria-label="Fechar aviso"><X size={15}/></button></div>}

  {loading?<div className="nxv-skeleton" aria-busy="true" aria-label="Carregando sinais">{[0,1,2].map(i=><div key={i}><span/><span/><span/></div>)}</div>
  :visiblePosts.length===0?<div className="nxv-empty"><span className="nxv-empty-icon">{feedMode==='saved'?<Bookmark size={26}/>:feedMode==='reels'?<Video size={26}/>:feedMode==='friends'?<Users size={26}/>:<Radio size={26}/>}</span>
   <h3>{activeTag?'Nenhum sinal com '+activeTag:feedMode==='saved'?'Nada salvo ainda':feedMode==='reels'?'Nenhum vídeo por aqui':feedMode==='friends'?'Seus amigos ainda não emitiram sinais':'Tudo calmo por aqui'}</h3>
   <p>{activeTag?'Tente outra hashtag ou limpe o filtro.':feedMode==='saved'?'Toque no marcador de um sinal para guardá-lo.':feedMode==='reels'?'Vídeos da comunidade aparecem aqui.':feedMode==='friends'?'Adicione amigos ou emita o primeiro sinal.':'Seja o primeiro a emitir um sinal: uma conquista, uma meta ou uma ideia.'}</p>
   {activeTag?<button type="button" className="nxv-btn" onClick={()=>setActiveTag('')}>Limpar filtro</button>:<button type="button" className="nxv-btn primary" onClick={()=>{setFeedMode('for-you');composerRef.current?.focus();composerRef.current?.scrollIntoView({behavior:'smooth',block:'center'});}}><Zap size={16}/> Emitir sinal</button>}</div>
  :<div className="nxv-timeline">{visiblePosts.map(renderPost)}<div className="nxv-end">Fim da linha do tempo</div></div>}
  <footer className="nxv-footer">Conteúdo da comunidade · pulsos somem em 24 horas · não publique dados pessoais ou financeiros</footer>

  {reportDraft&&(reportDraft.postId||reportDraft.commentId)&&<div className="nxv-backdrop" onClick={()=>!reportBusy&&setReportDraft(null)}><form className="nxv-sheet" onSubmit={submitReport} onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Denunciar"><header><div><b>Denunciar {reportDraft.label}</b><small>Ajude a manter o NEXUS seguro.</small></div><button type="button" className="nxv-icon-btn" onClick={()=>setReportDraft(null)} disabled={reportBusy} aria-label="Fechar"><X size={18}/></button></header><label>Página, área ou link relacionado<input required value={reportLocation} onChange={e=>setReportLocation(e.target.value)} maxLength={500} placeholder="Ex.: Feed, perfil @usuario ou https://..."/></label><label>O que aconteceu?<textarea required value={reportReason} onChange={e=>setReportReason(e.target.value)} maxLength={1000} rows={4} placeholder="Explique o motivo com detalhes."/></label><p>O link/área e o motivo serão enviados somente à equipe de moderação.</p><div className="nxv-sheet-actions"><button type="button" className="nxv-btn" onClick={()=>setReportDraft(null)} disabled={reportBusy}>Cancelar</button><button type="submit" className="nxv-btn primary" disabled={reportBusy||!reportLocation.trim()||!reportReason.trim()}>{reportBusy?'Enviando…':'Enviar denúncia'}</button></div></form></div>}
  {shareTarget&&<div className="nxv-backdrop" onClick={()=>setShareTarget(null)}><section className="nxv-sheet" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Enviar sinal"><header><div><b>Enviar no chat</b><small>Escolha um amigo para receber este sinal.</small></div><button type="button" className="nxv-icon-btn" onClick={()=>setShareTarget(null)} aria-label="Fechar"><X size={18}/></button></header><div className="nxv-share-list">{friends.map(f=>f.person).filter(Boolean).map(person=><button type="button" key={person.user_id} onClick={()=>shareToFriend(person,shareTarget)} disabled={busy}><Avatar person={person} size={36}/><span><b>{profileName(person)}</b><small>@{person.username}</small></span><Send size={16}/></button>)}</div>{!friends.length&&<p className="nxv-hint">Adicione amigos para enviar sinais por conversa privada.</p>}</section></div>}
  {storyOpen&&(()=>{const story=storyOpen,authorStories=stories.filter(s=>s.author_id===story.author_id).slice().reverse(),storyIndex=authorStories.findIndex(s=>s.id===story.id),previous=authorStories[storyIndex-1],next=authorStories[storyIndex+1];const close=()=>{setStoryViewer(null);setStoryViewersOpen(false);};
   return <div className="nxv-viewer" onClick={close} role="dialog" aria-modal="true" aria-label="Pulso">
    <article onClick={e=>e.stopPropagation()} onTouchStart={e=>{if(!e.target.closest('.nxv-viewers'))storyTouchStart.current=e.touches?.[0]?.clientY??null;}} onTouchEnd={e=>{if(storyTouchStart.current===null)return;const delta=(e.changedTouches?.[0]?.clientY??storyTouchStart.current)-storyTouchStart.current;storyTouchStart.current=null;if(delta>48&&story.author_id===userId){setStoryViewersOpen(true);loadStoryViewers(story.id);}else if(delta<-48&&storyViewersOpen)setStoryViewersOpen(false);}}>
     {authorStories.length>1&&<div className="nxv-viewer-progress">{authorStories.map((item,i)=><span key={item.id} className={i<=storyIndex?'done':''}/>)}</div>}
     <header><Avatar person={story.author} size={36}/><span><b>{profileName(story.author)}</b><small>@{story.author?.username} · {timeAgo(story.created_at)}</small></span><button type="button" className="nxv-icon-btn" onClick={close} aria-label="Fechar pulso"><X size={20}/></button></header>
     <div className="nxv-viewer-stage">{story.imageUrl?<img src={story.imageUrl} alt="Imagem do pulso" loading="lazy" decoding="async"/>:<div className="nxv-viewer-text">{story.body||'Pulso'}</div>}</div>
     {story.body&&story.imageUrl&&<p className="nxv-viewer-caption">{story.body}</p>}
     {story.author_id===userId&&<button type="button" className="nxv-viewers-btn" onClick={()=>{setStoryViewersOpen(v=>!v);if(!storyViewersOpen)loadStoryViewers(story.id);}}><Eye size={16}/> {storyViewers.length} visualizações</button>}
     {story.author_id===userId&&storyViewersOpen&&<section className="nxv-viewers" aria-label="Quem visualizou"><b>Quem visualizou</b>{storyViewersLoading?<small>Carregando…</small>:storyViewers.length?storyViewers.map(v=><div key={v.viewer_id}><Avatar person={v.person} size={30}/><span><b>{profileName(v.person)}</b><small>@{v.person.username}</small></span><time>{new Date(v.viewed_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</time></div>):<small>Ninguém visualizou este pulso ainda.</small>}</section>}
     <nav><button type="button" className="nxv-btn" disabled={!previous} onClick={()=>openStory(previous?.id||story.id)}><ArrowLeft size={16}/> Anterior</button><button type="button" className="nxv-btn" disabled={!next} onClick={()=>openStory(next?.id||story.id)}>Próximo <ChevronLeft size={16} style={{transform:'rotate(180deg)'}}/></button></nav>
    </article></div>;})()}
 </section>;
}
