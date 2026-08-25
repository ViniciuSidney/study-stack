import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("assunto consolidado recebe confirmação visual pelo estado real da consolidação", async () => {
  const shell = await read("../../scripts/ui/app-shell.js");

  assert.match(shell, /const consolidationStatus = context\.consolidation\?\.status \?\? null/);
  assert.match(shell, /consolidationStatus === "confirmed"/);
  assert.match(shell, /context\.studyState === "consolidated"/);
  assert.match(shell, /`\$\{context\.subjectName\} ✅`/);
  assert.match(shell, /const displayStudyState = consolidated \? "consolidated" : context\.studyState/);
});

test("roteiro concluído não exibe Etapa atual junto de Concluída", async () => {
  const css = await read("../../styles/overview-refinements.css");

  assert.match(
    css,
    /\.guided-flow-panel\.completed[\s\S]*\.guided-flow-badges[\s\S]*> span:not\(\.complete\)[\s\S]*display:\s*none/,
  );
});
