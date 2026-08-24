import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("CSS e AppShell usam a mesma fonte para o breakpoint mobile", async () => {
  const config = await read("../../scripts/config/app-config.js");
  const shell = await read("../../scripts/ui/app-shell.js");
  const responsive = await read("../../styles/responsive.css");

  const breakpointMatch = config.match(/mobileBreakpoint:\s*(\d+)/);
  assert.ok(breakpointMatch, "mobileBreakpoint deve existir no APP_CONFIG");

  const breakpoint = Number(breakpointMatch[1]);
  assert.equal(breakpoint, 900);
  assert.match(responsive, new RegExp(`@media \\(max-width: ${breakpoint}px\\)`));
  assert.match(
    shell,
    /this\.window\.matchMedia\([\s\S]*`\(max-width: \$\{this\.config\.mobileBreakpoint\}px\)`[\s\S]*\)\.matches/,
  );
  assert.doesNotMatch(shell, /innerWidth\s*<=\s*this\.config\.mobileBreakpoint/);
});

test("limite de navegação separa 900px de 901px sem zona ambígua", async () => {
  const config = await read("../../scripts/config/app-config.js");
  const breakpoint = Number(config.match(/mobileBreakpoint:\s*(\d+)/)?.[1]);

  const isMobileByContract = (width) => width <= breakpoint;

  assert.equal(isMobileByContract(899), true);
  assert.equal(isMobileByContract(900), true);
  assert.equal(isMobileByContract(901), false);
});
