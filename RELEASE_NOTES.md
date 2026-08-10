# Study Stack v0.2.0

Versão candidata que consolida o Study Stack como fonte exclusiva do progresso oficial no ecossistema Concept Compass.

## Destaques

- progresso objetivo de `0–10` publicado para o Concept Compass;
- observação ativa da Matéria, Tema e Assunto de origem;
- arquivamento hierárquico bloqueia edição e mudança de etapa sem F5;
- restauração libera automaticamente a aba já aberta;
- renomeação e movimentação atualizam cabeçalho, hierarquia e retorno profundo;
- exclusão permanente sincronizada remove dados vinculados e exibe **Assunto não disponível**;
- retorno ao Concept Compass em nova aba com URL segura;
- mensagens específicas para arquivamento, exclusão e ausência de vínculo;
- Resumos, Anotações, Test Quest, Registros de Erro e consolidação em 10/10 preservados.

## Antes de atualizar

Crie um backup em **Configurações → Criar backup**. A versão da aplicação passa a `0.2.0`, enquanto o schema persistente permanece `1.0.0`; não há migração estrutural necessária no Study Stack.

## Validação

- 188 testes automatizados aprovados;
- 121 arquivos JavaScript aprovados na verificação de sintaxe;
- regressão integrada I8-T01–T09 concluída;
- arquivamento/restauração, renomeação/movimentação e exclusão aprovados manualmente;
- sem defeitos críticos ou altos conhecidos.

## Limitações

O armazenamento continua local ao navegador. Sincronização em nuvem, integração com Flashcore, PWA e operação offline permanecem fora desta versão.

## Pós-publicação

Depois do GitHub Pages, valide a entrada pública sem contexto, um contrato válido vindo do Concept Compass, retorno em nova aba, atualização ao vivo, exclusão vinculada, persistência, backup e Console.
