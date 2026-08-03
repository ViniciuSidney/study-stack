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

## Estado atual: Fundação 05

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
- criação real de Resumos e Anotações;
- busca, filtros, Importantes e agrupamentos cronológicos;
- arquivamento, restauração, histórico e contadores reais;
- editor completo de Resumos;
- editor completo de Anotações;
- conteúdo rico sanitizado e pesquisável;
- objetivo, conceitos, exemplos, dúvidas e síntese opcionais;
- fonte, descrição e referências;
- conclusão validada por título e conteúdo principal;
- marca `Estudado` independente da conclusão;
- reabertura de Resumos concluídos;
- autosave temporário e recuperação de rascunho de edição;
- descarte explícito de alterações temporárias;
- fluxo rápido `Apenas um detalhe`;
- títulos automáticos para detalhes rápidos;
- marca-texto no editor;
- checklists textuais com `[ ]` e `[x]`;
- vínculos entre registros do mesmo assunto;
- validação referencial dos vínculos;
- testes unitários com o test runner nativo do Node.js.

Ainda não foram implementados progresso, importações do Test Quest, backup ou
restauração de arquivo.

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
