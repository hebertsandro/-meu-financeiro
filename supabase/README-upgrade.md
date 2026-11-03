# Atualização financeira — 03/11/2026

Esta branch prepara a estrutura do banco para os próximos recursos sem apagar dados existentes.

## Passo obrigatório no Supabase

1. Abra o painel do seu projeto Supabase.
2. Entre em **SQL Editor**.
3. Abra o arquivo `supabase/upgrade_2026_11_03.sql` deste repositório.
4. Copie todo o conteúdo, cole no SQL Editor e execute.
5. Confira se as tabelas `installments`, `card_limit_history` e `goal_movements` foram criadas.

O script é incremental: não recria nem apaga as tabelas atuais. As três novas tabelas têm RLS habilitado e políticas que limitam cada registro ao usuário autenticado proprietário.

## O que esta etapa prepara

- Compras parceladas: valor total, quantidade de parcelas, primeiro vencimento e quantidade já paga.
- Histórico de alterações de limite dos cartões.
- Histórico de depósitos e retiradas das metas.

## Importante

Esta etapa **não publica alterações no site em produção** e não ativa notificações push, painel administrativo ou IA generativa. O assistente financeiro planejado será inicialmente baseado em regras e cálculos locais, sem API paga. O painel administrativo exigirá autorização verificada no servidor/banco; não deve ser protegido apenas escondendo um botão no navegador.

Depois de executar o SQL, a próxima etapa é conectar essas tabelas à interface, testar e só então publicar.
