# Study Stack v0.1.1

Primeira versão pública recomendada do Study Stack, o caderno conectado do ecossistema de estudos.

## Destaques

- organização permanente por assunto do Concept Compass;
- Resumos e Anotações com autosave recuperável;
- importação de práticas do Test Quest;
- análise completa de erros, reincidências e superação;
- caminho metacognitivo para práticas sem erros;
- roteiro visual até a consolidação em 10/10;
- backup, restauração, diagnóstico e histórico;
- temas claro e escuro, responsividade e acessibilidade essencial;
- nova tela pública que orienta o usuário a começar pelo Concept Compass;
- identidade visual própria com ícone de cartões de estudo empilhados.

## Correção principal do patch

A abertura direta do GitHub Pages não parece mais uma falha técnica. Quando nenhum assunto é recebido, a aplicação explica de forma simples que o fluxo começa no Concept Compass e oferece um botão direto para acessá-lo.

## Antes de atualizar

Crie um backup em **Configurações → Criar backup**. A versão mantém o schema local `1.0.0` e valida o estado antes de cada gravação.

## Validação

- 168 testes automatizados aprovados;
- 12 blocos manuais da v0.1.0 aprovados;
- retestes de estabilização aprovados;
- testes específicos da entrada pública e do ícone aprovados;
- sem defeitos críticos ou altos conhecidos.

## Limitações

O armazenamento continua local ao navegador. Sincronização em nuvem, Flashcore, PWA e operação offline permanecem fora desta versão. A integração completa de ida e volta depende da adaptação do Concept Compass para enviar o contrato e o endereço específico do assunto.

## Pós-publicação

Após publicar no GitHub Pages, verifique a tela sem contexto, o botão para o Concept Compass, a URL `?dev`, um contrato válido, persistência, backup e Console.
