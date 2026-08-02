import test from "node:test";
import assert from "node:assert/strict";

import {
  LocalStorageAdapter,
  StorageError,
} from "../../scripts/storage/local-storage-adapter.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";

test("salva e lê valores dentro do namespace", () => {
  const storage = new MemoryStorage();
  const adapter = new LocalStorageAdapter(storage, "study-stack");

  adapter.set("v1:state", { schemaVersion: "1.0.0" });

  assert.deepEqual(adapter.get("v1:state"), {
    schemaVersion: "1.0.0",
  });
  assert.equal(storage.values.has("study-stack:v1:state"), true);
});

test("retorna fallback quando a chave não existe", () => {
  const adapter = new LocalStorageAdapter(
    new MemoryStorage(),
    "study-stack",
  );

  assert.deepEqual(adapter.get("missing", { safe: true }), {
    safe: true,
  });
});

test("encapsula falhas de leitura como StorageError", () => {
  const brokenStorage = {
    getItem() {
      throw new Error("indisponível");
    },
    setItem() {},
    removeItem() {},
  };
  const adapter = new LocalStorageAdapter(
    brokenStorage,
    "study-stack",
  );

  assert.throws(() => adapter.get("v1:state"), StorageError);
});
