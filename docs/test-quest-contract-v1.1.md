# Contrato Test Quest → Study Stack 1.1.0

## Finalidade

O contrato `1.1.0` transporta o resultado final de uma sessão do Test Quest
para o Study Stack sem substituir o formato interno de nenhuma das aplicações.
Ele preserva a leitura do contrato `1.0.0` e acrescenta a representação explícita
de respostas discursivas parcialmente corretas.

O `contractVersion` deste documento identifica apenas o envelope de integração.
Ele não deve ser confundido com o `schemaVersion` usado pelo Test Quest para
persistir e exportar suas sessões nativas.

## Envelope obrigatório

- `contractVersion`: deve ser `1.1.0`;
- `sentAt`: data e hora ISO 8601;
- `sourceApp`: deve ser `test_quest`;
- `sessionId`: identificador único da tentativa concluída;
- `subjectContext.subjectId`: identificador recebido do Study Stack;
- `session.title`: título visível da lista;
- `session.date`: data e hora ISO 8601 da sessão;
- `questions`: ao menos uma questão concluída.

`resultUrl` e `payloadFingerprint` permanecem opcionais.

## Resultado e pontuação por questão

Cada questão do contrato `1.1.0` deve declarar `result` e
`scorePercentage` com uma das combinações abaixo. Não são aceitos valores
intermediários nem combinações diferentes.

| `result` | `scorePercentage` | Conta como respondida | Registro de Erro automático |
|---|---:|---|---|
| `correct` | `100` | sim | não |
| `partial` | `50` | sim | não |
| `incorrect` | `0` | sim | candidata, após seleção do usuário |
| `unanswered` | `null` | não | não |

O aproveitamento é calculado por:

`(corretas + parciais × 0,5) ÷ total de questões × 100`

O resultado é arredondado para o inteiro mais próximo apenas na apresentação.
Uma sessão continua válida para Prática quando possui pelo menos 15 respostas;
respostas parciais fazem parte dessa contagem.

## Exemplo válido

```json
{
  "contractVersion": "1.1.0",
  "sentAt": "2026-08-10T14:00:00.000Z",
  "sourceApp": "test_quest",
  "sessionId": "session-2026-08-10-001",
  "subjectContext": {
    "subjectId": "subject-ecology-food-webs",
    "subjectName": "Cadeias e Teias Alimentares"
  },
  "session": {
    "title": "Lista de relações alimentares",
    "date": "2026-08-10T13:40:00.000Z"
  },
  "questions": [
    {
      "id": "question-1",
      "type": "objective",
      "statement": "Qual organismo ocupa o primeiro nível trófico?",
      "userAnswer": "Produtor",
      "correctAnswer": "Produtor",
      "result": "correct",
      "scorePercentage": 100
    },
    {
      "id": "question-2",
      "type": "discursive",
      "statement": "Explique o fluxo de energia.",
      "userAnswer": "A energia passa entre os níveis e diminui.",
      "correctAnswer": "A energia flui e parte é dissipada em cada nível.",
      "result": "partial",
      "scorePercentage": 50
    }
  ]
}
```

## Exemplos inválidos

Resultado parcial sem pontuação explícita:

```json
{
  "result": "partial"
}
```

Resultado e pontuação contraditórios:

```json
{
  "result": "partial",
  "scorePercentage": 100
}
```

Pontuação fora do conjunto fechado:

```json
{
  "result": "partial",
  "scorePercentage": 75
}
```

## Compatibilidade com 1.0.0

- o Study Stack continua aceitando envelopes `1.0.0` sem
  `scorePercentage`;
- no legado, `correct`, `incorrect` e `unanswered` equivalem internamente a
  `100`, `0` e `null`;
- `partial` não é aceito em envelopes `1.0.0`;
- a impressão digital dos payloads `1.0.0` permanece igual à calculada na
  versão anterior do Study Stack;
- sessões `1.0.0` já persistidas, sem os novos campos derivados, continuam
  restauráveis.

## Responsabilidades das aplicações

O Test Quest mantém seu schema interno e sua exportação nativa de backup.
Somente o adaptador de integração gera este envelope após a conclusão da
sessão. O Study Stack valida o envelope, calcula as estatísticas a partir das
questões e permanece como fonte exclusiva do progresso do Assunto.
