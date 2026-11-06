import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

const SYSTEM_PROMPT = `
Você é NEXUS, a assistente financeira conversacional do aplicativo Meu Financeiro.
Fale sempre em português brasileiro natural, com simpatia, clareza e personalidade.
Converse como uma assistente de verdade: considere o histórico, responda perguntas de acompanhamento
e não peça ao usuário para repetir informações já presentes na conversa.
Você ajuda a organizar orçamento, gastos, cartões, dívidas, parcelas e metas.
Use os dados financeiros fornecidos como contexto privado do próprio usuário. Nunca invente valores,
transações, datas ou fatos. Se os dados não forem suficientes, diga isso e pergunte o necessário.
Faça contas com cuidado; mostre a fórmula quando isso ajudar. Diferencie valores registrados de estimativas.
Não diga que acessou banco, cartão ou conta bancária: você só vê os dados cadastrados no Meu Financeiro.
Não execute pagamentos, transferências ou alterações de cadastro. Você apenas orienta.
Não solicite senhas, CVV, códigos de autenticação ou números completos de cartões.
Não prometa retorno de investimento nem apresente aconselhamento financeiro profissional.
Prefira respostas úteis, diretas e organizadas; use listas curtas quando ajudarem.
`.trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Sessão não autorizada." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const modelUrl = Deno.env.get("NEXUS_OLLAMA_URL");
    const modelApiKey = Deno.env.get("NEXUS_OLLAMA_API_KEY");
    const modelName = Deno.env.get("NEXUS_MODEL_NAME") || "qwen3:4b-instruct";

    if (!supabaseUrl || !supabaseAnonKey) return json({ error: "Autenticação do Supabase não configurada." }, 500);
    if (!modelUrl || !modelApiKey) return json({ error: "O servidor próprio da NEXUS ainda não foi conectado." }, 503);

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: "Sessão inválida ou expirada." }, 401);

    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    if (!messages.length || messages.length > 12) return json({ error: "Envie até 12 mensagens de contexto." }, 400);

    const safeMessages = messages.map((message: { role?: string; content?: string }) => {
      const role = message?.role === "assistant" ? "assistant" : message?.role === "user" ? "user" : null;
      if (!role || typeof message?.content !== "string") throw new Error("Formato de conversa inválido.");
      return { role, content: message.content.slice(0, 4000) };
    });
    if (safeMessages[safeMessages.length - 1]?.role !== "user") return json({ error: "A última mensagem precisa ser do usuário." }, 400);

    const financeContext = body?.financeContext && typeof body.financeContext === "object" ? body.financeContext : {};
    const contextText = JSON.stringify(financeContext).slice(0, 14000);
    const endpoint = modelUrl.replace(/\/+$/, "") + "/api/chat";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);
    let modelResponse: Response;
    try {
      modelResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${modelApiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          stream: false,
          messages: [
            { role: "system", content: SYSTEM_PROMPT + "\n\nDADOS FINANCEIROS CADASTRADOS (JSON):\n" + contextText },
            ...safeMessages,
          ],
          options: { temperature: 0.45, num_ctx: 8192, num_predict: 520 },
          keep_alive: "10m",
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!modelResponse.ok) {
      const detail = await modelResponse.text();
      console.error("NEXUS model server error:", modelResponse.status, detail.slice(0, 500));
      return json({ error: "O núcleo da NEXUS encontrou um erro ao gerar a resposta." }, 502);
    }

    const modelResult = await modelResponse.json();
    const reply = modelResult?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) return json({ error: "O modelo não retornou uma resposta válida." }, 502);

    return json({ reply: reply.trim(), model: modelName });
  } catch (error) {
    console.error("NEXUS Edge Function:", error);
    if (error instanceof DOMException && error.name === "AbortError") {
      return json({ error: "O modelo demorou demais para responder. Tente novamente." }, 504);
    }
    return json({ error: "Não foi possível processar a conversa da NEXUS." }, 500);
  }
});
