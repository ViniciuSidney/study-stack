import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("vínculo ausente orienta o usuário sem expor detalhes técnicos", async () => {
  const source = await read(
    "../../scripts/ui/states/missing-context-state.js",
  );

  assert.match(source, /Comece pelo Concept Compass/);
  assert.match(source, /Abrir Concept Compass/);
  assert.match(source, /conceptCompassUrl/);
  assert.match(source, /href: conceptCompassUrl/);
  assert.match(source, /target: "_blank"/);
  assert.match(source, /rel: "noopener noreferrer"/);
  assert.match(source, /data-return-state/);
  assert.match(source, /createElement\(document, "a"/);
  assert.doesNotMatch(source, /Contrato obrigatório/);
  assert.doesNotMatch(source, /Nenhum assunto válido foi recebido/);
  assert.doesNotMatch(source, /Usar contexto de desenvolvimento/);
  assert.doesNotMatch(source, /contractVersion=1\.0\.0/);

  const app = await read("../../scripts/app.js");
  assert.ok(
    app.indexOf("if (!this.context.valid || !this.subject)") <
      app.indexOf('if (sectionId === "settings")'),
    "o vínculo ausente deve prevalecer sobre rotas internas",
  );
});

test("identidade v0.3.0 aplica o ícone no cabeçalho, favicon e estado público", async () => {
  const html = await read("../../index.html");
  const state = await read(
    "../../scripts/ui/states/missing-context-state.js",
  );
  const layout = await read("../../styles/layout.css");
  const responsive = await read("../../styles/responsive.css");
  const iconPath = fileURLToPath(
    new URL("../../assets/icons/app-icon.svg", import.meta.url),
  );
  const touchIconPath = fileURLToPath(
    new URL("../../assets/icons/app-icon-192.png", import.meta.url),
  );
  const icon = await read("../../assets/icons/app-icon.svg");

  await access(iconPath);
  await access(touchIconPath);
  assert.match(html, /class="brand-icon"/);
  assert.match(html, /apple-touch-icon/);
  assert.match(html, /Study Stack v0\.3\.0/);
  assert.match(state, /assets\/icons\/app-icon\.svg/);
  assert.match(icon, /Três cartões de estudo empilhados/);
  assert.match(layout, /\.app-shell\.missing-context-mode/);
  assert.match(layout, /\.missing-context-mode \.subject-context/);
  assert.match(responsive, /\.missing-context-action[\s\S]*width:\s*100%/);
});
