import test from "node:test";
import assert from "node:assert/strict";

import {
  createOptionalRichContent,
  createRichContent,
  createRichContentFromHtml,
  richHtmlToPlainText,
  sanitizeRichHtml,
  validateRichContent,
} from "../../scripts/domain/rich-content.js";

const NOW = "2026-08-02T22:00:00.000Z";

test("remove scripts, atributos e elementos inseguros do conteúdo rico", () => {
  const sanitized = sanitizeRichHtml(
    '<h2 onclick="x()">Título</h2><script>alert(1)</script><p style="color:red">Texto</p>',
  );

  assert.equal(sanitized, "<h2>Título</h2><p>Texto</p>");
});

test("normaliza marcações equivalentes e converte para texto simples", () => {
  const sanitized = sanitizeRichHtml("<div><b>Base</b> e <i>prática</i></div>");

  assert.equal(sanitized, "<p><strong>Base</strong> e <em>prática</em></p>");
  assert.equal(richHtmlToPlainText(sanitized), "Base e prática");
});

test("cria conteúdo rico textual válido", () => {
  const content = createRichContent("Produtores\nConsumidores", NOW);

  assert.equal(content.content, "<p>Produtores<br>Consumidores</p>");
  assert.equal(content.plainText, "Produtores\nConsumidores");
  assert.equal(validateRichContent(content).valid, true);
});

test("conteúdo opcional vazio é armazenado como null", () => {
  assert.equal(createOptionalRichContent("   ", NOW), null);
  assert.equal(createOptionalRichContent(null, NOW), null);
});

test("recalcula plainText quando recebe HTML", () => {
  const content = createRichContentFromHtml(
    { content: "<p><strong>Teia alimentar</strong></p>" },
    NOW,
  );

  assert.equal(content.plainText, "Teia alimentar");
  assert.equal(validateRichContent(content).valid, true);
});
