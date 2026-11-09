import React,{useCallback,useEffect,useState} from 'react';
import {supabase} from './supabase';
import {Heart,MessageCircle,Send,ImagePlus,MoreHorizontal,Trash2,Flag,X,CornerUpLeft,LoaderCircle} from 'lucide-react';
import './nexus-feed.css';

const MAX_IMAGE=5*1024*1024;
const timeAgo=value=>{
 const diff=Math.max(0,Date.now()-new Date(value).getTime());
 const mins=Math.floor(diff/60000);
 if(mins<1)return 'agora';
 if(mins<60)return mins+' min';
 const hours=Math.floor(mins/60);
 if(hours<24)return hours+' h';
 const days=Math.floor(hours/24);
 return days<7?days+' d':new Date(value).toLocaleDateString('pt-BR');
};
const initials=name=>String(name||'NX').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
const profileName=p=>p?.display_name||p?.username||'Jogador';

export default function NexusFeed({userId,playerProfile=null,onToast=()=>{},onOpenProfile=()=>{}}){
 const [posts,setPosts]=useState([]),[draft,setDraft]=useState(''),[photo,setPhoto]=useState(null),[photoPreview,setPhotoPreview]=useState('');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [expanded,setExpanded]=useState({}),[comments,setComments]=useState({}),[commentDraft,setCommentDraft]=useState('');
 const [replyTo,setReplyTo]=useState(null),[menuPost,setMenuPost]=useState(null);
 const load=useCallback(async()=>{
  if(!userId||!supabase)return;
  setLoading(true);setError('');
  try{
   const {data:rows,error:e}=await supabase.from('social_posts').select('id,author_id,body,image_path,created_at,updated_at').order('created_at',{ascending:false}).limit(40);
   if(e)throw e;
   const ids=[...new Set((rows||[]).map(p=>p.author_id))];
   const prof=ids.length?await supabase.from('social_profiles').select('user_id,username,display_name,avatar,avatar_frame,card_frame,equipped_gems,is_suspended').in('user_id',ids):{data:[],error:null};
   if(prof.error)throw prof.error;
   const profileMap=Object.fromEntries((prof.data||[]).map(p=>[p.user_id,p]));
   const visible=(rows||[]).filter(p=>profileMap[p.author_id]&&!profileMap[p.author_id].is_suspended);
   const postIds=visible.map(p=>p.id);
   const [likes,commentRows,mine]=postIds.length?await Promise.all([
    supabase.from('social_post_likes').select('post_id,user_id').in('post_id',postIds),
    supabase.from('social_post_comments').select('post_id').in('post_id',postIds).is('deleted_at',null),
    supabase.from('social_post_likes').select('post_id').in('post_id',postIds).eq('user_id',userId)
   ]):[{data:[],error:null},{data:[],error:null},{data:[],error:null}];
   for(const r of [likes,commentRows,mine])if(r.error)throw r.error;
   const likeCounts={},commentCounts={},liked=new Set((mine.data||[]).map(x=>x.post_id));
   (likes.data||[]).forEach(x=>likeCounts[x.post_id]=(likeCounts[x.post_id]||0)+1);
   (commentRows.data||[]).forEach(x=>commentCounts[x.post_id]=(commentCounts[x.post_id]||0)+1);
   const withImages=await Promise.all(visible.map(async p=>{
    let imageUrl='';
    if(p.image_path){const {data}=await supabase.storage.from('nexus-posts').createSignedUrl(p.image_path,3600);imageUrl=data?.signedUrl||'';}
    return {...p,author:profileMap[p.author_id],imageUrl,likeCount:likeCounts[p.id]||0,commentCount:commentCounts[p.id]||0,liked:liked.has(p.id)};
   }));
   setPosts(withImages);
  }catch(e){setError(e.message||'Não foi possível carregar o feed.');}
  finally{setLoading(false);}
 },[userId]);
 useEffect(()=>{load();},[load]);
 useEffect(()=>{
  if(!userId)return;
  const channel=supabase.channel('nexus-feed-'+userId)
   .on('postgres_changes',{event:'*',schema:'public',table:'social_posts'},load)
   .on('postgres_changes',{event:'*',schema:'public',table:'social_post_likes'},load)
   .on('postgres_changes',{event:'*',schema:'public',table:'social_post_comments'},load)
   .subscribe();
  return()=>{supabase.removeChannel(channel);};
 },[userId,load]);
 useEffect(()=>()=>{if(photoPreview)URL.revokeObjectURL(photoPreview);},[photoPreview]);
 function choosePhoto(file){
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Use uma imagem JPG, PNG ou WEBP.');return;}
  if(file.size>MAX_IMAGE){setError('A imagem deve ter no máximo 5 MB.');return;}
  if(photoPreview)URL.revokeObjectURL(photoPreview);
  setPhoto(file);setPhotoPreview(URL.createObjectURL(file));setError('');
 }
 async function publish(e){
  e.preventDefault();
  const body=draft.trim();
  if(!body&&!photo){setError('Escreva algo ou escolha uma foto para publicar.');return;}
  if(body.length>2000){setError('A publicação pode ter até 2.000 caracteres.');return;}
  setBusy(true);setError('');
  try{
   let imagePath=null;
   if(photo){
    const ext=photo.type==='image/png'?'png':photo.type==='image/webp'?'webp':'jpg';
    imagePath=userId+'/'+crypto.randomUUID()+'.'+ext;
    const {error:uploadError}=await supabase.storage.from('nexus-posts').upload(imagePath,photo,{contentType:photo.type,upsert:false});
    if(uploadError)throw uploadError;
   }
   const {error:e}=await supabase.from('social_posts').insert({author_id:userId,body,image_path:imagePath});
   if(e){if(imagePath)await supabase.storage.from('nexus-posts').remove([imagePath]);throw e;}
   setDraft('');setPhoto(null);if(photoPreview)URL.revokeObjectURL(photoPreview);setPhotoPreview('');
   onToast('Publicação compartilhada!');await load();
  }catch(e){setError(e.message||'Não foi possível publicar.');}
  finally{setBusy(false);}
 }
 async function toggleLike(post){
  setPosts(old=>old.map(p=>p.id===post.id?{...p,liked:!p.liked,likeCount:Math.max(0,p.likeCount+(p.liked?-1:1))}:p));
  const result=post.liked
   ?await supabase.from('social_post_likes').delete().eq('post_id',post.id).eq('user_id',userId)
   :await supabase.from('social_post_likes').insert({post_id:post.id,user_id:userId});
  if(result.error){setError(result.error.message);load();}
 }
 async function loadComments(postId){
  const {data,error:e}=await supabase.from('social_post_comments').select('id,post_id,author_id,parent_comment_id,body,created_at,deleted_at').eq('post_id',postId).is('deleted_at',null).order('created_at',{ascending:true}).limit(100);
  if(e){setError(e.message);return;}
  const ids=[...new Set((data||[]).map(c=>c.author_id))];
  const profiles=ids.length?await supabase.from('social_profiles').select('user_id,username,display_name,avatar,avatar_frame').in('user_id',ids):{data:[],error:null};
  if(profiles.error){setError(profiles.error.message);return;}
  const map=Object.fromEntries((profiles.data||[]).map(p=>[p.user_id,p]));
  setComments(old=>({...old,[postId]:(data||[]).map(c=>({...c,author:map[c.author_id]}))}));
 }
 async function toggleComments(postId){
  const next=!expanded[postId];setExpanded(old=>({...old,[postId]:next}));
  if(next&&!comments[postId])await loadComments(postId);
 }
 async function sendComment(postId,e){
  e.preventDefault();const body=commentDraft.trim();if(!body)return;
  setBusy(true);
  const {error:e1}=await supabase.from('social_post_comments').insert({post_id:postId,author_id:userId,body,parent_comment_id:replyTo?.postId===postId?replyTo.id:null});
  if(e1)setError(e1.message);else{setCommentDraft('');setReplyTo(null);await loadComments(postId);await load();}
  setBusy(false);
 }
 async function deleteComment(comment){
  const {error:e}=await supabase.from('social_post_comments').update({deleted_at:new Date().toISOString()}).eq('id',comment.id).eq('author_id',userId);
  if(e)setError(e.message);else{await loadComments(comment.post_id);await load();}
 }
 async function deletePost(post){
  if(!window.confirm('Excluir esta publicação?'))return;
  const {error:e}=await supabase.from('social_posts').delete().eq('id',post.id).eq('author_id',userId);
  if(e)setError(e.message);else{if(post.image_path)await supabase.storage.from('nexus-posts').remove([post.image_path]);onToast('Publicação excluída.');load();}
  setMenuPost(null);
 }
 async function reportPost(post){
  const reason=window.prompt('Conte brevemente por que deseja denunciar esta publicação:');
  if(reason===null)return;
  const {error:e}=await supabase.from('social_post_reports').insert({reporter_id:userId,post_id:post.id,details:reason.trim().slice(0,1000)});
  if(e)setError(e.message);else onToast('Denúncia enviada para análise.');
  setMenuPost(null);
 }
 async function reportComment(comment){
  const reason=window.prompt('Conte brevemente por que deseja denunciar este comentário:');
  if(reason===null)return;
  const {error:e}=await supabase.from('social_post_reports').insert({reporter_id:userId,comment_id:comment.id,details:reason.trim().slice(0,1000)});
  if(e)setError(e.message);else onToast('Denúncia enviada para análise.');
 }
 const authorButton=(person)=> <button className="nxf-author" onClick={()=>onOpenProfile(person)}><span className={'nxf-avatar frame-'+(person?.avatar_frame||'violet')}>{person?.avatar||initials(profileName(person))}</span><span className="nxf-author-copy"><b>{profileName(person)}</b><small>@{person?.username||'jogador'}</small></span></button>;
 return <section className="nexus-feed">
  <header className="nxf-heading"><div><span className="nxf-eyebrow">NEXUS SOCIAL · COMUNIDADE</span><h2>Feed <em>da galera</em></h2><p>Compartilhe conquistas, ideias e momentos da sua jornada.</p></div><span className="nxf-live"><i/> AO VIVO</span></header>
  <form className="nxf-composer" onSubmit={publish}>
   <div className="nxf-compose-top"><span className={'nxf-compose-avatar frame-'+(playerProfile?.frame||'violet')}>{playerProfile?.avatar||'👾'}</span><textarea value={draft} onChange={e=>setDraft(e.target.value)} maxLength={2000} rows={3} placeholder="O que está acontecendo na sua jornada?"/></div>
   {photoPreview&&<div className="nxf-preview"><img src={photoPreview} alt="Prévia da publicação"/><button type="button" onClick={()=>{setPhoto(null);URL.revokeObjectURL(photoPreview);setPhotoPreview('')}} aria-label="Remover foto"><X size={17}/></button></div>}
   <div className="nxf-compose-bottom"><label className="nxf-photo-pick"><ImagePlus size={17}/> Foto <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>choosePhoto(e.target.files?.[0])}/></label><span>{draft.length}/2000</span><button className="nxf-publish" disabled={busy||(!draft.trim()&&!photo)}>{busy?<LoaderCircle size={16} className="nxf-spin"/>:<Send size={16}/>} Publicar</button></div>
  </form>
  {error&&<div className="nxf-error" role="alert">{error}<button onClick={()=>setError('')} aria-label="Fechar"><X size={14}/></button></div>}
  {loading?<div className="nxf-loading"><LoaderCircle className="nxf-spin"/> Carregando publicações...</div>:posts.length===0?<div className="nxf-empty"><span>✦</span><h3>O feed começa com você</h3><p>Compartilhe a primeira conquista e puxe a conversa com a comunidade.</p></div>:
   <div className="nxf-post-list">{posts.map(post=><article className="nxf-post" key={post.id}>
    <div className="nxf-post-head">{authorButton(post.author)}<div className="nxf-post-meta"><time>{timeAgo(post.created_at)}</time><button aria-label="Mais opções" onClick={()=>setMenuPost(menuPost===post.id?null:post.id)}><MoreHorizontal size={20}/></button>{menuPost===post.id&&<div className="nxf-menu">{post.author_id===userId?<button onClick={()=>deletePost(post)}><Trash2 size={14}/> Excluir publicação</button>:<button onClick={()=>reportPost(post)}><Flag size={14}/> Denunciar</button>}</div>}</div></div>
    {post.body&&<p className="nxf-post-body">{post.body}</p>}
    {post.imageUrl&&<img className="nxf-post-image" src={post.imageUrl} alt="Imagem da publicação" loading="lazy"/>}
    <div className="nxf-actions"><button className={post.liked?'liked':''} onClick={()=>toggleLike(post)}><Heart size={19} fill={post.liked?'currentColor':'none'}/><b>{post.likeCount}</b> Curtir</button><button onClick={()=>toggleComments(post.id)}><MessageCircle size={19}/><b>{post.commentCount}</b> Comentários</button></div>
    {expanded[post.id]&&<div className="nxf-comments">
     <div className="nxf-comment-list">{(comments[post.id]||[]).map(c=><div className={'nxf-comment '+(c.parent_comment_id?'is-reply':'')} key={c.id}>{authorButton(c.author)}<div className="nxf-comment-content"><p>{c.body}</p><div className="nxf-comment-tools"><time>{timeAgo(c.created_at)}</time><button onClick={()=>setReplyTo({id:c.id,postId:post.id,name:profileName(c.author)})}><CornerUpLeft size={13}/> Responder</button>{c.author_id===userId&&<button onClick={()=>deleteComment(c)}><Trash2 size={13}/></button>}{c.author_id!==userId&&<button onClick={()=>reportComment(c)}><Flag size={13}/></button>}</div></div></div>)}</div>
     {replyTo?.postId===post.id&&<div className="nxf-replying">Respondendo a {replyTo.name}<button onClick={()=>setReplyTo(null)}><X size={13}/></button></div>}
     <form className="nxf-comment-form" onSubmit={e=>sendComment(post.id,e)}><input value={commentDraft} onChange={e=>setCommentDraft(e.target.value)} maxLength={1000} placeholder="Escreva um comentário..."/><button disabled={busy||!commentDraft.trim()}><Send size={16}/></button></form>
    </div>}
   </article>)}</div>
  }
  <footer className="nxf-footer">Mostrando as publicações mais recentes da comunidade · Até 40 por carregamento</footer>
 </section>;
}
