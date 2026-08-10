import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("Configurações oferece backup, restauração, diagnóstico e pendências", async () => {
  const source = await read("../../scripts/ui/sections/settings-section.js");
  assert.match(source, /Criar backup/);
  assert.match(source, /Restaurar backup/);
  assert.match(source, /Executar diagnóstico/);
  assert.match(source, /Ver importações pendentes/);
});

test("menu de utilidades apresenta as ferramentas e a versão estável", async () => {
  const html = await read("../../index.html");
  const pkg = JSON.parse(await read("../../package.json"));
  const lock = JSON.parse(await read("../../package-lock.json"));
  const config = await read("../../scripts/config/app-config.js");
  assert.match(html, /data-utility="backup"/);
  assert.match(html, /data-utility="restore"/);
  assert.match(html, /data-utility="diagnostics"/);
  assert.match(html, /Study Stack · v0\.2\.0/);
  assert.equal(pkg.version, "0.2.0");
  assert.equal(lock.version, "0.2.0");
  assert.match(config, /appVersion: "0\.2\.0"/);
});

test("modais de manutenção mantêm corpo rolável e rodapé separado", async () => {
  const css = await read("../../styles/components.css");
  assert.match(css, /\.restore-card[\s\S]*overflow:\s*hidden/);
  assert.match(css, /\.restore-body[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.diagnostic-body[\s\S]*overflow-y:\s*auto/);
});

test("restauração por substituição explica a confirmação obrigatória", async () => {
  const source = await read("../../scripts/ui/modals/restore-modal.js");
  assert.match(source, /Marque a confirmação de substituição/);
  assert.match(source, /restore-requirement-hint/);
  assert.match(source, /body\.append\(sourcePanel, modePanel, replaceConfirmation, previewPanel\)/);
});
