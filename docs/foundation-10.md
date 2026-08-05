# Fundação 10 — Fluxo Guiado de Consolidação

## Objetivo

Transformar a pontuação de 10 pontos em um roteiro de uso compreensível, sem
retirar a autonomia do estudante. O sistema deixa de apresentar somente um
placar e passa a indicar o próximo passo sustentado pelas evidências reais do
assunto.

## Etapas do roteiro

O caminho padrão possui cinco etapas:

1. Base, até 2 pontos;
2. Prática, até 3 pontos;
3. Análise de erros, até 2 pontos;
4. Revisão, até 2 pontos;
5. Consolidação, 1 ponto.

A ordem serve como orientação. A navegação geral da aplicação permanece livre.

## Estados separados

O roteiro diferencia três estados:

- **etapa atual**: escolhida conscientemente pelo usuário;
- **etapa recomendada**: primeira etapa incompleta calculada pelas evidências;
- **etapa consultada**: selecionada temporariamente na trilha para leitura.

Consultar uma etapa não altera a etapa atual. A mudança exige a ação explícita
`Tornar etapa atual` ou o botão de prosseguimento.

## Avanço manual

Concluir uma etapa não provoca avanço automático. Quando a próxima etapa fica
disponível:

- a etapa atual é preservada;
- um toast é mostrado uma única vez para aquela combinação de evidências;
- a Visão Geral apresenta um aviso discreto;
- o usuário decide quando clicar em `Prosseguir`.

Etapas futuras só podem se tornar atuais quando todas as etapas anteriores
estiverem completas. Etapas anteriores podem ser retomadas a qualquer momento.

## Regressão de evidências

Arquivar ou invalidar uma evidência pode tornar uma etapa anterior incompleta.
Nesse caso:

- a etapa atual não é alterada automaticamente;
- a etapa mais antiga incompleta passa a ser recomendada;
- um aviso explícito explica a regressão;
- o usuário pode retornar à etapa recomendada manualmente.

Uma consolidação já confirmada passa para `suspended` quando os nove pontos
anteriores deixam de estar ativos. Restaurar os pontos não reconfirma a
consolidação automaticamente.

## Interface da Visão Geral

A Visão Geral apresenta:

- um único card principal de roteiro;
- trilha compacta com as cinco etapas;
- destaque da etapa atual;
- indicação da etapa recomendada;
- estados concluídos acessíveis;
- pontuação geral integrada ao próprio roteiro;
- círculo de progresso, estado do assunto, recálculo e percepção pessoal ao lado da trilha;
- pontuação da etapa consultada com barra visual dinâmica;
- ação principal contextual;
- explicação visível quando uma etapa está bloqueada;
- botão `Como conquistar estes pontos?`;
- ausência de um segundo painel redundante de Pontuação Objetiva.

O modal de ajuda informa as evidências já conquistadas, o que ainda falta e a
próxima ação possível.

## Integração com o Test Quest

A ação de Prática abre o Test Quest em uma nova aba e envia o contexto do
assunto por parâmetros de URL:

- matéria;
- tema;
- assunto;
- identificadores permanentes;
- URL de retorno ao Study Stack.

O Study Stack permanece aberto. Resultados ainda podem ser importados pelo
contrato já existente.

## Caminho alternativo sem erros

Uma prática correta não deve criar um bloqueio nem exigir um erro fictício. O
usuário pode selecionar questões corretas que foram:

- difíceis;
- demoradas;
- respondidas com insegurança;
- acertadas por eliminação ou acaso.

Cada verificação metacognitiva registra:

- por que a questão exigiu atenção;
- qual foi o raciocínio correto;
- como reconhecer o padrão no futuro.

Duas verificações completas podem sustentar os dois pontos de Análise. Uma
revisão explícita sustenta o primeiro ponto de Revisão, e a confirmação com
outra questão correta sustenta o segundo.

Verificações cuja prática de origem foi arquivada permanecem históricas, mas
não concedem pontos e não aceitam novas revisões.

## Consolidação final

A consolidação exige os nove pontos anteriores. O modal final apresenta as
evidências de Base, Prática, Análise e Revisão e exige uma confirmação
consciente do usuário.

A confirmação nunca é automática. Depois de consolidado, o roteiro permanece
visível para consulta do caminho percorrido.

## Persistência

O `Subject` passa a possuir `guidedFlow`, contendo:

- versão do roteiro;
- etapa atual;
- chaves de avisos já apresentados;
- verificações metacognitivas;
- data da última mudança de etapa;
- data da última atualização.

Subjects criados antes desta fundação recebem o roteiro padrão por
normalização, sem alteração da versão do schema raiz.

## Critérios validados

- avanço somente por decisão do usuário;
- bloqueio de etapas futuras sem pré-requisitos;
- retorno livre a etapas anteriores;
- recomendação da etapa mais antiga incompleta;
- aviso de avanço exibido uma única vez;
- caminho alternativo sem erros fictícios;
- perda de pontos ao arquivar a prática de origem;
- consolidação manual em 10 pontos;
- suspensão ao perder evidências anteriores;
- vínculos metacognitivos validados pelo estado;
- interface adaptada para desktop e mobile.
