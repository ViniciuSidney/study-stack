# Study Stack v0.3.0

Versão que completa o fluxo orientado de prática entre o Study Stack e o Test
Quest, mantendo o Study Stack como fonte exclusiva do progresso do Assunto.

## Destaques

- criação de listas no Test Quest diretamente pela seção **Exercícios**;
- abertura da importação com Assunto, sequência e nome sugerido editável;
- numeração híbrida que evita colisões em títulos canônicos;
- suporte aos contratos de resultado `1.0.0` e `1.1.0`;
- respostas discursivas parciais preservadas com pontuação de 50%;
- retorno automático ao Assunto e ao card recém-importado;
- rolagem, foco, destaque temporário e confirmação de salvamento;
- deduplicação por sessão de origem e consumo único do handoff;
- preservação do resultado quando o Assunto está indisponível;
- ação **Abrir Test Quest** no detalhe da sessão;
- melhor leitura dos cards em larguras intermediárias até `1300px`.

## Compatibilidade

- versão da aplicação: `0.3.0`;
- schema persistente: `1.0.0`, sem migração estrutural;
- contratos do Concept Compass preservados em `1.0.0`;
- contratos de resultado do Test Quest aceitos em `1.0.0` e `1.1.0`.

Antes de atualizar, crie um backup em **Configurações → Criar backup**.

## Validação

- 207 testes automatizados aprovados;
- 123 arquivos JavaScript aprovados na verificação sintática;
- fluxo conjunto aprovado nas branches `dev` dos dois projetos;
- entrada vinculada, título editável, sequência, retorno, destaque e consumo
  único aprovados manualmente;
- abertura direta do Test Quest confirmada sem vínculo residual;
- nenhum defeito crítico ou alto conhecido.

## Limitações

O armazenamento continua local ao navegador. Sincronização em nuvem,
integração com Flashcore, PWA e operação offline permanecem fora desta versão.

## Pós-publicação

Depois do GitHub Pages, valide o fluxo completo Concept Compass → Study Stack →
Test Quest → Study Stack, a abertura direta sem contexto, o consumo único após
recarregar, persistência, backup e Console.
