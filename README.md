# Meu Financeiro — site público com contas privadas

Aplicação React + Vite com visual moderno e responsivo. Qualquer pessoa pode abrir o site e criar uma conta; cada usuário vê e altera apenas os próprios registros, protegidos por autenticação e políticas RLS do Supabase.

## Funcionalidades
- Cadastro e login com e-mail e senha.
- Painel com saldo, entradas e gastos do mês.
- Registro de movimentações com data e categoria.
- Cartões com limite e valor utilizado.
- Contas e dívidas com vencimento e status.
- Metas financeiras com barra de progresso.
- Gráficos de fluxo financeiro e gastos por categoria.
- Interface adaptada para celular e computador.

## 1. Criar e configurar o Supabase
1. Crie um projeto em https://supabase.com/.
2. No painel do projeto, abra **SQL Editor**.
3. Execute todo o conteúdo do arquivo `supabase/schema.sql`.
4. Em **Authentication → Sign In / Providers**, deixe o provedor **Email** habilitado para que o público possa se cadastrar.
5. Em **Authentication → URL Configuration**, configure a URL do site e os endereços de redirecionamento. Durante desenvolvimento, inclua `http://localhost:5173/**`; depois, inclua o domínio publicado.
6. Se a confirmação por e-mail estiver habilitada, os novos usuários precisam confirmar o e-mail antes de entrar. Configure o provedor de e-mail do Supabase conforme sua necessidade.

## 2. Configurar o site
1. Instale Node.js LTS.
2. Copie `.env.example` para `.env`.
3. No Supabase, em **Project Settings → API** (ou Connect), copie a **Project URL** e a chave pública **anon/publishable** para o `.env`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

4. Na pasta do projeto, rode:

```bash
npm install
npm run dev
```

Abra o endereço que o Vite mostrar no terminal (normalmente `http://localhost:5173`).

## 3. Publicar
- Envie a pasta para um repositório GitHub.
- Importe o repositório na plataforma de hospedagem escolhida.
- Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` como variáveis de ambiente de build.
- Comando de build: `npm run build`.
- Publique o conteúdo gerado na pasta `dist` em uma hospedagem compatível com sites estáticos.
- Configure o domínio publicado em **Supabase → Authentication → URL Configuration**.

## Segurança — importante
- Nunca coloque `service_role`, senha do banco ou qualquer chave secreta no frontend. Use apenas a chave pública anon/publishable.
- Execute o SQL fornecido e mantenha RLS habilitado nas quatro tabelas. As políticas limitam cada registro ao usuário autenticado correspondente.
- Não remova as políticas RLS e não exponha dados financeiros em páginas públicas.
- Não cadastre número completo de cartão, CVV, senha bancária ou credenciais de banco. O campo de cartão é apenas para controle manual do limite e do valor usado.
- Faça backups regulares. Os relatórios são educativos e não substituem orientação financeira profissional.

## Estrutura
- `src/App.jsx` — telas, autenticação e funcionalidades.
- `src/styles.css` — identidade visual e layout responsivo.
- `src/supabase.js` — conexão com Supabase.
- `supabase/schema.sql` — tabelas, restrições e políticas de segurança.
