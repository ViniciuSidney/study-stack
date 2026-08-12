# Validação da integração com o Test Quest

## Situação

**Fluxo conjunto aprovado localmente em 12 de agosto de 2026.**

Este registro complementa o contrato `test-quest-contract-v1.1.md` com o fluxo
de ida e volta validado entre as branches `dev` do Study Stack e do Test Quest.

## Fluxo aprovado

1. O Assunto abre **Exercícios** e cria uma lista no Test Quest.
2. O Test Quest recebe o contexto, abre diretamente **Preparar resolução** e
   mostra o vínculo com o Study Stack.
3. O nome sugerido segue `Assunto — Lista N`, mas permanece editável.
4. A sequência é preservada como metadado, independentemente do título.
5. Ao concluir, **Salvar no Study Stack e voltar** entrega o resultado.
6. O Study Stack abre **Exercícios**, localiza o card, rola até ele, aplica
   destaque temporário e confirma **Resultado salvo no Study Stack.**

## Numeração e colisões

A próxima sequência considera:

- o maior `sourceListSequence` estruturado já importado;
- números de títulos canônicos no formato `Assunto — Lista N`;
- somente títulos pertencentes ao mesmo Assunto.

Títulos personalizados fora do formato canônico não são interpretados. A regra
evita sugestões visíveis duplicadas sem transformar o título editável na fonte
oficial da sequência.

## Consumo, recuperação e segurança

- `sourceSessionId` identifica a sessão e impede importação duplicada;
- atualizar a página não recria o card;
- um handoff bem-sucedido é removido após a persistência confirmada;
- se o Assunto estiver indisponível, o resultado permanece preservado para
  recuperação, em vez de ser descartado;
- o card é identificado por seu ID interno, não pelo título;
- a URL de origem continua disponível pela ação **Abrir Test Quest**;
- abertura direta do Test Quest não herda vínculo de uma sessão concluída.

## Interface validada

- uma coluna para cards de listas entre as larguras intermediárias até
  `1300px`;
- duas colunas acima de `1300px`;
- título, selos e métricas permanecem legíveis;
- destaque respeita a preferência de movimento reduzido.

## Evidências

| Verificação | Resultado |
|---|---|
| Entrada direta na importação vinculada | OK |
| Assunto, sequência e nome sugerido | OK |
| Título editável sem perda da sequência | OK |
| Proteção contra título canônico duplicado | OK |
| Retorno ao Assunto e à seção Exercícios | OK |
| Rolagem, foco, destaque e confirmação | OK |
| Pontuação correta, parcial e incorreta | OK |
| Consumo único após recarregar | OK |
| Abertura direta do Test Quest sem vínculo | OK |
| Responsividade entre 1100px e 1300px | OK |

## Verificação automatizada

- 207 testes aprovados;
- 123 arquivos JavaScript verificados;
- nenhuma mudança de schema persistente;
- configuração local temporária restaurada após a validação.

## Próximo passo de publicação

Antes de integrar `dev` em `main`:

1. comparar o diff final da branch;
2. repetir as suítes automatizadas em ambos os projetos;
3. realizar o merge do Study Stack e do Test Quest na mesma janela de
   publicação;
4. executar um smoke test nas URLs públicas;
5. registrar qualquer incompatibilidade antes de criar tags ou releases.
