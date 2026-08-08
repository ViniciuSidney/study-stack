import assert from "node:assert/strict";
import test from "node:test";

import {
  ActiveSubjectStateWatcher,
  STUDY_STACK_STATE_STORAGE_KEY,
  isSubjectUnavailableInState,
} from "../../scripts/integrations/active-subject-state-watcher.js";

function createState({ subjects = {}, deletedSubjects = {} } = {}) {
  return {
    collections: {
      subjects,
      integrationState: {
        global: {
          conceptCompass: { deletedSubjects },
        },
      },
    },
  };
}

function createWindow(initialState) {
  const values = new Map();
  if (initialState) {
    values.set(STUDY_STACK_STATE_STORAGE_KEY, JSON.stringify(initialState));
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
    emitStorage(key, newValue) {
      listeners.get("storage")?.({ key, newValue });
    },
    emitFocus() {
      listeners.get("focus")?.();
    },
    emitVisibility() {
      documentListeners.get("visibilitychange")?.();
    },
  };
}

test("detecta Subject ausente ou tombstonado no estado compartilhado", () => {
  assert.equal(
    isSubjectUnavailableInState(createState({ subjects: { s1: { id: "s1" } } }), "s1"),
    false,
  );
  assert.equal(isSubjectUnavailableInState(createState({ subjects: {} }), "s1"), true);
  assert.equal(
    isSubjectUnavailableInState(
      createState({
        subjects: { s1: { id: "s1" } },
        deletedSubjects: { s1: { subjectId: "s1" } },
      }),
      "s1",
    ),
    true,
  );
});

test("segunda aba invalida o Subject quando outra aba atualiza study-stack:v1:state", () => {
  const initialState = createState({ subjects: { s1: { id: "s1" }, s2: { id: "s2" } } });
  const window = createWindow(initialState);
  const notifications = [];
  const watcher = new ActiveSubjectStateWatcher({
    window,
    getSubjectId: () => "s1",
    onUnavailable: (detail) => notifications.push(detail),
  }).install();

  const nextState = createState({
    subjects: { s2: { id: "s2" } },
    deletedSubjects: { s1: { subjectId: "s1" } },
  });
  window.emitStorage(STUDY_STACK_STATE_STORAGE_KEY, JSON.stringify(nextState));

  assert.deepEqual(notifications, [{ subjectId: "s1", source: "shared_state" }]);
  watcher.destroy();
});

test("aba de outro Subject permanece ativa após exclusão não relacionada", () => {
  const window = createWindow(
    createState({ subjects: { s1: { id: "s1" }, s2: { id: "s2" } } }),
  );
  const notifications = [];
  new ActiveSubjectStateWatcher({
    window,
    getSubjectId: () => "s2",
    onUnavailable: (detail) => notifications.push(detail),
  }).install();

  const nextState = createState({
    subjects: { s2: { id: "s2" } },
    deletedSubjects: { s1: { subjectId: "s1" } },
  });
  window.emitStorage(STUDY_STACK_STATE_STORAGE_KEY, JSON.stringify(nextState));

  assert.deepEqual(notifications, []);
});

test("focus reconcilia uma aba que perdeu o evento de storage", () => {
  const window = createWindow(
    createState({
      subjects: {},
      deletedSubjects: { s1: { subjectId: "s1" } },
    }),
  );
  const notifications = [];
  new ActiveSubjectStateWatcher({
    window,
    getSubjectId: () => "s1",
    onUnavailable: (detail) => notifications.push(detail),
  }).install();

  window.emitFocus();
  window.emitFocus();

  assert.deepEqual(notifications, [{ subjectId: "s1", source: "shared_state" }]);
});
