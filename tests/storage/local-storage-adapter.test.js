import test from "node:test";
import assert from "node:assert/strict";

import {
  LocalStorageAdapter,
  StorageError,
} from "../../scripts/storage/local-storage-adapter.js";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

test("salva e lê valores dentro do namespace", () => {
  const storage = new MemoryStorage();
  const adapter = new LocalStorageAdapter(storage, "study-stack");

  adapter.set("preferences", { theme: "dark" });

  assert.deepEqual(adapter.get("preferences"), { theme: "dark" });
  assert.equal(storage.values.has("study-stack:preferences"), true);
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

  assert.throws(() => adapter.get("preferences"), StorageError);
});
