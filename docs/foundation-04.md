# Fundação 04 — Editor real de Resumos

## Objetivo

Implementar o conteúdo específico de `Summary` sobre o ciclo de vida de
`Record`, permitindo construir, salvar, concluir, reabrir e marcar como
estudado um Resumo real sem acoplar o domínio à interface ou ao
`localStorage`.

## Entregas

- modelo de conteúdo rico `sanitized_html` versionado;
- sanitização por lista restrita de elementos permitidos;
- `plainText` separado para pesquisa, prévia e acessibilidade;
- editor visual com títulos, ênfase, listas, citação e tabela simples;
- conteúdo principal do Resumo;
- campos opcionais de objetivo, conceitos, exemplos, dúvidas e síntese;
- tipo e descrição da fonte;
- referências textuais ou links, uma por linha;
- marca `Estudado` independente do status do registro;
- histórico de marcações e desmarcações de estudo;
- conclusão permitida somente com título e conteúdo principal válidos;
- reabertura de Resumo concluído;
- índice de pesquisa atualizado com todo o conteúdo do Resumo;
- autosave de edição na coleção `draftBuffers`;
- recuperação de rascunho após fechamento ou interrupção acidental;
- descarte explícito das alterações temporárias;
- cards com prévia, prontidão para conclusão e marca de estudo;
- layout responsivo e rolagem interna do editor.

## Conteúdo rico

A v0.1 utiliza o formato `sanitized_html` com versão `1.0.0`. Apenas os
seguintes elementos são aceitos:

- parágrafos e quebras de linha;
- títulos de nível 2 e 3;
- negrito, itálico e sublinhado;
- listas ordenadas e não ordenadas;
- citações;
- tabelas simples.

Scripts, estilos inline, eventos HTML, formulários, iframes, SVG e outros
elementos executáveis são removidos antes da persistência. O conteúdo também
mantém uma representação `plainText`, usada por busca, cards e recursos de
acessibilidade.

## Regras de conclusão

Um Resumo pode permanecer como `draft` ou `in_progress` incompleto. Para
mudar para `completed`, deve possuir:

1. título não vazio no `Record`;
2. conteúdo principal com texto significativo no `Summary`.

Campos de aprofundamento, fonte e referências continuam opcionais. A marca
`Estudado` não conclui o registro e a conclusão não marca automaticamente o
Resumo como estudado.

## Rascunhos de edição

O editor salva um buffer temporário identificado por tipo e ID do registro.
Esse buffer:

- preserva o estado original da primeira abertura;
- recebe o estado de trabalho após alterações;
- pode ser recuperado ao reabrir o mesmo Resumo;
- é removido após salvamento definitivo ou descarte explícito;
- possui expiração técnica de 30 dias;
- não substitui o `Summary` persistente enquanto o usuário não confirmar o
  salvamento final.

## Testes manuais recomendados

1. Criar um novo Resumo e confirmar a abertura automática do editor.
2. Salvar um Resumo incompleto como Rascunho.
3. Tentar concluir sem conteúdo principal e conferir a validação.
4. Inserir títulos, listas, citações e uma tabela simples.
5. Preencher e recolher os campos opcionais.
6. Informar fonte e referências.
7. Concluir o Resumo e depois reabri-lo como Em andamento.
8. Marcar e desmarcar como estudado sem alterar o status.
9. Pesquisar por uma palavra presente apenas no conteúdo do Resumo.
10. Fechar o editor após alterar algo e confirmar a recuperação do rascunho.
11. Descartar alterações e confirmar que o estado persistente não mudou.
12. Arquivar o Resumo e confirmar que o buffer temporário é removido.
13. Repetir os fluxos nos temas claro e escuro.
14. Conferir desktop, 360, 390, 412 e 768 px, além de baixa altura.

## Verificação automatizada

```bash
npm run check
```

A entrega inclui testes de sanitização, conteúdo rico, domínio de Summary,
conclusão, busca, marca de estudo, histórico e buffers recuperáveis.

## Próxima fundação

A Fundação 05 deverá implementar o editor real de Anotações, incluindo o
fluxo `Apenas um detalhe`, vínculos entre registros do mesmo assunto e
checklists textuais.
