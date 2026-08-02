import { readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const ignoredDirectories = new Set([
  ".git",
  "coverage",
  "dist",
  "node_modules",
]);

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }

    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      results.push(...(await collectJavaScriptFiles(absolutePath)));
      continue;
    }

    if (entry.isFile() && extname(entry.name) === ".js") {
      results.push(absolutePath);
    }
  }

  return results;
}

const files = await collectJavaScriptFiles(projectRoot);
let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    failed = true;
    console.error(`\n${relative(projectRoot, file)}\n${result.stderr}`);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`${files.length} arquivos JavaScript verificados.`);
}
