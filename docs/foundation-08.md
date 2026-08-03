# Fundação 08 — Registros de Erro

## Objetivo

Ativar o ciclo completo dos Registros de Erro a partir das questões incorretas
importadas do Test Quest, preservando a ocorrência original, a análise
metacognitiva, as revisões, as reincidências e as evidências posteriores de
superação.

## Entidades ativadas

- `Record` do tipo `error_record`;
- `ErrorRecord` para o estado consolidado do erro;
- `ErrorOccurrence` para a ocorrência inicial e cada reincidência;
- `ErrorEvidence` para respostas posteriores usadas na sequência de superação;
- eventos funcionais no `HistoryEvent`;
- vínculos reversos em `ImportedQuestion.errorRecordIds`.

## Criação a partir do Test Quest

Uma questão pode originar um Registro de Erro quando:

- pertence ao assunto atualmente aberto;
- possui resultado `incorrect`;
- foi selecionada explicitamente pelo usuário;
- ainda não possui um registro criado pela mesma operação inicial.

A criação é atômica. Record, ErrorRecord, ocorrência inicial, vínculo da
questão e evento histórico são gravados juntos. Questões corretas ou não
respondidas não podem iniciar um erro.

## Análise metacognitiva

O editor separa três campos centrais:

1. por que o erro aconteceu;
2. qual é a regra ou o conceito correto;
3. como evitar o mesmo erro.

A análise pode permanecer como rascunho. O Record passa a `completed` somente
quando os três campos estão preenchidos e existe um título válido. Categorias
do erro, observações e vínculos com Resumos ou Anotações do mesmo assunto são
opcionais.

Se uma análise revisada voltar a ficar incompleta, o erro retorna ao estado
`pending`, pois uma revisão válida exige análise completa.

## Revisão

- um erro começa como `pending`;
- somente uma análise completa pode ser marcada como `reviewed`;
- cada nova marcação como revisado incrementa `reviewCount`;
- reabrir a revisão não apaga revisões anteriores;
- uma reincidência sempre devolve o erro para `pending`.

## Reincidência

A ação **Errei de novo** exige outra questão incorreta real do mesmo assunto.
Ela:

- cria uma nova `ErrorOccurrence`;
- incrementa `recurrenceCount`;
- preserva a análise existente;
- reinicia a sequência correta;
- invalida, sem apagar, as evidências da janela anterior;
- remove temporariamente o estado de superação;
- sugere nova revisão da causa e da estratégia.

A mesma questão importada não pode representar duas ocorrências do mesmo erro.

## Superação

Uma resposta correta real do mesmo assunto pode ser registrada como
`ErrorEvidence`. A mesma questão não pode contar duas vezes na mesma janela.

- primeiro acerto: sequência `1/2`;
- segundo acerto distinto e consecutivo: sequência `2/2` e estado `overcome`;
- após a superação, novas evidências ficam bloqueadas até existir uma
  reincidência;
- reincidência posterior reinicia a sequência sem apagar o histórico antigo.

Revisão e superação são dimensões diferentes. Um erro pode estar revisado sem
estar superado, ou superado mantendo seu histórico de revisão.

## Progresso

A versão do cálculo foi atualizada para `1.1.0`.

### Análise de erros

- um ponto por ErrorRecord ativo com análise completa;
- máximo de dois pontos;
- arquivar o Record suspende a evidência sem apagar o erro.

### Revisão

- um ponto quando existe ao menos um erro ativo marcado como revisado;
- um ponto quando existe ao menos um erro ativo superado;
- máximo de dois pontos.

O fingerprint inclui análise, revisão, reincidência, sequência correta e data
de superação para recalcular o snapshot somente quando as evidências mudarem.

## Interface

A seção Registros de Erro oferece:

- indicadores de pendentes, reincidentes, revisados e superados;
- grupos visuais exclusivos por estado atual;
- busca e filtro;
- cards com questão de origem, reincidências, revisões e sequência `0/2` a
  `2/2`;
- editor de análise e vínculos;
- autosave temporário, recuperação após fechamento e descarte explícito;
- ações para revisar, reabrir, registrar reincidência e registrar acerto;
- histórico resumido de ocorrências e evidências;
- superfícies próprias para estados recorrentes e superados em temas claro e
  escuro;
- adaptação para desktop e telas estreitas.

## Integridade

A validação do estado confirma:

- relação 1:1 entre Record e ErrorRecord;
- existência do Subject e das questões vinculadas;
- vínculos reversos entre questões e erros;
- pertencimento de ocorrências e evidências ao erro correto;
- ocorrência-base da evidência;
- coerência entre contadores, revisão, sequência e domínio;
- ausência de referências entre assuntos diferentes.

## Limite desta fundação

A integração funcional com o Flashcore continua apenas preparada. Revisões de
flashcards ainda não alimentam automaticamente os erros. Backup, restauração e
diagnóstico completo também permanecem para os próximos marcos.
