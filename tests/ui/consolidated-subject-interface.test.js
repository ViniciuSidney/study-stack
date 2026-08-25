import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("assunto consolidado recebe confirmação visual apenas na interface", async () => {
  const shell = await read("../../scripts/ui/app-shell.js");

  assert.match(shell, /context\.studyState === "consolidated"/);
  assert.match(shell, /`\$\{context\.subjectName\} ✅`/);
  assert.match(shell, /:\s*context\.subjectName/);
});

test("roteiro concluído não exibe Etapa atual junto de Concluída", async () => {
  const css = await read("../../styles/overview-refinements.css");

  assert.match(
    css,
    /\.guided-flow-panel\.completed[\s\S]*\.guided-flow-badges[\s\S]*> span:not\(\.complete\)[\s\S]*display:\s*none/,
  );
});
