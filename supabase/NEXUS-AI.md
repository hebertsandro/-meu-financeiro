# NEXUS AI — núcleo próprio (sem API da OpenAI)

A NEXUS usa um modelo aberto executado em infraestrutura controlada pelo projeto. O navegador nunca chama o Ollama diretamente: o fluxo passa pela Supabase Edge Function `nexus-chat`, que valida a sessão e mantém a credencial do servidor fora do frontend.

## Arquitetura

`React/Cloudflare Pages → Supabase Edge Function → servidor Ollama privado → modelo aberto`

Modelo inicial sugerido: `qwen3:4b-instruct`. O Qwen3-4B é disponibilizado sob Apache 2.0 e oferece suporte multilíngue. Para máquinas com mais memória, podemos testar um modelo maior depois. A escolha final deve considerar a memória RAM/VRAM e a latência do servidor.

## O que já existe no repositório

- Edge Function autenticada `supabase/functions/nexus-chat/index.ts`.
- Validação da sessão Supabase antes de acessar o modelo.
- Histórico limitado às últimas 12 mensagens e limite de tamanho por mensagem.
- Contexto financeiro resumido enviado na chamada.
- Chave de acesso ao servidor mantida somente nos secrets do Supabase.
- Resposta conversacional no widget NEXUS, com estado de carregamento e tratamento de falhas.

## Infraestrutura necessária

O Cloudflare Pages hospeda o frontend, não o modelo de linguagem. É necessário um computador/servidor ligado ou uma VPS com recursos suficientes para executar Ollama e o modelo escolhido.

**Não exponha a porta 11434 do Ollama diretamente à internet.** Coloque o Ollama atrás de um proxy HTTPS com autenticação (por exemplo, Caddy/Nginx com autenticação por token) e limite o acesso ao proxy. Use uma credencial longa e exclusiva para a NEXUS.

Exemplo de instalação do Ollama no servidor:

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen3:4b-instruct
ollama run qwen3:4b-instruct
```

A API local do Ollama fica em `http://127.0.0.1:11434`. O proxy autenticado deve encaminhar chamadas para `/api/chat` nessa origem. O endpoint configurado em `NEXUS_OLLAMA_URL` é a URL HTTPS pública do proxy, sem `/api/chat` no final.

## Secrets da Edge Function

Configure no projeto Supabase (não no Cloudflare e não no `.env` do frontend):

- `NEXUS_OLLAMA_URL`: URL HTTPS do proxy privado.
- `NEXUS_OLLAMA_API_KEY`: token exigido pelo proxy.
- `NEXUS_MODEL_NAME`: `qwen3:4b-instruct` (opcional; esse é o padrão).

Os secrets padrão `SUPABASE_URL` e `SUPABASE_ANON_KEY` são fornecidos pelo ambiente Supabase.

## Deploy da função

Com Supabase CLI instalado e o projeto vinculado:

```bash
supabase functions deploy nexus-chat
supabase secrets set NEXUS_OLLAMA_URL=https://SEU-ENDPOINT-PRIVADO
supabase secrets set NEXUS_OLLAMA_API_KEY=SEU_TOKEN_LONGO
supabase secrets set NEXUS_MODEL_NAME=qwen3:4b-instruct
```

Não configure o endpoint ou token em variáveis `VITE_*`: variáveis Vite são expostas no bundle do navegador.

## Próximas fases

1. Subir e proteger o servidor de inferência.
2. Configurar os secrets e publicar a Edge Function.
3. Testar conversas em português e a análise de dados financeiros.
4. Persistir histórico por usuário no Supabase com RLS.
5. Implementar ferramentas controladas para cálculos determinísticos e consultas financeiras, sem deixar o modelo inventar valores.
6. Avaliar desempenho, custo de hospedagem, limites por usuário e política de retenção dos dados.

A IA é uma ferramenta de organização e educação financeira; não substitui aconselhamento profissional nem acessa contas bancárias externas.
