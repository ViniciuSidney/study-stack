# Study Stack

O **Study Stack** é um caderno conectado para organizar o que foi estudado por assunto, registrar evidências de aprendizagem e orientar o estudante até a consolidação final.

> Versão estável atual: **v0.1.1**

## Principais recursos

- contexto vinculado a `Matéria → Tema → Assunto` do Concept Compass;
- criação e edição de Resumos e Anotações;
- conteúdo rico sanitizado, busca, filtros e registros importantes;
- autosave recuperável e rascunhos persistentes;
- importação de sessões e questões do Test Quest;
- tratamento seguro de duplicidades, divergências e pendências;
- Registros de Erro com análise, revisão, reincidência e superação;
- caminho metacognitivo para práticas sem erros;
- progresso objetivo de 10 pontos baseado em evidências;
- roteiro guiado: Base, Prática, Análise, Revisão e Consolidação;
- avanço manual e recomendações de próxima ação;
- arquivamento e restauração sem exclusão destrutiva comum;
- histórico cronológico por assunto;
- backup completo com assinatura de integridade;
- restauração por mesclagem ou substituição com ponto de recuperação;
- diagnóstico estrutural, referencial e de armazenamento;
- temas claro, escuro e do sistema;
- layout responsivo, navegação por teclado e barras de rolagem estilizadas.

## Fluxo de estudo

```text
Concept Compass
↓
Study Stack: Base teórica
↓
Test Quest: Prática
↓
Study Stack: Análise de erros ou verificação metacognitiva
↓
Revisão
↓
Consolidação em 10/10
```

A ordem orienta o estudo, mas a navegação geral permanece livre. A aplicação diferencia a etapa atual, a etapa recomendada e a etapa apenas consultada.

## Pontuação objetiva

| Categoria | Limite | Evidência principal |
|---|---:|---|
| Base | 2 | Resumo concluído e marcado como estudado |
| Prática | 3 | Sessões válidas importadas do Test Quest |
| Análise | 2 | Registros de Erro completos ou verificações metacognitivas |
| Revisão | 2 | Revisões e confirmações posteriores |
| Consolidação | 1 | Confirmação consciente após os nove pontos anteriores |

O progresso é recalculado a partir das evidências. Arquivar ou restaurar uma evidência pode suspender ou recompor pontos sem apagar o histórico.

## Requisitos

- Node.js 20 ou superior.

Não há dependências externas de produção.

## Executar localmente

```bash
npm run dev
```

Abra:

```text
http://127.0.0.1:4173/
```

Em `localhost` ou `127.0.0.1`, a aplicação usa um contexto controlado de desenvolvimento quando nenhum contrato é informado.

### Vínculo ausente

```text
http://127.0.0.1:4173/?noContext=1
```

### Exigir contrato no ambiente local

```text
http://127.0.0.1:4173/?strictContext=1
```

### Acesso público sem assunto

Quando a URL pública é aberta diretamente, o Study Stack apresenta uma tela de orientação com acesso ao Concept Compass. Isso é intencional: a aplicação organiza dados dentro de um assunto recebido pela integração e não cria assuntos isolados.

## Verificação técnica

```bash
npm run check
```

O comando executa:

1. verificação sintática dos arquivos JavaScript;
2. suíte automatizada com o test runner nativo do Node.js.

A candidata `v0.1.1` foi fechada com **168 testes automatizados aprovados**. Ela preserva a validação funcional da v0.1.0 e adiciona testes específicos para a entrada pública sem contexto e para a nova identidade visual.

## Armazenamento e segurança

Chave principal:

```text
study-stack:v1:state
```

- todas as gravações passam por adaptadores e repositórios;
- o estado é validado antes da persistência;
- backups possuem assinatura de integridade;
- restaurações por substituição criam ponto de recuperação;
- dados importados permanecem separados das observações pessoais;
- o armazenamento é local ao navegador e à origem da aplicação.

Antes de atualizações importantes, crie um backup em **Configurações → Criar backup**.

## Limitações conhecidas da v0.1.1

- dados ainda não são sincronizados entre dispositivos ou contas;
- a integração funcional com o Flashcore permanece futura;
- o seletor de questões corretas para evidências funciona, mas poderá receber uma experiência mais agradável em versão futura;
- PWA, instalação e operação offline não fazem parte desta entrega estável;
- o smoke test público deve ser executado após a publicação no GitHub Pages.

Essas limitações não envolvem perda ou corrupção conhecida de dados.

## Branches e publicação

- `dev`: desenvolvimento e candidata aprovada;
- `main`: versão publicada;
- tag prevista para o patch público: `v0.1.1`.

A publicação deve manter `main`, tag, GitHub Release e GitHub Pages no mesmo commit.

## Documentação

- [CHANGELOG.md](CHANGELOG.md)
- [Notas da versão](RELEASE_NOTES.md)
- [Registro de qualidade da v0.1.1](docs/qa-v0.1.1.md)
- [Registro de qualidade da v0.1.0](docs/qa-v0.1.0.md)
- [Histórico das fundações](docs/README.md)
