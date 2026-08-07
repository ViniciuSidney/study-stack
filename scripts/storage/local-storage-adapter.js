export class StorageError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = "StorageError";
  }
}

export class LocalStorageAdapter {
  constructor(storage, namespace) {
    if (!storage) {
      throw new TypeError("Uma implementação de Storage é obrigatória.");
    }

    if (!namespace || typeof namespace !== "string") {
      throw new TypeError("Um namespace de armazenamento é obrigatório.");
    }

    this.storage = storage;
    this.namespace = namespace;
  }

  get(key, fallback = null) {
    try {
      const rawValue = this.storage.getItem(this.#resolveKey(key));

      if (rawValue === null) {
        return fallback;
      }

      return JSON.parse(rawValue);
    } catch (error) {
      throw new StorageError(`Não foi possível ler "${key}".`, {
        cause: error,
      });
    }
  }

  set(key, value) {
    try {
      const resolvedKey = this.#resolveKey(key);
      this.storage.setItem(resolvedKey, JSON.stringify(value));
      this.#notify("set", resolvedKey);
      return value;
    } catch (error) {
      throw new StorageError(`Não foi possível salvar "${key}".`, {
        cause: error,
      });
    }
  }

  remove(key) {
    try {
      const resolvedKey = this.#resolveKey(key);
      this.storage.removeItem(resolvedKey);
      this.#notify("remove", resolvedKey);
    } catch (error) {
      throw new StorageError(`Não foi possível remover "${key}".`, {
        cause: error,
      });
    }
  }

  #notify(operation, key) {
    if (
      typeof globalThis.dispatchEvent !== "function" ||
      typeof globalThis.CustomEvent !== "function"
    ) {
      return;
    }

    globalThis.dispatchEvent(
      new globalThis.CustomEvent("study-stack:storage-change", {
        detail: { operation, key },
      }),
    );
  }

  #resolveKey(key) {
    if (!key || typeof key !== "string") {
      throw new TypeError("A chave de armazenamento deve ser uma string.");
    }

    return `${this.namespace}:${key}`;
  }
}
