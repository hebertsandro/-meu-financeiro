const MODEL = "@cf/meta/llama-3.1-8b-instruct";

const SYSTEM_PROMPT = `
Você é NEXUS, a inteligência conversacional do Meu Financeiro.
Fale em português brasileiro natural, acolhedor e espontâneo. Entenda linguagem informal, abreviações, erros de digitação e mensagens curtas pelo contexto.
Você não é apenas uma assistente financeira: pode conversar sobre relacionamentos, família, amizades, escola, trabalho, sentimentos, fé, lazer, tecnologia, cultura, viagens, comida, animais, esportes e assuntos cotidianos.
Seja uma presença amigável e respeitosa. Escute antes de aconselhar, faça perguntas naturais e não transforme toda conversa em assunto financeiro.
Mantenha coerência com o histórico. Não repita perguntas já respondidas. Se não entender, diga isso com simplicidade e peça esclarecimento.
Sobre finanças, use apenas os dados fornecidos. Nunca invente saldo, transação, limite, dívida ou data. Diferencie registros de saldo bancário real. Faça cálculos com cuidado.
Não diga que é humana, não alegue sentimentos ou experiências pessoais reais e não afirme que substitui amigos, familiares ou profissionais. Em assuntos emocionais, acolha sem julgar. Se houver risco imediato de autoagressão ou violência, incentive a pessoa a procurar ajuda humana e serviços de emergência locais.
Nunca peça senhas, CVV, códigos de autenticação ou números completos de cartões. Não execute pagamentos, transferências ou alterações financeiras.
Responda com clareza e naturalidade, geralmente em poucas frases; aprofunde quando a pessoa pedir.
`.trim();

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    if (!env.AI) return json({ error: "O modelo da NEXUS ainda não está conectado. Falta ativar o vínculo Workers AI no Cloudflare." }, 503);

    const body = await request.json();
    const { messages, supabaseUrl, anonKey, accessToken, financeContext } = body || {};

    if (typeof supabaseUrl !== "string" || typeof anonKey !== "string" ||
        typeof accessToken !== "string" || !accessToken.startsWith("ey")) {
      return json({ error: "Sua sessão não foi validada. Saia e entre novamente na sua conta." }, 401);
    }

    let projectUrl;
    try { projectUrl = new URL(supabaseUrl); } catch { return json({ error: "Configuração de autenticação inválida." }, 400); }
    if (projectUrl.protocol !== "https:") return json({ error: "A conexão segura do Supabase é obrigatória." }, 400);

    const authResponse = await fetch(projectUrl.origin + "/auth/v1/user", {
      headers: { apikey: anonKey, Authorization: "Bearer " + accessToken },
    });
    if (!authResponse.ok) return json({ error: "Sua sessão expirou. Entre novamente para continuar." }, 401);

    if (!Array.isArray(messages) || messages.length < 1 || messages.length > 12) {
      return json({ error: "Histórico de conversa inválido." }, 400);
    }
    const safeMessages = [];
    for (const message of messages) {
      if (!message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string") {
        return json({ error: "Formato de conversa inválido." }, 400);
      }
      safeMessages.push({ role: message.role, content: message.content.slice(0, 3000) });
    }
    if (safeMessages[safeMessages.length - 1].role !== "user") {
      return json({ error: "A última mensagem precisa ser do usuário." }, 400);
    }

    const contextText = JSON.stringify(financeContext && typeof financeContext === "object" ? financeContext : {}).slice(0, 9000);
    const modelMessages = [
      { role: "system", content: SYSTEM_PROMPT + "\n\nDADOS FINANCEIROS CADASTRADOS PELO USUÁRIO (use somente se forem relevantes):\n" + contextText },
      ...safeMessages,
    ];

    const result = await env.AI.run(MODEL, {
      messages: modelMessages,
      max_tokens: 650,
      temperature: 0.65,
    });

    const reply = result?.response || result?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      console.error("NEXUS: resposta vazia do Workers AI", result);
      return json({ error: "O modelo não conseguiu formular uma resposta. Tente novamente." }, 502);
    }

    return json({ reply: reply.trim(), model: MODEL });
  } catch (error) {
    console.error("NEXUS Pages Function:", error);
    return json({ error: "Não foi possível conversar com a NEXUS agora. Tente novamente em instantes." }, 500);
  }
}
