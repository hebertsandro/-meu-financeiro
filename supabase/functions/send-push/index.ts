import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return reply({error:"Method not allowed"},405);
  try{
    const authHeader=req.headers.get("Authorization")||"";
    const publishableKeys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");
    const anonKey=Deno.env.get("SUPABASE_ANON_KEY")||publishableKeys.default;
    const supabase=createClient(Deno.env.get("SUPABASE_URL")!,anonKey,{global:{headers:{Authorization:authHeader}}});
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)return reply({error:"Unauthorized"},401);
    const {title,body,url="/",tag="meu-financeiro"}=await req.json();
    if(!title||!body)return reply({error:"title and body are required"},400);
    const publicKey="BCay49BvqxHdAPmTOEwxxyUhU7Brg0ElRvU9QdLMEwIorYHa7uOutg9DVZu9HiBGxftBr0VZwfKk9n12YdTD8Cs";
    const privateKey=Deno.env.get("VAPID_PRIVATE_KEY");
    if(!privateKey)return reply({error:"Push service is not configured"},503);
    webpush.setVapidDetails("https://meu-financeiro.hebertsandro877.workers.dev",publicKey,privateKey);
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {data:subscriptions,error}=await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id",user.id);
    if(error)throw error;
    let sent=0;
    const expired:string[]=[];
    for(const row of subscriptions||[]){
      try{
        await webpush.sendNotification({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},{title,body,url,tag});
        sent++;
      }catch(err){
        const status=(err as {statusCode?:number})?.statusCode;
        if(status===404||status===410)expired.push(row.id);
        else console.error("Push delivery failed",status);
      }
    }
    if(expired.length)await admin.from("push_subscriptions").delete().in("id",expired);
    return reply({sent,removed:expired.length});
  }catch(error){console.error(error);return reply({error:error instanceof Error?error.message:"Internal error"},500);}
});
