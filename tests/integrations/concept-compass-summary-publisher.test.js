import test from "node:test";
import assert from "node:assert/strict";

import {
  CONCEPT_COMPASS_SUMMARY_CONFIG,
  ConceptCompassSummaryPublisher,
  buildConceptCompassSummary,
  validateConceptCompassSummary,
} from "../../scripts/integrations/concept-compass-summary-publisher.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";

function createState({ archived = false, total = 4 } = {}) {
  const subjectId = "subject-food-webs";
  return {
    schemaVersion: "1.0.0",
    appVersion: "0.1.1",
    createdAt: "2026-08-06T20:00:00.000Z",
    updatedAt: "2026-08-06T21:00:00.000Z",
    collections: {
      subjects: {
        [subjectId]: {
          id: subjectId,
          matterId: "matter-biology",
          themeId: "theme-ecology",
          sourceArchived: archived,
          guidedFlow: {
            currentStage: "practice",
            metacognitiveChecks: [
              {
                id: "check-1",
                analysis: { isComplete: true },
                review: { status: "reviewed" },
              },
            ],
          },
          consolidation: {
            status: total === 10 ? "confirmed" : "not_eligible",
          },
          lastActivityAt: "2026-08-06T20:55:00.000Z",
          updatedAt: "2026-08-06T20:55:00.000Z",
        },
      },
      progressSnapshots: {
        [`progress-${subjectId}`]: {
          id: `progress-${subjectId}`,
          subjectId,
          currentTotal: total,
          goalTotal: 10,
          calculatedAt: "2026-08-06T20:55:00.000Z",
          categories: {
            base: { activePoints: 2, cap: 2 },
            practice: { activePoints: total === 10 ? 3 : 2, cap: 3 },
            errorAnalysis: { activePoints: total === 10 ? 2 : 0, cap: 2 },
            review: { activePoints: total === 10 ? 2 : 0, cap: 2 },
            consolidation: { activePoints: total === 10 ? 1 : 0, cap: 1 },
          },
        },
      },
      records: {
        "record-error": {
          id: "record-error",
          subjectId,
          archivedAt: null,
        },
      },
      errorRecords: {
        "error-1": {
          id: "error-1",
          recordId: "record-error",
          subjectId,
          analysis: { isComplete: false },
          recurrenceCount: 0,
          masteryStatus: "active",
        },
      },
    },
  };
}

function createWindow(storage) {
  const windowTarget = new EventTarget();
  const documentTarget = new EventTarget();
  documentTarget.visibilityState = "visible";
  windowTarget.localStorage = storage;
  windowTarget.document = documentTarget;
  windowTarget.setTimeout = setTimeout;
  windowTarget.clearTimeout = clearTimeout;
  return windowTarget;
}

test("gera contrato compacto com progresso, etapas e aviso recomendado", () => {
  const summary = buildConceptCompassSummary(createState());
  const subject = summary.subjects["subject-food-webs"];

  assert.equal(summary.contractVersion, "1.0.0");
  assert.equal(summary.sourceApp, "study_stack");
  assert.equal(subject.progress, 4);
  assert.equal(subject.maxProgress, 10);
  assert.equal(subject.status, "in_progress");
  assert.equal(subject.currentStage, "practice");
  assert.equal(subject.recommendedStage, "practice");
  assert.equal(subject.stageProgress.analysis.current, 0);
  assert.equal(subject.pendingErrors, 1);
  assert.equal(subject.pendingReviews, 1);
  assert.equal(subject.notices.length, 5);
  assert.equal(subject.recommendedNoticeId, "subject-food-webs:practice");
  assert.match(subject.nextAction.label, /Test Quest/);
  assert.deepEqual(validateConceptCompassSummary(summary), {
    valid: true,
    errors: [],
  });
});

test("prioriza arquivamento e consolidação nos estados publicados", () => {
  const archived = buildConceptCompassSummary(createState({ archived: true }));
  const consolidated = buildConceptCompassSummary(createState({ total: 10 }));

  assert.equal(archived.subjects["subject-food-webs"].status, "archived");
  assert.equal(
    consolidated.subjects["subject-food-webs"].status,
    "consolidated",
  );
  assert.equal(
    consolidated.subjects["subject-food-webs"].nextAction.label,
    "Consultar consolidação",
  );
});

test("publica em chave dedicada e evita regravação sem mudanças", () => {
  const state = createState();
  const storage = new MemoryStorage({
    [CONCEPT_COMPASS_SUMMARY_CONFIG.stateKey]: JSON.stringify(state),
  });
  const publisher = new ConceptCompassSummaryPublisher({
    window: createWindow(storage),
  });

  const first = publisher.publish();
  const second = publisher.publish();
  const stored = JSON.parse(
    storage.getItem(CONCEPT_COMPASS_SUMMARY_CONFIG.summaryKey),
  );

  assert.equal(first.status, "published");
  assert.equal(second.status, "unchanged");
  assert.equal(stored.subjects["subject-food-webs"].progress, 4);
  assert.equal(stored.records, undefined);
});
