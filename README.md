# Study Stack

Fundação técnica inicial da aplicação definitiva.

## Não substitua o protótipo

Mantenha o `study-stack-wireframe-07` arquivado como referência visual e crie
uma pasta nova para este projeto:

```text
Study Stack/
├── docs-e-assets/
├── prototipo/
│   └── study-stack-wireframe-07/
└── desenvolvimento/
    └── study-stack/
```

O protótipo contém simulações e dados fictícios. Esta pasta começa limpa e
implementa somente a fundação necessária para a v0.1-A.

## O que já funciona

- AppShell responsivo;
- sidebar recolhível no desktop;
- drawer sobreposto no mobile;
- rotas internas por hash;
- leitura inicial do contexto do Concept Compass;
- contexto fictício apenas em ambiente local;
- estado de vínculo ausente;
- tema claro, escuro ou do sistema;
- preferências locais de navegação;
- Configurações básicas;
- páginas provisórias das seções;
- testes unitários com o test runner nativo do Node.js.

## Requisitos

- Node.js 20 ou superior.

Nenhuma dependência externa é necessária nesta fundação.

## Executar

```bash
npm run dev
```

Abra:

```text
http://127.0.0.1:4173/
```

Em `localhost` ou `127.0.0.1`, a aplicação usa um assunto controlado de
desenvolvimento quando nenhum contexto é informado.

### Testar vínculo ausente

```text
http://127.0.0.1:4173/?noContext=1
```

### Testar contexto explícito

```text
http://127.0.0.1:4173/?subjectId=subject-ecology-food-webs&subjectName=Cadeias%20e%20Teias%20Alimentares&themeName=Ecologia&subjectArea=Biologia#/overview
```

## Verificações

```bash
npm run check
```

O comando executa:

1. verificação sintática dos arquivos JavaScript;
2. testes unitários.

## Git recomendado

Execute dentro da pasta `study-stack`:

```bash
git init
git branch -M main
git add .
git commit -m "feat: create initial Study Stack application foundation"
git checkout -b dev
```

A partir daí:

- `main`: estados aprovados ou publicados;
- `dev`: desenvolvimento da v0.1;
- branches curtas opcionais para funcionalidades e correções isoladas.

## Estado da implementação

Esta entrega corresponde a:

> Fundação 01: estrutura inicial, AppShell, rotas, preferências e contexto.

Resumos, Anotações, progresso, armazenamento de domínio e integrações reais
ainda não foram implementados.
