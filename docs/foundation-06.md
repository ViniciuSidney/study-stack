# Fundação 06 — Visão Geral e Progresso

## Objetivo

Transformar a Visão Geral em uma área funcional do assunto e iniciar o cálculo
de progresso baseado em evidências persistidas, sem usar percepção manual como
pontuação automática.

## Entregas

- motor de progresso versionado em `1.0.0`;
- `ProgressSnapshot` persistido por assunto;
- fingerprint determinística para evitar recálculos e gravações repetidas;
- histórico `progress_changed` somente quando a pontuação muda;
- Visão Geral com pontuação, percentual e cinco categorias;
- campos manuais de próximo passo, dificuldade, percepção e evolução;
- domínio percebido de 0 a 100, separado da pontuação objetiva;
- alteração manual do estado do assunto;
- botão compacto de progresso funcional no cabeçalho;
- registros importantes, recentes e atividade recente na tela inicial;
- validação referencial dos snapshots no estado v1.

## Regra de progresso 1.0.0

A meta padrão permanece em 10 pontos:

- Base, máximo 2:
  - 1 ponto por existir ao menos um Resumo ativo e concluído com conteúdo;
  - 1 ponto adicional por existir um desses Resumos marcado como estudado.
- Prática, máximo 3:
  - 1 ponto por sessão válida importada, até o limite da categoria;
  - a sessão é válida quando possui ao menos 15 respostas.
- Análise de erros, máximo 2:
  - 1 ponto por Registro de Erro com análise completa, até o limite.
- Revisão, máximo 2:
  - 1 ponto quando existe erro revisado;
  - 1 ponto adicional quando existe erro superado.
- Consolidação, máximo 1:
  - depende de confirmação manual após os 9 pontos anteriores.

Na Fundação 06, somente as evidências de Base podem ser produzidas pela
interface atual. As demais categorias já possuem contrato calculável, mas serão
alimentadas pelas próximas fundações.

## Separação entre percepção e evidência

`overview.perceivedMastery` representa a percepção do estudante e não altera o
`ProgressSnapshot`. O progresso objetivo usa apenas entidades persistidas e
referências de evidência.

## Cache e atualização

O snapshot é recalculado quando seu fingerprint muda. O fingerprint considera:

- Records relevantes e seus estados;
- conteúdo e marca de estudo dos Resumos;
- sessões importadas;
- Registros de Erro;
- configuração de progresso;
- confirmação ou suspensão da consolidação.

Abrir repetidamente a Visão Geral sem alterações reutiliza o snapshot atual e
não cria novos eventos no Histórico.

## Compatibilidade

O schema de armazenamento permanece em `1.0.0`. A coleção
`progressSnapshots` já existia vazia, portanto não foi necessária migração.
Estados anteriores são atualizados de forma incremental na primeira abertura.

## Testes principais

- progresso vazio não recebe pontos;
- Resumo concluído concede o primeiro ponto de Base;
- marca Estudado concede o segundo ponto de Base;
- arquivamento remove a evidência do cálculo;
- fingerprint estável evita snapshots duplicados;
- edição da Visão Geral preserva campos e histórico;
- domínio percebido fora de 0 a 100 é rejeitado;
- snapshots inválidos ou órfãos são rejeitados pelo estado.

## Correção de layout do modal

Após a validação visual, o modal de edição da Visão Geral recebeu uma correção
para telas com menor altura útil:

- diálogo e card interno usam o mesmo limite vertical;
- somente o corpo central possui rolagem;
- cabeçalho e rodapé permanecem fora da área rolável;
- o card interno recorta qualquer excedente antes que ele alcance o rodapé;
- os botões Cancelar e Salvar permanecem integralmente visíveis.

## Ajuste de visibilidade da percepção pessoal

Após a validação funcional, o domínio percebido passou a ser exibido como um
indicador secundário e discreto no canto superior da área de progresso:

- indicador compacto identificado como `Percepção pessoal`;
- valor de 0% a 100%, incluindo corretamente o valor 0%;
- barra curta independente do progresso objetivo;
- explicação disponível no texto acessível e ao passar o cursor;
- estado `Não informado` quando o campo ainda não foi preenchido;
- adaptação responsiva sem interromper o fluxo entre pontuação e categorias.
