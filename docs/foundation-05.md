# Fundação 05 — Anotações

## Objetivo

Implementar a entidade específica `Note` e transformar a seção Anotações em
uma área funcional, preservando o ciclo de vida de `Record`, o armazenamento
versionado e as decisões aprovadas no protótipo.

## Entregas

- domínio `Note` com validação própria;
- editor completo de Anotações;
- conteúdo rico sanitizado e pesquisável;
- marca-texto persistente por meio da tag segura `mark`;
- conclusão condicionada a título e conteúdo válidos;
- autosave em `draftBuffers` e recuperação de edição;
- fluxo `Apenas um detalhe` com criação atômica;
- título automático derivado do primeiro trecho útil;
- expansão posterior do detalhe no editor completo;
- checklists textuais usando `[ ] item` e `[x] item`;
- contagem visual de itens, sem criar entidades de tarefa;
- vínculos entre registros do mesmo assunto;
- preservação do vínculo quando o registro relacionado é arquivado;
- validação estrutural das relações `Record 1:1 Note`;
- cards com prévia, prontidão, checklists, vínculos e origem rápida;
- eventos de histórico para edição, vínculos e detalhe rápido.

## Regras preservadas

- Anotação não pode mudar de tipo nem de assunto;
- conclusão exige título e conteúdo;
- rascunhos podem permanecer incompletos;
- vínculos só apontam para registros existentes do mesmo assunto;
- a Anotação não pode vincular a si mesma;
- checklists permanecem parte do conteúdo textual;
- `Apenas um detalhe` cria uma Anotação normal, não um tipo separado;
- arquivamento não remove o conteúdo específico nem os vínculos.

## Verificação

Execute:

```bash
npm run check
```

A suíte cobre domínio, serviço, busca, conclusão, vínculos, criação rápida,
expansão e compatibilidade com o estado v1.
