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

test("menu de utilidades ativa as ferramentas da Fundação 09", async () => {
  const html = await read("../../index.html");
  assert.match(html, /data-utility="backup"/);
  assert.match(html, /data-utility="restore"/);
  assert.match(html, /data-utility="diagnostics"/);
  assert.match(html, /Study Stack · Fundação 09/);
});

test("modais de manutenção mantêm corpo rolável e rodapé separado", async () => {
  const css = await read("../../styles/components.css");
  assert.match(css, /\.restore-card[\s\S]*overflow:\s*hidden/);
  assert.match(css, /\.restore-body[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.diagnostic-body[\s\S]*overflow-y:\s*auto/);
});
