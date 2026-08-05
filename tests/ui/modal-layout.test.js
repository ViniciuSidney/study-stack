import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentsCssUrl = new URL("../../styles/components.css", import.meta.url);

async function readComponentsCss() {
  return readFile(fileURLToPath(componentsCssUrl), "utf8");
}

function ruleBody(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "m"));
  assert.ok(match, `Regra CSS ausente: ${selector}`);
  return match[1];
}

test("modal da Visão Geral limita diálogo e card pela mesma altura", async () => {
  const css = await readComponentsCss();
  const dialogRule = ruleBody(css, ".overview-editor-modal");
  const cardRule = ruleBody(css, ".overview-editor-card");

  assert.match(
    dialogRule,
    /max-height:\s*min\(860px,\s*calc\(100dvh\s*-\s*40px\)\)/,
  );
  assert.match(
    cardRule,
    /max-height:\s*min\(860px,\s*calc\(100dvh\s*-\s*40px\)\)/,
  );
  assert.match(cardRule, /min-height:\s*0/);
  assert.match(cardRule, /overflow:\s*hidden/);
});

test("somente o corpo do modal da Visão Geral recebe rolagem", async () => {
  const css = await readComponentsCss();
  const bodyRule = ruleBody(css, ".overview-editor-body");

  assert.match(bodyRule, /min-height:\s*0/);
  assert.match(bodyRule, /overflow-y:\s*auto/);
});

test("histórico do modal de erro recalcula a linha ao ser expandido", async () => {
  const css = await readComponentsCss();
  const bodyRule = ruleBody(css, ".error-editor-body");
  const historyRule = ruleBody(css, ".error-editor-history");
  const toggleRule = ruleBody(css, ".error-editor-history-toggle");
  const timelineRule = ruleBody(css, ".error-mini-timeline");

  assert.match(bodyRule, /grid-auto-rows:\s*max-content/);
  assert.match(bodyRule, /align-content:\s*start/);
  assert.match(bodyRule, /padding-bottom:\s*28px/);
  assert.match(bodyRule, /scroll-padding-bottom:\s*28px/);
  assert.match(historyRule, /display:\s*grid/);
  assert.match(historyRule, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(historyRule, /align-content:\s*start/);
  assert.match(historyRule, /min-height:\s*54px/);
  assert.match(historyRule, /overflow:\s*hidden/);
  assert.match(toggleRule, /width:\s*100%/);
  assert.match(toggleRule, /line-height:\s*1\.4/);
  assert.match(timelineRule, /margin:\s*12px\s+0\s+0/);
  assert.match(timelineRule, /padding:\s*0\s+0\s+4px/);
});

test("modal de consolidação limita diálogo e card pela mesma altura", async () => {
  const css = await readComponentsCss();
  const dialogRule = ruleBody(css, ".consolidation-modal");
  const cardRule = ruleBody(css, ".consolidation-card");
  const bodyRule = ruleBody(css, ".consolidation-body");

  assert.match(dialogRule, /max-height:\s*min\(900px,\s*calc\(100dvh\s*-\s*32px\)\)/);
  assert.match(cardRule, /max-height:\s*min\(900px,\s*calc\(100dvh\s*-\s*32px\)\)/);
  assert.match(cardRule, /min-height:\s*0/);
  assert.match(cardRule, /overflow:\s*hidden/);
  assert.match(bodyRule, /overflow-y:\s*auto/);
  assert.match(bodyRule, /padding-bottom:\s*28px/);
});
