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
