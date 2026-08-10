# Registro de qualidade — v0.2.0

## Situação

**Candidata aprovada localmente. Publicação e smoke test público pendentes.**

## Escopo

- versão da aplicação: `0.2.0`;
- schema persistente preservado em `1.0.0`;
- publicação do progresso oficial para o Concept Compass;
- observação ativa do Assunto de origem;
- arquivamento/restauração, renomeação/movimentação e exclusão vinculada;
- retorno seguro ao Concept Compass em nova aba;
- nenhuma migração estrutural dos dados do Study Stack.

## Verificação automatizada

- arquivos JavaScript verificados: 121;
- testes aprovados: 188;
- falhas: 0.

## Regressão integrada

| Caso | Resultado |
| --- | --- |
| I8-T01–T04 — contexto, progresso e agregação | OK |
| I8-T05 — arquivamento e restauração hierárquicos | OK |
| I8-T06 — renomeação e movimentação ao vivo | OK |
| I8-T07 — exclusão vinculada e estado próprio | OK |
| I8-T08–T09 — migrações e falhas protegidas | OK |

O reteste de I8-T05 confirmou a preservação da aba observadora, o retorno ao Concept Compass em nova aba e a liberação automática após restaurar Matéria, Tema ou Assunto.

## Reteste público necessário

1. abrir a URL geral sem parâmetros;
2. confirmar o botão para o Concept Compass em nova aba;
3. abrir um Assunto pelo contrato público;
4. validar progresso, arquivamento, restauração, renomeação e movimentação;
5. validar exclusão permanente vinculada;
6. conferir versão, favicon, responsividade, persistência, backup e Console.
