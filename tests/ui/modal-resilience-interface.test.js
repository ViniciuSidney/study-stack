import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("resiliência dos modais é carregada globalmente e usa corpo flexível", async () => {
  const html = await read("../../index.html");
  const resilience = await read("../../styles/modal-resilience.css");

  assert.match(
    html,
    /<link\s+rel="stylesheet"\s+href="styles\/modal-resilience\.css"\s*\/>/,
  );
  assert.match(
    resilience,
    /\.modal-card\s*\{[\s\S]*display:\s*flex[\s\S]*min-height:\s*0[\s\S]*flex-direction:\s*column[\s\S]*overflow:\s*hidden/,
  );
  assert.match(
    resilience,
    /\.modal-body\s*\{[\s\S]*min-height:\s*0[\s\S]*flex:\s*1\s+1\s+auto[\s\S]*overflow-y:\s*auto[\s\S]*scrollbar-gutter:\s*stable/,
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
