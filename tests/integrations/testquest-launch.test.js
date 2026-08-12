import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTestQuestLaunchContext,
  createTestQuestLaunchUrl,
  getNextTestQuestListSequence,
  getTestQuestListSequence,
} from "../../scripts/integrations/testquest-launch.js";

const SUBJECT = Object.freeze({
  id: "subject-food-webs",
  subjectName: "Cadeias e Teias Alimentares",
  themeId: "theme-ecology",
  themeName: "Ecologia",
  matterId: "matter-biology",
  matterName: "Biologia",
});

function session(overrides = {}) {
  return {
    subjectId: SUBJECT.id,
    sessionTitle: "Lista sem sequência reconhecida",
    ...overrides,
  };
}

test("sugere a sequência 1 quando o assunto ainda não possui listas numeradas", () => {
  assert.equal(getNextTestQuestListSequence([], SUBJECT.id), 1);
  assert.equal(
    getNextTestQuestListSequence([session()], SUBJECT.id),
    1,
  );
});

test("usa o maior metadado estruturado e não reutiliza lacunas", () => {
  const sessions = [
    session({ sourceListSequence: 1 }),
    session({ sourceListSequence: 3 }),
    session({ subjectId: "other-subject", sourceListSequence: 20 }),
  ];

  assert.equal(getNextTestQuestListSequence(sessions, SUBJECT.id), 4);
});

test("usa somente o padrão legado no final do título como fallback", () => {
  assert.equal(
    getTestQuestListSequence(session({ sessionTitle: "Ecologia — Lista 7" })),
    7,
  );
  assert.equal(
    getTestQuestListSequence(session({ sessionTitle: "Minha Lista 8 especial" })),
    null,
  );
  assert.equal(
    getTestQuestListSequence(session({ sessionTitle: "Lista de revisão" })),
    null,
  );
});

test("aceita views do serviço e prioriza metadado sobre o título", () => {
  const views = [
    { session: session({ sourceListSequence: 5, sessionTitle: "Ecologia — Lista 99" }) },
  ];

  assert.equal(getNextTestQuestListSequence(views, SUBJECT.id), 6);
});

test("monta um único contexto com entrada, nome e sequência sugeridos", () => {
  const context = buildTestQuestLaunchContext({
    subject: SUBJECT,
    sessions: [session({ sourceListSequence: 2 })],
    sentAt: "2026-08-12T12:00:00.000Z",
    returnUrl: "https://viniciusidney.github.io/study-stack/#/overview",
    contractVersion: "1.1.0",
  });

  assert.deepEqual(context, {
    contractVersion: "1.1.0",
    sentAt: "2026-08-12T12:00:00.000Z",
    sourceApp: "study_stack",
    entryPoint: "import",
    matterId: "matter-biology",
    matterName: "Biologia",
    themeId: "theme-ecology",
    themeName: "Ecologia",
    subjectId: "subject-food-webs",
    subjectName: "Cadeias e Teias Alimentares",
    suggestedListName: "Cadeias e Teias Alimentares — Lista 3",
    suggestedListSequence: 3,
    returnUrl: "https://viniciusidney.github.io/study-stack/#/overview",
  });
});

test("serializa o contexto na URL do Test Quest", () => {
  const url = createTestQuestLaunchUrl("https://example.test/test-quest/", {
    contractVersion: "1.1.0",
    entryPoint: "import",
    suggestedListSequence: 4,
    suggestedListName: "Ecologia — Lista 4",
  });

  assert.equal(url.searchParams.get("entryPoint"), "import");
  assert.equal(url.searchParams.get("suggestedListSequence"), "4");
  assert.equal(url.searchParams.get("suggestedListName"), "Ecologia — Lista 4");
});
