# Fundação 03 — Record e ciclo básico de vida

## Objetivo

Implementar a entidade base `Record` e as primeiras operações reais da
v0.1-A sem antecipar os editores completos de Resumos e Anotações.

## Entregas

- modelo `Record` com IDs permanentes;
- criação manual de `summary` e `note`;
- skeleton 1:1 nas coleções `summaries` e `notes`;
- edição de título, data de estudo, tags, importância e observações;
- estados `draft`, `in_progress` e estrutura protegida para `completed`;
- tipo e assunto imutáveis;
- arquivamento lógico e restauração;
- pesquisa normalizada por título, tags e observações;
- eventos funcionais no histórico;
- atualização de `Subject.lastActivityAt`;
- contadores reais na sidebar e na Visão Geral;
- telas funcionais de Resumos, Anotações, Histórico e Arquivados;
- modal de criação e edição;
- confirmação de arquivamento;
- toasts acima de modais nativos.

## Limite desta fundação

Os registros de Resumo e Anotação já possuem entidades específicas vazias,
mas seus editores de conteúdo ainda não estão ativos. Por isso, a interface
permite trabalhar com `draft` e `in_progress`. A conclusão só será liberada
quando o serviço específico confirmar que o conteúdo obrigatório está válido.

Listas importadas e Registros de Erro não podem ser criados manualmente. Esses
tipos continuam reservados às integrações e aos fluxos próprios.

## Operações de Record

- `create`
- `update`
- `changeStatus`
- `toggleImportant`
- `archive`
- `restore`
- `listBySubject`
- `getCounts`
- `listHistory`

Cada mutação ocorre em uma transação do `StateRepository` e produz um evento
de histórico quando representa uma ação funcional.

## Testes manuais recomendados

1. Abrir a aplicação com o contexto de desenvolvimento.
2. Criar um Resumo em Rascunho.
3. Criar uma Anotação em Em andamento.
4. Editar título, data, tags e observações.
5. Marcar e desmarcar um registro como importante.
6. Usar busca e filtro de status.
7. Arquivar após a confirmação.
8. Restaurar pela seção Arquivados.
9. Conferir os eventos na seção Histórico.
10. Recarregar a página e confirmar a persistência.
11. Repetir os fluxos no tema escuro e em 360, 390, 412, 768 px e desktop.
12. Testar `?noContext=1` e confirmar que a criação permanece bloqueada.

## Verificação automatizada

```bash
npm run check
```

A conclusão deve apresentar todos os arquivos JavaScript válidos e todos os
testes aprovados.

## Próxima fundação

A Fundação 04 deverá implementar o conteúdo específico de Resumos, incluindo
editor controlado, validação de conclusão, marca Estudado e campos opcionais.
