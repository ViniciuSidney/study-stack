# Fundação 02: schema, persistência e Subject

## Objetivo

Transformar a fundação visual em uma aplicação capaz de inicializar, validar e
persistir o primeiro estado real do domínio, sem implementar ainda os
formulários de Resumos, Anotações, Exercícios ou Erros.

## Estado raiz

Chave local:

```text
study-stack:v1:state
```

Estrutura principal:

```text
schemaVersion
appVersion
createdAt
updatedAt
collections
migrationHistory
integrity
```

As coleções são objetos indexados por ID. O código de domínio não acessa o
`localStorage` diretamente.

## Coleções preparadas

- subjects
- records
- summaries
- notes
- importedSessions
- importedQuestions
- errorRecords
- errorOccurrences
- errorEvidences
- historyEvents
- progressSnapshots
- pendingImports
- draftBuffers
- technicalLogs
- settings
- integrationState

## Contexto Concept Compass 1.0.0

Campos obrigatórios:

- contractVersion
- sentAt
- sourceApp igual a `concept_compass`
- matterId e matterName
- themeId e themeName
- subjectId e subjectName
- sourceArchived

O retorno é aceito somente para origens permitidas. O contexto pode chegar por
parâmetros individuais ou pelo parâmetro JSON `subjectContext`.

## Sincronização do Subject

Na primeira abertura válida, o assunto é criado e recebe um evento de histórico.
Em aberturas seguintes, nomes e metadados de origem podem ser sincronizados sem
apagar Visão Geral, progresso, consolidação ou outras informações internas.

## Compatibilidade

A antiga chave `study-stack:preferences` é migrada uma única vez para
`collections.settings.global.ui` e removida após gravação bem-sucedida.

## Limites desta entrega

- nenhuma criação real de registros;
- nenhum cálculo de progresso;
- nenhuma importação do Test Quest;
- nenhum backup ou restauração funcional;
- nenhuma migração entre versões ainda necessária.
