const HANDOFF_KEY = "study-stack:handoff:test-quest:v1";
const PAYLOAD_PARAMS = Object.freeze([
  "testQuestResult",
  "testQuestPayload",
]);

function parseJson(text) {
  try {
    return { valid: true, payload: JSON.parse(text), error: null };
  } catch (error) {
    return {
      valid: false,
      payload: null,
      error: error instanceof Error ? error.message : "JSON inválido.",
    };
  }
}

function decodeBase64Url(value) {
  const normalized = String(value)
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(String(value).length / 4) * 4, "=");
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function parsePossiblyEncoded(value) {
  const direct = parseJson(value);
  if (direct.valid) {
    return direct;
  }

  try {
    return parseJson(decodeBase64Url(value));
  } catch {
    return direct;
  }
}

export class TestQuestAdapter {
  static get handoffKey() {
    return HANDOFF_KEY;
  }

  static readFromLocation(location) {
    const url = new URL(location.href);

    for (const parameter of PAYLOAD_PARAMS) {
      const raw = url.searchParams.get(parameter);
      if (!raw) {
        continue;
      }

      const parsed = parsePossiblyEncoded(raw);
      return {
        found: true,
        source: `query:${parameter}`,
        ...parsed,
      };
    }

    return { found: false, valid: false, payload: null, error: null };
  }

  static readHandoff(storage) {
    const raw = storage?.getItem?.(HANDOFF_KEY);
    if (!raw) {
      return { found: false, valid: false, payload: null, error: null };
    }

    const parsed = parsePossiblyEncoded(raw);
    return {
      found: true,
      source: "localStorage-handoff",
      ...parsed,
    };
  }

  static clearHandoff(storage) {
    storage?.removeItem?.(HANDOFF_KEY);
  }

  static consumeAvailable({ location, storage }) {
    const fromLocation = this.readFromLocation(location);
    if (fromLocation.found) {
      return fromLocation;
    }

    return this.readHandoff(storage);
  }

  static parseManualText(text) {
    const normalized = String(text ?? "").trim();
    if (!normalized) {
      return {
        valid: false,
        payload: null,
        error: "Cole ou selecione um arquivo JSON do Test Quest.",
      };
    }

    return parseJson(normalized);
  }

  static createDevelopmentPayload(subject, now = new Date().toISOString()) {
    const questions = Array.from({ length: 20 }, (_, index) => {
      const number = index + 1;
      const result = number <= 13 ? "correct" : number <= 18 ? "incorrect" : "unanswered";
      return {
        id: `demo-question-${number}`,
        type: number % 5 === 0 ? "true_false" : "objective",
        difficulty: number <= 7 ? "easy" : number <= 15 ? "medium" : "hard",
        statement: `Questão demonstrativa ${number}: identifique a alternativa correta sobre o assunto estudado.`,
        userAnswer:
          result === "unanswered"
            ? null
            : result === "correct"
              ? "Alternativa correta"
              : "Alternativa escolhida incorretamente",
        correctAnswer: "Alternativa correta",
        correction:
          result === "incorrect"
            ? "Revise o conceito central e compare as relações apresentadas no enunciado."
            : "Resposta conferida pelo Test Quest.",
        result,
      };
    });

    return {
      contractVersion: "1.0.0",
      sentAt: now,
      sourceApp: "test_quest",
      sessionId: `demo-session-${Date.parse(now)}`,
      subjectContext: {
        subjectId: subject.id,
        subjectName: subject.subjectName,
        themeId: subject.themeId,
        themeName: subject.themeName,
        matterId: subject.matterId,
        matterName: subject.matterName,
      },
      session: {
        title: "Lista demonstrativa do Test Quest",
        date: now,
      },
      questions,
      resultUrl: "https://viniciusidney.github.io/test-quest/",
    };
  }
}
