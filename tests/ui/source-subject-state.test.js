import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("estados de origem distinguem arquivamento de exclusão", async () => {
  const source = await read(
    "../../scripts/ui/states/source-subject-state.js",
  );

  assert.match(source, /Estudo arquivado/);
  assert.match(source, /Assunto não disponível/);
  assert.match(source, /Voltar e restaurar no Concept Compass/);
  assert.match(source, /Voltar ao Concept Compass/);
  assert.match(source, /href: conceptCompassUrl/);
  assert.match(source, /target: "_blank"/);
  assert.match(source, /rel: "noopener noreferrer"/);
  assert.match(source, /data-return-state/);
  assert.match(source, /Sem vínculo com o Concept Compass/);
  assert.doesNotMatch(source, /sem precisar usar F5/);
  assert.match(source, /Criação, edição e mudança de etapa ficam bloqueadas/);
  assert.match(source, /article: "A", label: "Matéria", archived: "arquivada"/);
  assert.match(source, /article: "O", label: "Tema", archived: "arquivado"/);
  assert.match(source, /article: "O", label: "Assunto", archived: "arquivado"/);
});

test("integração ativa não depende mais de recarregar a aba", async () => {
  const main = await read("../../scripts/main.js");
  const app = await read("../../scripts/app.js");

  assert.doesNotMatch(main, /location\.reload/);
  assert.match(main, /ConceptCompassSubjectWatcher/);
  assert.match(app, /synchronizeConceptCompassSnapshot/);
  assert.match(app, /markSubjectDeleted/);
  assert.match(app, /ensureSubjectWritable/);
  assert.match(
    app,
    /this\.window\.open\(returnUrl, "_blank", "noopener,noreferrer"\)/,
  );
  assert.doesNotMatch(app, /location\.assign\(returnUrl\)/);
});
