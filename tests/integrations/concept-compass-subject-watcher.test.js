import assert from "node:assert/strict";
import test from "node:test";

import {
  CONCEPT_COMPASS_DATA_STORAGE_KEY,
  ConceptCompassSubjectWatcher,
  readConceptCompassSubjectSnapshot,
} from "../../scripts/integrations/concept-compass-subject-watcher.js";

function createConceptData({
  materiaName = "Biologia",
  temaName = "Ecologia",
  assuntoName = "Cadeias alimentares",
  materiaArchived = false,
  temaArchived = false,
  assuntoArchived = false,
  materiaId = "materia-1",
  temaId = "tema-1",
  assuntoId = "assunto-1",
} = {}) {
  return {
    schemaVersion: 3,
    materias: [
      {
        id: materiaId,
        nome: materiaName,
        arquivado: materiaArchived,
      },
    ],
    temas: [
      {
        id: temaId,
        materiaId,
        nome: temaName,
        arquivado: temaArchived,
      },
    ],
    assuntos: [
      {
        id: assuntoId,
        temaId,
        nome: assuntoName,
        arquivado: assuntoArchived,
      },
    ],
  };
}

function createWindow(initialData) {
  const values = new Map();
  if (initialData) {
    values.set(
      CONCEPT_COMPASS_DATA_STORAGE_KEY,
      JSON.stringify(initialData),
    );
  }
  const listeners = new Map();
  const documentListeners = new Map();

  return {
    localStorage: {
      getItem(key) {
        return values.has(key) ? values.get(key) : null;
      },
      setItem(key, value) {
        values.set(key, String(value));
      },
    },
    document: {
      visibilityState: "visible",
      addEventListener(type, callback) {
        documentListeners.set(type, callback);
      },
      removeEventListener(type) {
        documentListeners.delete(type);
      },
    },
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    emitConceptData(data) {
      const value = data === null ? null : JSON.stringify(data);
      if (value === null) {
        values.delete(CONCEPT_COMPASS_DATA_STORAGE_KEY);
      } else {
        values.set(CONCEPT_COMPASS_DATA_STORAGE_KEY, value);
      }
      listeners.get("storage")?.({
        key: CONCEPT_COMPASS_DATA_STORAGE_KEY,
        newValue: value,
      });
    },
    emitFocus() {
      listeners.get("focus")?.();
    },
    emitVisibility() {
      documentListeners.get("visibilitychange")?.();
    },
  };
}

test("resolve contexto ativo e arquivamento hierárquico pelo ID estável", () => {
  const active = readConceptCompassSubjectSnapshot(
    JSON.stringify(createConceptData()),
    "assunto-1",
  );
  assert.equal(active.status, "active");
  assert.equal(active.sourceArchived, false);
  assert.equal(active.matterName, "Biologia");

  const byTema = readConceptCompassSubjectSnapshot(
    JSON.stringify(createConceptData({ temaArchived: true })),
    "assunto-1",
  );
  assert.equal(byTema.status, "archived");
  assert.equal(byTema.archiveSource, "tema");

  const byMateria = readConceptCompassSubjectSnapshot(
    JSON.stringify(createConceptData({ materiaArchived: true })),
    "assunto-1",
  );
  assert.equal(byMateria.status, "archived");
  assert.equal(byMateria.archiveSource, "materia");
});

test("renomear e mover o Assunto gera novo snapshot sem trocar o subjectId", () => {
  const moved = readConceptCompassSubjectSnapshot(
    JSON.stringify(
      createConceptData({
        materiaId: "materia-2",
        materiaName: "Ciências",
        temaId: "tema-2",
        temaName: "Ecossistemas",
        assuntoName: "Teias alimentares",
      }),
    ),
    "assunto-1",
  );

  assert.equal(moved.subjectId, "assunto-1");
  assert.equal(moved.subjectName, "Teias alimentares");
  assert.equal(moved.themeId, "tema-2");
  assert.equal(moved.matterId, "materia-2");
});

test("watcher reage a arquivamento, restauração e renomeação sem F5", () => {
  const window = createWindow(createConceptData());
  const snapshots = [];
  const watcher = new ConceptCompassSubjectWatcher({
    window,
    getSubjectId: () => "assunto-1",
    onSnapshot: (snapshot) => snapshots.push(snapshot),
  }).install();

  watcher.check();
  window.emitConceptData(createConceptData({ assuntoArchived: true }));
  window.emitConceptData(
    createConceptData({
      assuntoName: "Novo nome",
      assuntoArchived: false,
    }),
  );

  assert.deepEqual(
    snapshots.map(({ status, subjectName }) => ({ status, subjectName })),
    [
      { status: "active", subjectName: "Cadeias alimentares" },
      { status: "archived", subjectName: "Cadeias alimentares" },
      { status: "active", subjectName: "Novo nome" },
    ],
  );
});

test("watcher sinaliza Assunto removido do Concept Compass", () => {
  const window = createWindow(createConceptData());
  const missing = [];
  const watcher = new ConceptCompassSubjectWatcher({
    window,
    getSubjectId: () => "assunto-1",
    onSnapshot() {},
    onMissing: (detail) => missing.push(detail),
  }).install();

  watcher.check();
  window.emitConceptData({
    schemaVersion: 3,
    materias: createConceptData().materias,
    temas: createConceptData().temas,
    assuntos: [],
  });

  assert.equal(missing.length, 1);
  assert.equal(missing[0].subjectId, "assunto-1");
  assert.equal(missing[0].source, "storage");
});

test("mudança sem efeito no Assunto ativo não rerenderiza desnecessariamente", () => {
  const window = createWindow(createConceptData());
  const snapshots = [];
  const watcher = new ConceptCompassSubjectWatcher({
    window,
    getSubjectId: () => "assunto-1",
    onSnapshot: (snapshot) => snapshots.push(snapshot),
  }).install();

  watcher.check();
  window.emitFocus();
  window.emitVisibility();

  assert.equal(snapshots.length, 1);
});
