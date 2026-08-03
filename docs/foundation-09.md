# Fundação 09 — Backup, Restauração e Diagnóstico

## Objetivo

Fechar a camada de segurança local da v0.1 antes das integrações futuras. Esta fundação torna o estado versionado exportável, restaurável e diagnosticável sem acoplar as regras de domínio ao `localStorage`.

## Backup

O backup é exportado como um único JSON com:

- identificação do Study Stack;
- versão do formato do backup;
- versão da aplicação e do schema;
- data e identificador únicos da exportação;
- resumo das coleções;
- estado persistente completo;
- rascunhos recuperáveis em área separada;
- assinatura determinística de integridade.

O momento do último backup é registrado em `settings.global.lastBackupAt`.

## Restauração

Dois modos estão disponíveis:

### Mesclar

- adiciona entidades com IDs ainda inexistentes;
- ignora entidades idênticas;
- preserva o estado atual quando o mesmo ID possui conteúdo diferente;
- apresenta os conflitos na prévia;
- valida o estado resultante antes da gravação.

### Substituir

- valida integralmente o backup;
- cria um ponto de recuperação com o estado atual;
- substitui todas as coleções pelo conteúdo restaurado;
- atualiza versão, data e integridade ao persistir.

Nenhum modo sobrescreve o estado atual antes da validação completa.

## Ponto de recuperação

Antes de cada restauração aplicada, o estado anterior é salvo em:

```text
study-stack:v1:recovery
```

O Diagnóstico permite restaurar ou remover esse ponto.

## Diagnóstico

O relatório verifica:

- validade estrutural e referencial do estado;
- versão do schema e da aplicação;
- tamanho aproximado do JSON persistido;
- contagens por coleção;
- divergências nas contagens de integridade;
- importações pendentes;
- rascunhos recuperáveis e expirados;
- estados das integrações;
- eventos técnicos recentes;
- existência de ponto de recuperação.

O resultado é classificado como saudável, atenção ou erro.

## Importações pendentes

A área de manutenção lista resultados do Test Quest preservados por:

- JSON inválido;
- assunto incompatível ou ausente;
- reimportação divergente.

O usuário pode descartar a pendência sem importar ou apagar silenciosamente o conteúdo durante o recebimento inicial.

## Interface

As ferramentas ficam disponíveis:

- na seção global Configurações;
- no menu de utilidades do cabeçalho;
- em modais com cabeçalho e rodapé fixos e corpo rolável.

## Critérios validados

- backup exportado é restaurável;
- alteração no arquivo invalida a assinatura;
- mesclagem preserva conflitos;
- substituição cria ponto de recuperação;
- recuperação restaura o estado anterior;
- diagnóstico identifica pendências;
- ferramentas permanecem acessíveis em telas desktop e mobile.
