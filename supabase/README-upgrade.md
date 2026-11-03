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
