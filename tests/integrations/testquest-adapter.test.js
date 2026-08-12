import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { TestQuestAdapter } from "../../scripts/integrations/testquest-adapter.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";
import { createTestQuestResult } from "../fixtures/testquest-result.js";

test("lê payload JSON diretamente dos parâmetros da URL", () => {
  assert.deepEqual(
    APP_CONFIG.integration.testQuestContractVersions,
    ["1.0.0", "1.1.0"],
  );

  const payload = createTestQuestResult();
  const url = new URL("https://example.com/study-stack/");
  url.searchParams.set("testQuestPayload", JSON.stringify(payload));

  const result = TestQuestAdapter.readFromLocation({ href: url.href });

  assert.equal(result.found, true);
  assert.equal(result.valid, true);
  assert.equal(result.payload.sessionId, payload.sessionId);
  assert.equal(result.source, "query:testQuestPayload");
});

test("lê e remove handoff compartilhado pelo localStorage", () => {
  const storage = new MemoryStorage();
  const payload = createTestQuestResult();
  storage.setItem(TestQuestAdapter.handoffKey, JSON.stringify(payload));

  const result = TestQuestAdapter.readHandoff(storage);
  assert.equal(result.valid, true);
  assert.equal(result.payload.sourceApp, "test_quest");

  TestQuestAdapter.clearHandoff(storage);
  assert.equal(storage.getItem(TestQuestAdapter.handoffKey), null);
});

test("leitura do handoff não o remove antes da confirmação de importação", () => {
  const storage = new MemoryStorage();
  const payload = createTestQuestResult();
  storage.setItem(TestQuestAdapter.handoffKey, JSON.stringify(payload));

  const result = TestQuestAdapter.consumeAvailable({
    location: { href: "https://example.com/study-stack/#/exercises" },
    storage,
  });

  assert.equal(result.valid, true);
  assert.ok(storage.getItem(TestQuestAdapter.handoffKey));
});

test("mantém erro explícito para JSON manual inválido", () => {
  const result = TestQuestAdapter.parseManualText("{ inválido }");

  assert.equal(result.valid, false);
  assert.equal(result.payload, null);
  assert.ok(result.error);
});

test("gera payload demonstrativo ligado ao assunto atual", () => {
  const payload = TestQuestAdapter.createDevelopmentPayload({
    id: "subject-1",
    subjectName: "Assunto",
    themeId: "theme-1",
    themeName: "Tema",
    matterId: "matter-1",
    matterName: "Matéria",
  }, "2026-08-03T12:00:00.000Z");

  assert.equal(payload.subjectContext.subjectId, "subject-1");
  assert.equal(payload.questions.length, 20);
  assert.equal(payload.sourceApp, "test_quest");
});
