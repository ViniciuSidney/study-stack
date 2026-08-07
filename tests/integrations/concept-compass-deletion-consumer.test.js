import assert from "node:assert/strict";
import test from "node:test";

import {
  CONCEPT_COMPASS_DELETION_PROTOCOL,
  ConceptCompassDeletionConsumer,
  deleteStudyStackSubjectFromDraft,
} from "../../scripts/integrations/concept-compass-deletion-consumer.js";

function collection(entries = []) {
  return Object.fromEntries(entries.map((entity) => [entity.id, entity]));
}

function createDraft() {
  return {
    collections: {
      subjects: collection([
        { id: "s1", matterId: "m1", themeId: "t1" },
        { id: "s2", matterId: "m1", themeId: "t1" },
      ]),
      records: collection([
        { id: "r1", subjectId: "s1", type: "summary" },
        { id: "r2", subjectId: "s2", type: "note" },
      ]),
      summaries: collection([{ id: "r1", content: "Base" }]),
      notes: collection([
        { id: "r2", linkedRecordIds: [] },
      ]),
      importedSessions: collection([
        { id: "session-1", subjectId: "s1", recordId: "r-session", questionIds: ["q1"] },
      ]),
      importedQuestions: collection([
        { id: "q1", subjectId: "s1", sessionId: "session-1", errorRecordIds: ["e1"] },
      ]),
      errorRecords: collection([
        { id: "e1", subjectId: "s1", recordId: "r-error" },
      ]),
      errorOccurrences: collection([
        { id: "o1", errorRecordId: "e1", questionId: "q1" },
      ]),
      errorEvidences: collection([
        {
          id: "ev1",
          errorRecordId: "e1",
          questionId: "q1",
          validAfterOccurrenceId: "o1",
        },
      ]),
      historyEvents: collection([{ id: "h1", subjectId: "s1" }]),
      progressSnapshots: collection([{ id: "p1", subjectId: "s1" }]),
      pendingImports: collection([{ id: "pi1", subjectId: "s1" }]),
      draftBuffers: collection([{ id: "d1", subjectId: "s1" }]),
      technicalLogs: collection([{ id: "l1", subjectId: "s1" }]),
      settings: collection([{ id: "global" }]),
      integrationState: collection([
        {
          id: "global",
          conceptCompass: {
            status: "connected",
            lastSubjectId: "s1",
            deletedSubjects: {},
          },
          updatedAt: "2026-08-07T19:00:00.000Z",
        },
      ]),
    },
  };
}

test("exclusão vinculada remove somente dados do Subject e cria tombstone", () => {
  const draft = createDraft();
  const outcome = deleteStudyStackSubjectFromDraft(
    draft,
    {
      commandId: "cmd-1",
      subjectId: "s1",
      matterId: "m1",
      themeId: "t1",
      requestedAt: "2026-08-07T20:00:00.000Z",
      committedAt: "2026-08-07T20:00:01.000Z",
    },
    "2026-08-07T20:00:02.000Z",
  );

  assert.equal(outcome.existed, true);
  assert.equal(draft.collections.subjects.s1, undefined);
  assert.ok(draft.collections.subjects.s2);
  assert.equal(draft.collections.records.r1, undefined);
  assert.ok(draft.collections.records.r2);
  assert.equal(draft.collections.importedQuestions.q1, undefined);
  assert.equal(draft.collections.errorRecords.e1, undefined);
  assert.equal(draft.collections.progressSnapshots.p1, undefined);
  assert.equal(
    draft.collections.integrationState.global.conceptCompass.deletedSubjects.s1.commandId,
    "cmd-1",
  );
  assert.equal(draft.collections.integrationState.global.conceptCompass.lastSubjectId, null);
});

function createWindowWithStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const listeners = new Map();
  return {
    localStorage: {
      getItem(key) {
        return values.has(key) ? values.get(key) : null;
      },
      setItem(key, value) {
        values.set(key, String(value));
      },
      removeItem(key) {
        values.delete(key);
      },
    },
    document: {
      visibilityState: "visible",
      addEventListener() {},
      removeEventListener() {},
    },
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    values,
  };
}

test("consumer confirma comando pronto e o remove da fila", () => {
  const envelope = {
    contractVersion: "1.0.0",
    sourceApp: "concept_compass",
    updatedAt: "2026-08-07T20:00:00.000Z",
    commands: {
      "cmd-1": {
        contractVersion: "1.0.0",
        sourceApp: "concept_compass",
        commandId: "cmd-1",
        type: "delete_subject",
        status: "ready",
        subjectId: "s1",
        requestedAt: "2026-08-07T20:00:00.000Z",
      },
    },
  };
  const window = createWindowWithStorage({
    [CONCEPT_COMPASS_DELETION_PROTOCOL.commandKey]: JSON.stringify(envelope),
  });
  const repository = {
    transaction(mutator) {
      const result = mutator(createDraft());
      return { result };
    },
  };
  const consumer = new ConceptCompassDeletionConsumer({
    window,
    repository,
    clock: () => "2026-08-07T20:00:02.000Z",
  });

  const result = consumer.consume();

  assert.equal(result.processed, 1);
  assert.equal(window.localStorage.getItem(CONCEPT_COMPASS_DELETION_PROTOCOL.commandKey), null);
  const acknowledgements = JSON.parse(
    window.localStorage.getItem(CONCEPT_COMPASS_DELETION_PROTOCOL.acknowledgementKey),
  );
  assert.equal(acknowledgements.acknowledgements["cmd-1"].status, "deleted");
});

test("consumer recupera comando preparado quando o Concept Compass já removeu o Assunto", () => {
  const envelope = {
    contractVersion: "1.0.0",
    sourceApp: "concept_compass",
    updatedAt: "2026-08-07T20:00:00.000Z",
    commands: {
      "cmd-recovery": {
        contractVersion: "1.0.0",
        sourceApp: "concept_compass",
        commandId: "cmd-recovery",
        type: "delete_subject",
        status: "prepared",
        subjectId: "s1",
        requestedAt: "2026-08-07T20:00:00.000Z",
      },
    },
  };
  const window = createWindowWithStorage({
    [CONCEPT_COMPASS_DELETION_PROTOCOL.commandKey]: JSON.stringify(envelope),
    [CONCEPT_COMPASS_DELETION_PROTOCOL.conceptCompassDataKey]: JSON.stringify({
      assuntos: [{ id: "s2" }],
    }),
  });
  const repository = {
    transaction(mutator) {
      const result = mutator(createDraft());
      return { result };
    },
  };
  const consumer = new ConceptCompassDeletionConsumer({
    window,
    repository,
    clock: () => "2026-08-07T20:00:03.000Z",
  });

  assert.equal(consumer.consume().processed, 1);
  assert.equal(window.localStorage.getItem(CONCEPT_COMPASS_DELETION_PROTOCOL.commandKey), null);
});
