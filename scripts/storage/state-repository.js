import { updateIntegrity } from "./state-schema.js";
import { assertValidState } from "./state-validator.js";

function clone(value) {
  return structuredClone(value);
}

export class StateRepository {
  constructor({ storage, config, createInitialState, migrationRunner, clock }) {
    this.storage = storage;
    this.config = config;
    this.createInitialState = createInitialState;
    this.migrationRunner = migrationRunner;
    this.clock = clock;
    this.state = null;
  }

  initialize() {
    const stored = this.storage.get(this.config.storage.stateKey, null);

    if (stored === null) {
      const now = this.clock();
      const initialState = this.createInitialState({
        now,
        appVersion: this.config.appVersion,
        schemaVersion: this.config.storage.schemaVersion,
        preferenceDefaults: this.config.preferenceDefaults,
      });

      this.state = this.#persist(initialState);
      return this.getState();
    }

    const migration = this.migrationRunner.migrate(stored);
    this.state = this.#persist(migration.state, {
      write: migration.applied.length > 0,
    });

    return this.getState();
  }

  getState() {
    this.#assertInitialized();
    return clone(this.state);
  }

  getCollection(name) {
    this.#assertCollection(name);
    return clone(this.state.collections[name]);
  }

  getEntity(collectionName, id) {
    this.#assertCollection(collectionName);
    const entity = this.state.collections[collectionName][id];
    return entity ? clone(entity) : null;
  }

  transaction(mutator) {
    this.#assertInitialized();

    if (typeof mutator !== "function") {
      throw new TypeError("A transação exige uma função mutadora.");
    }

    const draft = clone(this.state);
    const result = mutator(draft);
    const now = this.clock();

    draft.appVersion = this.config.appVersion;
    draft.updatedAt = now;
    updateIntegrity(draft, now);
    this.state = this.#persist(draft);

    return {
      state: this.getState(),
      result: clone(result),
    };
  }

  upsertEntity(collectionName, entity) {
    this.#assertCollection(collectionName);

    if (!entity || typeof entity.id !== "string" || !entity.id.trim()) {
      throw new TypeError("A entidade deve possuir um ID válido.");
    }

    return this.transaction((draft) => {
      draft.collections[collectionName][entity.id] = clone(entity);
      return entity;
    }).result;
  }

  #persist(candidate, options = {}) {
    assertValidState(candidate, this.config.storage.schemaVersion);

    if (options.write !== false) {
      this.storage.set(this.config.storage.stateKey, candidate);
    }

    return clone(candidate);
  }

  #assertInitialized() {
    if (!this.state) {
      throw new Error("O repositório ainda não foi inicializado.");
    }
  }

  #assertCollection(name) {
    this.#assertInitialized();

    if (!Object.hasOwn(this.state.collections, name)) {
      throw new RangeError(`Coleção desconhecida: ${name}.`);
    }
  }
}
