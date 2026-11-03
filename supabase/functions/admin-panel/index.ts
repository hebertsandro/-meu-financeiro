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
  let body: { action?: string; user_id?: string; enabled?: boolean; message?: string };
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
