# Registro de qualidade — v0.1.1

## Situação

**Patch candidato aprovado tecnicamente para teste público.**

## Escopo

- versão da aplicação: `0.1.1`;
- schema persistente: `1.0.0`;
- substituição da entrada técnica sem contexto por uma tela orientativa;
- novo ícone oficial em SVG e PNG;
- aplicação do ícone no cabeçalho, favicon e tela pública;
- nenhuma alteração nas regras de pontuação ou nas entidades salvas.

## Verificação automatizada

- arquivos JavaScript verificados: 110;
- testes aprovados: 168;
- falhas: 0.

## Cobertura específica do patch

- texto público não expõe contrato, parâmetros ou contexto de desenvolvimento;
- botão principal utiliza o endereço seguro do Concept Compass;
- modo sem contexto oculta navegação e cabeçalho de assunto indisponíveis;
- cabeçalho e favicon utilizam o novo ícone;
- ação principal ocupa toda a largura em telas pequenas;
- versão `0.1.1` consistente no pacote, lock e configuração.

## Reteste público necessário

1. abrir a URL geral sem parâmetros;
2. confirmar que a tela não parece um erro;
3. testar o botão **Abrir Concept Compass**;
4. abrir `?dev#/overview` e validar o contexto de desenvolvimento;
5. abrir com contrato válido e confirmar o fluxo normal;
6. validar favicon, responsividade e Console.
