# Atualização financeira — 03/11/2026

Esta branch prepara a estrutura do banco e conecta novos recursos à interface, sem apagar dados existentes.

## Passo 1 — já executado

O usuário confirmou que executou `supabase/upgrade_2026_11_03.sql` no SQL Editor. Esse script cria as tabelas:

- `installments`: compras parceladas;
- `card_limit_history`: histórico de alterações de limite;
- `goal_movements`: depósitos e retiradas das metas.

As três tabelas têm RLS habilitado e políticas que limitam cada registro ao usuário autenticado proprietário.

## Passo 2 — necessário para a central de notificações

Para ativar a central de notificações, execute também `supabase/notifications_2026_11_03.sql` no SQL Editor do mesmo projeto Supabase:

1. Abra o painel do Supabase e entre em **SQL Editor**.
2. Abra o arquivo `supabase/notifications_2026_11_03.sql` deste repositório.
3. Copie todo o conteúdo, cole no SQL Editor e clique em **Run**.
4. Confira se a tabela `notifications` foi criada.

Esse script é incremental, cria índice por usuário/data e habilita RLS para que cada pessoa veja e altere somente suas próprias notificações.

## Recursos conectados nesta branch

- Compras parceladas: valor total, quantidade, primeiro vencimento, cartão opcional, quantidade já paga e previsão de término.
- Cartões: edição do limite total, cálculo do disponível e histórico de alterações.
- Metas: depósitos e retiradas, com validação para impedir saldo guardado negativo e histórico das movimentações.
- Notificações: central com contador de não lidas, marcar uma ou todas como lidas e excluir avisos.

## Validação e publicação

O código está em uma branch de desenvolvimento e em um pull request. Ainda não foi mesclado em `main` nem publicado em produção. A validação de build e o teste manual no preview devem acontecer antes da publicação.

## Limites desta etapa

- Os avisos são registros dentro do site; notificações push no iPhone ainda exigem PWA, permissão do navegador e um serviço seguro de envio/agendamento.
- Os insights atuais são regras e cálculos locais com base nos dados cadastrados. Não são uma IA generativa e não usam API paga.
- Um painel administrativo exclusivo exige autorização verificada no servidor/banco; não deve ser protegido apenas escondendo um botão no navegador.
- Nunca coloque a chave `service_role` no frontend. Use somente a chave pública e mantenha RLS ativo.


## Painel ADM — publicação segura (etapa nova)

O painel administrativo usa a Edge Function `admin-panel`; a validação de administrador acontece no servidor, não apenas na interface. A conta autorizada é comparada com o secret `ADMIN_EMAIL`.

### Configuração necessária no Supabase

1. No projeto Supabase, abra **Edge Functions** e publique a função `admin-panel` a partir de `supabase/functions/admin-panel/index.ts` (ou publique pelo Supabase CLI).
2. Em **Edge Functions → Secrets**, configure:
   - `ADMIN_EMAIL` = o e-mail da conta administradora autorizada.
   - `APP_URL` = endereço público do Meu Financeiro, para o link de recuperação de senha.
3. O Supabase fornece `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente da função. Não copie a service role para o frontend, GitHub ou variáveis `VITE_*`.
4. Mantenha a verificação JWT da função habilitada.
5. Faça deploy do frontend desta branch após o build passar.

### O que o painel permite

- Consultar contas cadastradas (primeiras 100 por enquanto).
- Bloquear e desbloquear contas.
- Gerar link seguro de redefinição de senha para outra conta.
- A conta administradora não pode ser bloqueada por essa interface e o painel nunca mostra senhas.

A interface só exibe o menu para o e-mail administrativo configurado no código, mas isso não é a proteção real: toda chamada também é autenticada e autorizada pela Edge Function usando o token da sessão e o secret `ADMIN_EMAIL`. Se os dois e-mails não coincidirem, o painel não funciona.

### Limitações atuais

- Listagem paginada além das primeiras 100 contas ainda será adicionada.
- Alteração de dados de perfil, modo manutenção e relatórios agregados estão planejados para uma próxima etapa.
- O deploy da Edge Function exige configuração no projeto Supabase; criar o arquivo no GitHub não a publica automaticamente.
