# Study Stack

Aplicação web para organizar conteúdos estudados, registrar resumos e
anotações, importar resultados do Test Quest e acompanhar erros, progresso e
consolidação por assunto.

## Organização recomendada

Mantenha o protótipo arquivado e use esta pasta como projeto definitivo:

```text
Study Stack/
├── docs-e-assets/
├── prototipo/
│   └── study-stack-wireframe-07/
└── desenvolvimento/
    └── study-stack/
```

O protótipo contém simulações e dados fictícios. Esta pasta implementa a
aplicação real de forma incremental.

## Estado atual: Fundação 08

Já funciona:

- AppShell responsivo;
- sidebar recolhível no desktop e drawer mobile;
- rotas internas por hash;
- tema claro, escuro ou do sistema;
- schema de armazenamento `1.0.0`;
- estado raiz validado antes de cada gravação;
- entidade `Subject` persistente;
- contrato Concept Compass `1.0.0`;
- entidade base `Record` e ciclo de vida persistente;
- criação e edição real de Resumos e Anotações;
- busca, filtros, Importantes e agrupamentos cronológicos;
- arquivamento, restauração, histórico e contadores reais;
- conteúdo rico sanitizado e pesquisável;
- conclusão validada por título e conteúdo;
- marca `Estudado` independente da conclusão;
- autosave temporário e recuperação de rascunhos;
- fluxo rápido `Apenas um detalhe`;
- checklists textuais e vínculos entre registros;
- Visão Geral funcional e editável;
- estado manual do assunto e percepção pessoal visível de 0% a 100%;
- cálculo de progresso versionado por evidências;
- `ProgressSnapshot` persistido com fingerprint;
- categorias Base, Prática, Análise de erros, Revisão e Consolidação;
- botão compacto de progresso funcional no cabeçalho;
- contrato Test Quest `1.0.0`;
- importação manual por arquivo ou JSON colado;
- recebimento por parâmetros de URL ou handoff em `localStorage`;
- entidades `ImportedSession` e `ImportedQuestion`;
- snapshot original imutável separado das observações pessoais;
- idempotência e preservação de reimportações divergentes;
- seção Exercícios com métricas, busca, filtros e cards;
- modal de sessão com respostas, correções e filtros por resultado;
- listas com ao menos 15 respostas alimentam a categoria Prática;
- criação seletiva de Registros de Erro a partir das questões incorretas;
- entidades `ErrorRecord`, `ErrorOccurrence` e `ErrorEvidence`;
- análise por causa, regra correta e estratégia de prevenção;
- autosave e recuperação de rascunhos das análises de erro;
- categorias e vínculos com Resumos ou Anotações do mesmo assunto;
- revisão reversível com contagem histórica;
- reincidências que reiniciam a sequência sem apagar evidências antigas;
- superação após duas respostas corretas distintas e consecutivas;
- seção Erros com grupos Pendentes, Reincidentes, Revisados e Superados;
- categorias Análise de erros e Revisão alimentadas por evidências reais;
- testes unitários com o test runner nativo do Node.js.

Ainda não foram implementados backup e restauração de arquivo, diagnóstico
completo ou a integração funcional com o Flashcore.

## Requisitos

- Node.js 20 ou superior.

Nenhuma dependência externa é necessária.

## Executar

```bash
npm run dev
```

Abra:

```text
http://127.0.0.1:4173/
```

Em `localhost` ou `127.0.0.1`, a aplicação usa um contexto controlado de
desenvolvimento quando nenhum contrato é informado.

### Testar vínculo ausente

```text
http://127.0.0.1:4173/?noContext=1
```

### Exigir contrato mesmo no ambiente local

```text
http://127.0.0.1:4173/?strictContext=1
```

### Testar contexto explícito

```text
http://127.0.0.1:4173/?contractVersion=1.0.0&sentAt=2026-08-02T21%3A00%3A00.000Z&sourceApp=concept_compass&matterId=matter-biology&matterName=Biologia&themeId=theme-ecology&themeName=Ecologia&subjectId=subject-ecology-food-webs&subjectName=Cadeias%20e%20Teias%20Alimentares&sourceArchived=false#/overview
```

## Armazenamento

Chave principal:

```text
study-stack:v1:state
```

Acesso ao navegador ocorre somente por adaptadores e repositórios. Regras de
domínio não dependem diretamente do `localStorage`.

Os rascunhos temporários do editor são armazenados na coleção
`draftBuffers`, dentro do mesmo estado versionado.

## Verificações

```bash
npm run check
```

O comando executa:

1. verificação sintática dos arquivos JavaScript;
2. testes unitários.

## Git

- `main`: estados aprovados ou publicados;
- `dev`: desenvolvimento da v0.1;
- branches curtas opcionais para funcionalidades isoladas.

Esta entrega deve ser adicionada e testada na branch `dev`.

## Documentação técnica

- [`docs/foundation-02.md`](docs/foundation-02.md)
- [`docs/foundation-03.md`](docs/foundation-03.md)
- [`docs/foundation-04.md`](docs/foundation-04.md)
- [`docs/foundation-05.md`](docs/foundation-05.md)
- [`docs/foundation-06.md`](docs/foundation-06.md)
- [`docs/foundation-07.md`](docs/foundation-07.md)
- [`docs/foundation-08.md`](docs/foundation-08.md)
