# Changelog

Todas as mudanças relevantes do Study Stack serão registradas neste arquivo.

## [0.1.1] — 2026-08-06

### Adicionado

- ícone oficial do Study Stack em SVG e PNG, com cartões de estudo empilhados;
- ícone aplicado no cabeçalho, favicon e atalho para dispositivos móveis;
- modo visual dedicado para o acesso público sem assunto vinculado.

### Alterado

- a antiga tela técnica de “Vínculo ausente” foi substituída por uma orientação direta ao usuário;
- o acesso sem contexto agora explica a dependência do Concept Compass e oferece um botão para continuar;
- navegação, contexto e ações indisponíveis ficam ocultos nessa entrada, evitando aparência de aplicação quebrada.

### Qualidade

- 168 testes automatizados aprovados;
- dois testes específicos adicionados para a tela pública e a identidade visual;
- schema de dados mantido em `1.0.0`, sem migração necessária.

## [0.1.0] — 2026-08-05

### Adicionado

- AppShell responsivo com sidebar desktop e drawer mobile.
- Contexto versionado do Concept Compass por matéria, tema e assunto.
- Resumos, Anotações e fluxo rápido “Apenas um detalhe”.
- Conteúdo rico sanitizado, busca, filtros, importantes e histórico.
- Autosave recuperável e buffers de rascunho.
- Importação versionada de resultados do Test Quest.
- Sessões, questões, estatísticas, observações pessoais e pendências de importação.
- Registros de Erro com análise, revisão, reincidência, evidências e superação.
- Verificações metacognitivas para práticas sem respostas incorretas.
- Progresso de 10 pontos calculado a partir de evidências.
- Roteiro guiado de Base, Prática, Análise, Revisão e Consolidação.
- Consolidação manual e suspensão quando evidências anteriores deixam de contar.
- Backup com assinatura, mesclagem, substituição e recuperação do estado anterior.
- Diagnóstico de integridade, armazenamento, integrações e eventos técnicos.
- Temas claro, escuro e do sistema, responsividade e navegação por teclado.
- Estilização global das barras de rolagem.

### Corrigido

- cortes e compressões em modais longos;
- expansão do histórico de ocorrências e evidências;
- responsividade da trilha das cinco etapas;
- redundância entre pontuação objetiva e roteiro;
- clareza das importações pendentes;
- acesso ao Test Quest após Prática completa;
- acesso antecipado à verificação metacognitiva após uma lista sem erros;
- confirmação visual da restauração por substituição;
- ações do rodapé do modal de Consolidação.

### Qualidade

- 166 testes automatizados aprovados;
- 12 blocos de testes manuais aprovados;
- retestes direcionados aprovados;
- nenhum defeito crítico ou alto conhecido aberto.

### Limitações conhecidas

- sem sincronização em nuvem ou entre dispositivos;
- integração com Flashcore ainda futura;
- PWA e funcionamento offline adiados;
- seleção de questões corretas possui melhoria de UX registrada para versão futura.
