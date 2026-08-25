import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("preview de restauração mostra somente categorias reconhecíveis pelo usuário", async () => {
  const source = await read("../../scripts/ui/modals/restore-modal.js");

  assert.match(source, /function getVisibleRecordCounts\(envelope\)/);
  assert.match(source, /record\.type === "summary"/);
  assert.match(source, /record\.type === "note"/);
  assert.match(source, /record\.type === "imported_session"/);
  assert.match(source, /record\.type === "error_record"/);
  assert.match(source, /createMetric\(document, "Resumos", visibleCounts\.summaries\)/);
  assert.match(source, /createMetric\(document, "Anotações", visibleCounts\.notes\)/);
  assert.match(source, /createMetric\(document, "Listas", visibleCounts\.sessions\)/);
  assert.match(source, /createMetric\(document, "Erros", visibleCounts\.errors\)/);
  assert.doesNotMatch(source, /restore-merge-chip-identical/);
  assert.doesNotMatch(source, /idênticos/);
});

test("diferenças na mesclagem são explicadas sem detalhes técnicos", async () => {
  const source = await read("../../scripts/ui/modals/restore-modal.js");

  assert.match(
    source,
    /Algumas diferenças foram encontradas\. Seus dados atuais serão mantidos\./,
  );
  assert.doesNotMatch(source, /Ver detalhes dos conflitos/);
  assert.doesNotMatch(source, /restore-conflicts/);
  assert.doesNotMatch(source, /conflict\.collectionName/);
  assert.doesNotMatch(source, /conflict\.id/);
  assert.doesNotMatch(source, /Conflitos serão preservados/);
});
