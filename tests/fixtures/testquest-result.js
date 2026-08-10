export function createTestQuestResult(overrides = {}) {
  const questions = Array.from({ length: 20 }, (_, index) => {
    const number = index + 1;
    const result = number <= 14 ? "correct" : number <= 18 ? "incorrect" : "unanswered";

    return {
      id: `source-question-${number}`,
      type: number % 4 === 0 ? "true_false" : "objective",
      difficulty: number <= 7 ? "easy" : number <= 15 ? "medium" : "hard",
      statement: `Enunciado da questão ${number}`,
      userAnswer:
        result === "unanswered"
          ? null
          : result === "correct"
            ? "Resposta correta"
            : "Resposta incorreta",
      correctAnswer: "Resposta correta",
      correction: `Correção da questão ${number}`,
      result,
    };
  });

  const base = {
    contractVersion: "1.0.0",
    sentAt: "2026-08-03T12:00:00.000Z",
    sourceApp: "test_quest",
    sessionId: "test-quest-session-1",
    subjectContext: {
      subjectId: "subject-ecology-food-webs",
      subjectName: "Cadeias e Teias Alimentares",
      themeId: "theme-ecology",
      themeName: "Ecologia",
      matterId: "matter-biology",
      matterName: "Biologia",
    },
    session: {
      title: "Lista de cadeias alimentares",
      date: "2026-08-03T11:30:00.000Z",
    },
    questions,
    resultUrl: "https://viniciusidney.github.io/test-quest/",
  };

  return {
    ...base,
    ...overrides,
    subjectContext: {
      ...base.subjectContext,
      ...(overrides.subjectContext ?? {}),
    },
    session: {
      ...base.session,
      ...(overrides.session ?? {}),
    },
    questions: overrides.questions ?? questions,
  };
}

export function createTestQuestResultV11(overrides = {}) {
  const base = createTestQuestResult({ contractVersion: "1.1.0" });
  const questions = base.questions.map((question, index) => {
    if (index === 13) {
      return {
        ...question,
        type: "discursive",
        result: "partial",
        scorePercentage: 50,
        userAnswer: "Resposta parcialmente correta",
      };
    }

    return {
      ...question,
      scorePercentage:
        question.result === "correct"
          ? 100
          : question.result === "incorrect"
            ? 0
            : null,
    };
  });

  return createTestQuestResult({
    ...base,
    ...overrides,
    contractVersion: "1.1.0",
    questions: overrides.questions ?? questions,
  });
}
