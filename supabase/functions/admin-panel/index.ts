// Supabase Edge Function: painel administrativo do Meu Financeiro.
// Publique com verify_jwt habilitado. Configure ADMIN_EMAIL como secret.
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são secrets padrão do ambiente Supabase.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method !== "POST") return respond({ error: "Método não permitido." }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return respond({ error: "Não autenticado." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const adminEmail = Deno.env.get("ADMIN_EMAIL")?.toLowerCase();
  if (!url || !serviceKey || !adminEmail) return respond({ error: "Configuração administrativa incompleta no servidor." }, 500);

  const authClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return respond({ error: "Sessão inválida ou expirada." }, 401);
  if (authData.user.email?.toLowerCase() !== adminEmail) return respond({ error: "Acesso restrito ao administrador autorizado." }, 403);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let body: { action?: string; user_id?: string; enabled?: boolean; message?: string; suspended?: boolean; title?: string };
  try { body = await req.json(); } catch { return respond({ error: "Corpo da solicitação inválido." }, 400); }

  if (body.action === "get_maintenance") {
    const { data, error } = await admin.from("app_settings").select("maintenance_mode,maintenance_message,updated_at").eq("id", true).single();
    if (error) return respond({ error: "Falha ao consultar manutenção: " + error.message }, 500);
    return respond({ settings: data });
  }

  if (body.action === "set_maintenance") {
    const enabled = body.enabled === true;
    const message = typeof body.message === "string" ? body.message.slice(0, 240) : "Estamos realizando uma manutenção. Voltaremos em breve.";
    const { error } = await admin.from("app_settings").upsert({ id: true, maintenance_mode: enabled, maintenance_message: message, updated_at: new Date().toISOString() });
    if (error) return respond({ error: "Falha ao salvar manutenção: " + error.message }, 500);
    return respond({ success: true, maintenance_mode: enabled });
  }

  if (body.action === "broadcast_announcement") {
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 80) : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
    if (title.length < 3 || message.length < 5) return respond({ error: "Informe um título e uma mensagem válidos." }, 400);

    const recipients: string[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return respond({ error: "Não foi possível consultar os destinatários." }, 500);
      const users = data.users ?? [];
      for (const user of users) {
        const isBanned = !!user.banned_until && new Date(user.banned_until).getTime() > Date.now();
        if (user.id !== authData.user.id && !isBanned) recipients.push(user.id);
      }
      if (users.length < 1000) break;
      if (page === 20) return respond({ error: "A base ultrapassou o limite de segurança de 20 mil contas. Nenhum comunicado foi enviado." }, 413);
    }

    let sent = 0;
    for (let offset = 0; offset < recipients.length; offset += 250) {
      const rows = recipients.slice(offset, offset + 250).map((user_id) => ({
        user_id, title, message, category: "anuncios",
      }));
      const { error } = await admin.from("notifications").insert(rows);
      if (error) return respond({ error: "Falha após enviar para " + sent + " contas. Verifique antes de tentar novamente.", sent_partial: sent }, 500);
      sent += rows.length;
    }
    return respond({ success: true, sent });
  }

  if (body.action === "list_social_profiles") {
    const { data: profiles, error } = await admin.from("social_profiles")
      .select("user_id,username,display_name,bio,avatar,is_suspended,moderation_note,created_at,updated_at")
      .order("created_at", { ascending: false }).limit(500);
    if (error) return respond({ error: "Não foi possível listar perfis sociais: " + error.message }, 500);
    const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emails = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    return respond({ profiles: (profiles ?? []).map((p) => ({ ...p, email: emails.get(p.user_id) ?? "" })) });
  }

  if (body.action === "moderate_social_profile" || body.action === "delete_social_profile") {
    if (!body.user_id) return respond({ error: "Informe o perfil social." }, 400);
    if (body.user_id === authData.user.id) return respond({ error: "O administrador não pode moderar o próprio perfil por este painel." }, 400);
    if (body.action === "delete_social_profile") {
      const { error } = await admin.from("social_profiles").delete().eq("user_id", body.user_id);
      if (error) return respond({ error: "Não foi possível remover o perfil social: " + error.message }, 500);
      return respond({ success: true, deleted: true });
    }
    const suspended = body.suspended === true;
    const { error } = await admin.from("social_profiles").update({
      is_suspended: suspended, moderation_note: suspended ? "Suspenso pela administração" : null,
      moderated_at: new Date().toISOString(), moderated_by: authData.user.id, updated_at: new Date().toISOString(),
    }).eq("user_id", body.user_id);
    if (error) return respond({ error: "Não foi possível alterar a moderação: " + error.message }, 500);
    return respond({ success: true, is_suspended: suspended });
  }

  if (body.action === "list_users") {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (error) return respond({ error: "Não foi possível listar as contas." }, 500);
    return respond({ users: data.users.map((u) => ({
      id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
      banned_until: u.banned_until, email_confirmed_at: u.email_confirmed_at,
    })) });
  }

  if (!body.user_id) return respond({ error: "Informe a conta que deseja gerenciar." }, 400);
  if (body.user_id === authData.user.id) return respond({ error: "Esta ação não pode ser aplicada à própria conta administrativa." }, 400);

  if (body.action === "ban_user" || body.action === "unban_user") {
    const { data: target, error: targetError } = await admin.auth.admin.getUserById(body.user_id);
    if (targetError || !target.user) return respond({ error: "Conta não encontrada." }, 404);
    if (target.user.email?.toLowerCase() === adminEmail) return respond({ error: "A conta administradora não pode ser bloqueada." }, 403);
    const { error } = await admin.auth.admin.updateUserById(body.user_id, {
      ban_duration: body.action === "ban_user" ? "876000h" : "none",
    });
    if (error) return respond({ error: "Não foi possível alterar o acesso desta conta." }, 500);
    return respond({ success: true });
  }

  if (body.action === "delete_user") {
    const { data: target, error: targetError } = await admin.auth.admin.getUserById(body.user_id);
    if (targetError || !target.user) return respond({ error: "Conta não encontrada." }, 404);
    if (target.user.email?.toLowerCase() === adminEmail) return respond({ error: "A conta administradora não pode ser excluída." }, 403);
    const { error } = await admin.auth.admin.deleteUser(body.user_id);
    if (error) return respond({ error: "Não foi possível excluir a conta definitivamente." }, 500);
    return respond({ success: true, deleted: true });
  }

  if (body.action === "reset_password") {
    const { data: target, error: targetError } = await admin.auth.admin.getUserById(body.user_id);
    if (targetError || !target.user?.email) return respond({ error: "Conta ou e-mail não encontrado." }, 404);
    if (target.user.email.toLowerCase() === adminEmail) return respond({ error: "Use o fluxo normal de recuperação para sua própria conta." }, 403);
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery", email: target.user.email,
      options: { redirectTo: Deno.env.get("APP_URL") },
    });
    if (error || !data.properties?.action_link) return respond({ error: "Não foi possível gerar o link de redefinição." }, 500);
    return respond({ action_link: data.properties.action_link });
  }

  return respond({ error: "Ação não reconhecida." }, 400);
});
