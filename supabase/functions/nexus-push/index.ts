import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS" };
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const VAPID_PUBLIC_KEY="BCay49BvqxHdAPmTOEwxxyUhU7Brg0ElRvU9QdLMEwIorYHa7uOutg9DVZu9HiBGxftBr0VZwfKk9n12YdTD8Cs";
const VAPID_SUBJECT="https://meu-financeiro.hebertsandro877.workers.dev";

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")||"";
  const publishableKeys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");
  const secretKeys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
  const anon=publishableKeys.default||Deno.env.get("SUPABASE_ANON_KEY")||"";
  const serviceKey=secretKeys.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const privateKey=Deno.env.get("VAPID_PRIVATE_KEY")||"";
  if(!url||!anon||!serviceKey||!privateKey)return json({error:"Push service is not configured."},503);
  const authHeader=req.headers.get("Authorization")||"";
  const authClient=createClient(url,anon,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false}});
  const {data:authData,error:authError}=await authClient.auth.getUser();
  if(authError||!authData.user)return json({error:"Unauthorized"},401);
  const senderId=authData.user.id,admin=createClient(url,serviceKey,{auth:{persistSession:false}});
  const input=await req.json().catch(()=>({}));
  let recipients:string[]=[],title="NEXUS Social",body="Você recebeu uma nova notificação.",tag="nexus-social";
  const fail=()=>json({error:"Event not found or forbidden."},403);

  if(input.type==="message"){
   const {data:msg,error}=await admin.from("social_messages").select("id,conversation_id,sender_id,body").eq("id",input.record_id).single();
   if(error||!msg||msg.sender_id!==senderId)return fail();
   const {data:members}=await admin.from("social_conversation_members").select("user_id").eq("conversation_id",msg.conversation_id).neq("user_id",senderId);
   recipients=(members||[]).map((x:{user_id:string})=>x.user_id);title="Nova mensagem";body=String(msg.body||"Enviou uma mensagem").slice(0,140);tag="nexus-message-"+msg.conversation_id;
  }else if(input.type==="room_message"){
   const {data:msg,error}=await admin.from("social_room_messages").select("id,room_id,sender_id,body").eq("id",input.record_id).single();
   if(error||!msg||msg.sender_id!==senderId)return fail();
   const [{data:members},{data:room}]=await Promise.all([admin.from("social_room_members").select("user_id").eq("room_id",msg.room_id).neq("user_id",senderId),admin.from("social_rooms").select("name").eq("id",msg.room_id).maybeSingle()]);
   recipients=(members||[]).map((x:{user_id:string})=>x.user_id);title=room?.name||"Mensagem no grupo";body=String(msg.body||"Nova mensagem").slice(0,140);tag="nexus-room-"+msg.room_id;
  }else if(input.type==="clan_message"){
   const {data:msg,error}=await admin.from("social_clan_messages").select("id,clan_id,sender_id,body").eq("id",input.record_id).single();
   if(error||!msg||msg.sender_id!==senderId)return fail();
   const [{data:members},{data:clan}]=await Promise.all([admin.from("social_clan_members").select("user_id").eq("clan_id",msg.clan_id).neq("user_id",senderId),admin.from("social_clans").select("name").eq("id",msg.clan_id).maybeSingle()]);
   recipients=(members||[]).map((x:{user_id:string})=>x.user_id);title=clan?.name||"Mensagem no clã";body=String(msg.body||"Nova mensagem").slice(0,140);tag="nexus-clan-"+msg.clan_id;
  }else if(input.type==="friend_request"){
   const {data:request,error}=await admin.from("social_friend_requests").select("id,sender_id,receiver_id").eq("id",input.record_id).single();
   if(error||!request||request.sender_id!==senderId)return fail();
   recipients=[request.receiver_id];title="Solicitação de amizade";body="Alguém quer ser seu amigo no NEXUS Social.";tag="nexus-friend-"+request.id;
  }else if(input.type==="room_invite"){
   if(input.inviter_id!==senderId||typeof input.room_id!=="string"||typeof input.invited_user_id!=="string")return fail();
   const [{data:room},{data:member},{data:invite}]=await Promise.all([admin.from("social_rooms").select("name").eq("id",input.room_id).maybeSingle(),admin.from("social_room_members").select("user_id").eq("room_id",input.room_id).eq("user_id",senderId).maybeSingle(),admin.from("social_room_invites").select("room_id").eq("room_id",input.room_id).eq("invited_user_id",input.invited_user_id).eq("invited_by",senderId).eq("status","pending").maybeSingle()]);
   if(!room||!member||!invite)return fail();
   recipients=[input.invited_user_id];title="Convite para grupo";body="Você foi convidado para "+room.name+".";tag="nexus-room-invite-"+input.room_id;
  }else if(input.type==="post_like"||input.type==="post_reaction"){
   if(typeof input.post_id!=="string")return fail();
   const {data:post,error:postError}=await admin.from("social_posts").select("id,author_id").eq("id",input.post_id).maybeSingle();
   if(postError||!post||post.author_id===senderId)return json({sent:0});
   const table=input.type==="post_like"?"social_post_likes":"social_post_reactions";
   const {data:activity,error}=await admin.from(table).select("post_id").eq("post_id",input.post_id).eq("user_id",senderId).maybeSingle();
   if(error||!activity)return fail();
   recipients=[post.author_id];title=input.type==="post_like"?"Curtiram sua publicação":"Reação à sua publicação";body=input.type==="post_like"?"Alguém curtiu sua publicação no NEXUS Social.":"Alguém reagiu à sua publicação no NEXUS Social.";tag="nexus-post-"+input.post_id;
  }else if(input.type==="post_comment"){
   const {data:comment,error}=await admin.from("social_post_comments").select("id,post_id,author_id,body").eq("id",input.record_id).single();
   if(error||!comment||comment.author_id!==senderId)return fail();
   const {data:post,error:postError}=await admin.from("social_posts").select("author_id").eq("id",comment.post_id).maybeSingle();
   if(postError||!post||post.author_id===senderId)return json({sent:0});
   recipients=[post.author_id];title="Novo comentário";body=String(comment.body||"Comentaram na sua publicação").slice(0,140);tag="nexus-comment-"+comment.id;
  }else return json({error:"Unsupported notification type."},400);

  recipients=[...new Set(recipients)].filter(id=>id!==senderId);
  if(!recipients.length)return json({sent:0,failed:0});
  const [{data:rows,error:subError},{data:legacyRows,error:legacyError}]=await Promise.all([
   admin.from("push_subscriptions").select("user_id,endpoint,p256dh,auth").in("user_id",recipients),
   admin.from("nexus_push_subscriptions").select("user_id,endpoint,subscription").in("user_id",recipients)
  ]);
  if(subError||legacyError)return json({error:subError?.message||legacyError?.message},500);
  const subscriptions=new Map<string,{user_id:string;endpoint:string;subscription:Record<string,unknown>;legacy:boolean}>();
  for(const row of rows||[])subscriptions.set(row.endpoint,{user_id:row.user_id,endpoint:row.endpoint,subscription:{endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},legacy:false});
  for(const row of legacyRows||[])if(!subscriptions.has(row.endpoint))subscriptions.set(row.endpoint,{user_id:row.user_id,endpoint:row.endpoint,subscription:row.subscription as Record<string,unknown>,legacy:true});
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")||VAPID_SUBJECT,VAPID_PUBLIC_KEY,privateKey);
  const payload=JSON.stringify({title,body,tag,url:"/"});
  let sent=0,failed=0;const expired:{user_id:string;endpoint:string;legacy:boolean}[]=[];
  await Promise.all([...subscriptions.values()].map(async row=>{
   try{await webpush.sendNotification(row.subscription,payload,{TTL:3600,urgency:"normal"});sent++;}
   catch(error){failed++;const status=(error as {statusCode?:number}).statusCode;if(status===404||status===410)expired.push(row);}
  }));
  await Promise.all(expired.map(row=>row.legacy?admin.from("nexus_push_subscriptions").delete().eq("user_id",row.user_id).eq("endpoint",row.endpoint):admin.from("push_subscriptions").delete().eq("user_id",row.user_id).eq("endpoint",row.endpoint)));
  return json({sent,failed,subscriptions:subscriptions.size,removed:expired.length});
 }catch(error){console.error("NEXUS push delivery:",error);return json({error:error instanceof Error?error.message:"Internal error"},500);}
});
