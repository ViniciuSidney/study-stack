# Fundação 07 — Exercícios importados do Test Quest

## Objetivo

Ativar a seção Exercícios com dados reais, preservando o resultado original do
Test Quest e conectando sessões válidas ao cálculo objetivo de prática.

## Contrato aceito

Envelopes `testQuestSessionResult`, versões `1.0.0` e `1.1.0`:

- `contractVersion`;
- `sentAt`;
- `sourceApp: test_quest`;
- `sessionId`;
- `subjectContext.subjectId`;
- `session` com título e data;
- `questions` com enunciado, respostas, correção e resultado;
- `resultUrl` e `payloadFingerprint` opcionais.

O contrato `1.1.0` acrescenta `partial` e `scorePercentage`, mantendo a
compatibilidade com o `1.0.0`. A especificação completa e seus exemplos estão
em [`test-quest-contract-v1.1.md`](test-quest-contract-v1.1.md).

O adaptador aceita o contrato por:

1. parâmetro `testQuestResult` ou `testQuestPayload` na URL;
2. handoff em `localStorage` pela chave
   `study-stack:handoff:test-quest:v1`;
3. arquivo JSON ou texto colado no importador manual.

## Entidades ativadas

- `Record` do tipo `imported_session`;
- `ImportedSession`;
- `ImportedQuestion`;
- `PendingImport` para vínculo ausente, contrato inválido ou reimportação
  divergente;
- eventos `imported` e `edited` no histórico.

## Regras implementadas

- importação atômica de Record, sessão, questões e histórico;
- validação do contrato e do assunto aberto;
- snapshot original imutável separado das observações pessoais;
- cálculo das estatísticas pelas questões normalizadas;
- idempotência por `sourceSessionId` e `payloadFingerprint`;
- resultado idêntico não duplica dados;
- resultado divergente com o mesmo ID é preservado para revisão;
- sessão com ao menos 15 respostas concede um ponto de Prática;
- arquivar a lista suspende sua evidência no próximo cálculo;
- observação pessoal da lista pode ser editada sem alterar o snapshot;
- questões incorretas ficam identificadas para a Fundação 08.

## Interface

A seção Exercícios oferece:

- indicadores agregados;
- busca por título, enunciado, resposta e correção;
- filtros por validade e existência de erros;
- cards de sessão com aproveitamento e contagens;
- modal detalhado com filtros de questões;
- importador de arquivo ou JSON colado;
- payload demonstrativo apenas em `localhost` e `127.0.0.1`.

## Limite desta fundação

A Fundação 07 preserva e apresenta todas as evidências necessárias, mas ainda
não cria Registros de Erro. A análise, revisão, reincidência e superação serão
ativadas na Fundação 08.
