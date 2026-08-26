import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("todos os modais preservam header e footer e deixam o corpo rolável", async () => {
  const resilience = await read("../../styles/modal-resilience.css");
  const testQuestCss = await read("../../styles/testquest-import.css");

  assert.match(testQuestCss, /@import url\("\.\/modal-resilience\.css"\)/);
  assert.match(
    resilience,
    /\.modal-card\s*\{[\s\S]*min-height:\s*0[\s\S]*overflow:\s*hidden/,
  );
  assert.match(
    resilience,
    /\.modal-body\s*\{[\s\S]*min-height:\s*0[\s\S]*scrollbar-gutter:\s*stable/,
  );
  assert.match(
    resilience,
    /\.modal-header,[\s\S]*\.modal-footer\s*\{[\s\S]*flex:\s*0\s+0\s+auto/,
  );
});

test("viewports baixos reduzem áreas internas altas sem cortar o modal", async () => {
  const resilience = await read("../../styles/modal-resilience.css");

  assert.match(resilience, /@media \(max-height:\s*720px\)/);
  assert.match(
    resilience,
    /\.testquest-manual-content \.json-import-textarea\s*\{[\s\S]*min-height:\s*clamp\(110px,\s*24dvh,\s*190px\)[\s\S]*max-height:\s*30dvh/,
  );
  assert.match(
    resilience,
    /\.rich-editor-surface\s*\{[\s\S]*min-height:\s*clamp\(180px,\s*38dvh,\s*300px\)/,
  );
});
