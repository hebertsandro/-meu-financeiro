import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@meufinanceiro.app";
  if (!url || !anon || !serviceKey || !vapidPublic || !vapidPrivate) return json({ error: "Push secrets are not configured." }, 500);
  const authHeader = req.headers.get("Authorization") || "";
  const authClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);
  const senderId = authData.user.id;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const input = await req.json().catch(() => ({}));
  let recipients: string[] = [];
  let title = "NEXUS Social";
  let body = "Você recebeu uma nova notificação.";
  let tag = "nexus-social";

  if (input.type === "message") {
    const { data: msg, error } = await admin.from("social_messages").select("id,conversation_id,sender_id,body").eq("id", input.record_id).single();
    if (error || !msg || msg.sender_id !== senderId) return json({ error: "Message not found or forbidden." }, 403);
    const { data: members } = await admin.from("social_conversation_members").select("user_id").eq("conversation_id", msg.conversation_id).neq("user_id", senderId);
    recipients = (members || []).map((x: {user_id:string}) => x.user_id);
    title = "Nova mensagem"; body = String(msg.body || "Enviou uma mensagem").slice(0, 140); tag = "nexus-message-" + msg.conversation_id;
  } else if (input.type === "room_message") {
    const { data: msg, error } = await admin.from("social_room_messages").select("id,room_id,sender_id,body").eq("id", input.record_id).single();
    if (error || !msg || msg.sender_id !== senderId) return json({ error: "Message not found or forbidden." }, 403);
    const [{ data: members }, { data: room }] = await Promise.all([admin.from("social_room_members").select("user_id").eq("room_id", msg.room_id).neq("user_id", senderId), admin.from("social_rooms").select("name").eq("id", msg.room_id).maybeSingle()]);
    recipients = (members || []).map((x: {user_id:string}) => x.user_id); title = room?.name || "Mensagem no grupo"; body = String(msg.body || "Nova mensagem").slice(0, 140); tag = "nexus-room-" + msg.room_id;
  } else if (input.type === "clan_message") {
    const { data: msg, error } = await admin.from("social_clan_messages").select("id,clan_id,sender_id,body").eq("id", input.record_id).single();
    if (error || !msg || msg.sender_id !== senderId) return json({ error: "Message not found or forbidden." }, 403);
    const [{ data: members }, { data: clan }] = await Promise.all([admin.from("social_clan_members").select("user_id").eq("clan_id", msg.clan_id).neq("user_id", senderId), admin.from("social_clans").select("name").eq("id", msg.clan_id).maybeSingle()]);
    recipients = (members || []).map((x: {user_id:string}) => x.user_id); title = clan?.name || "Mensagem no clã"; body = String(msg.body || "Nova mensagem").slice(0, 140); tag = "nexus-clan-" + msg.clan_id;
  } else if (input.type === "friend_request") {
    const { data: request, error } = await admin.from("social_friend_requests").select("id,sender_id,receiver_id").eq("id", input.record_id).single();
    if (error || !request || request.sender_id !== senderId) return json({ error: "Request not found or forbidden." }, 403);
    recipients = [request.receiver_id]; title = "Solicitação de amizade"; body = "Alguém quer ser seu amigo no NEXUS Social."; tag = "nexus-friend-" + request.id;
  } else if (input.type === "room_invite") {
    if (input.inviter_id !== senderId || typeof input.room_id !== "string" || typeof input.invited_user_id !== "string") return json({ error: "Forbidden." }, 403);
    const [{ data: room }, { data: member }] = await Promise.all([admin.from("social_rooms").select("name").eq("id", input.room_id).maybeSingle(), admin.from("social_room_members").select("user_id").eq("room_id", input.room_id).eq("user_id", senderId).maybeSingle()]);
    if (!room || !member) return json({ error: "Room or membership not found." }, 404);
    recipients = [input.invited_user_id]; title = "Convite para grupo"; body = "Você foi convidado para " + room.name + "."; tag = "nexus-room-invite-" + input.room_id;
  } else return json({ error: "Unsupported notification type." }, 400);

  recipients = [...new Set(recipients)].filter((id) => id !== senderId);
  if (!recipients.length) return json({ sent: 0 });
  const { data: rows, error: subError } = await admin.from("nexus_push_subscriptions").select("user_id,endpoint,subscription").in("user_id", recipients);
  if (subError) return json({ error: subError.message }, 500);
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const payload = JSON.stringify({ title, body, tag, url: "/" });
  let sent = 0;
  await Promise.all((rows || []).map(async (row: {user_id:string;endpoint:string;subscription:Record<string,unknown>}) => {
    try { await webpush.sendNotification(row.subscription, payload); sent++; }
    catch (error) { const status = (error as {statusCode?:number}).statusCode; if (status === 404 || status === 410) await admin.from("nexus_push_subscriptions").delete().eq("user_id", row.user_id).eq("endpoint", row.endpoint); }
  }));
  return json({ sent });
});
