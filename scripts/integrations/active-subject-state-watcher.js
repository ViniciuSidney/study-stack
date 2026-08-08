import { APP_CONFIG } from "../config/app-config.js";

export const STUDY_STACK_STATE_STORAGE_KEY = `${APP_CONFIG.storageNamespace}:${APP_CONFIG.storage.stateKey}`;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseState(rawState) {
  if (typeof rawState !== "string" || !rawState.trim()) return null;

  try {
    const state = JSON.parse(rawState);
    return isPlainObject(state) ? state : null;
  } catch {
    return null;
  }
}

export function isSubjectUnavailableInState(state, subjectId) {
  if (!isPlainObject(state) || typeof subjectId !== "string" || !subjectId.trim()) {
    return false;
  }

  const subjects = state.collections?.subjects;
  if (!isPlainObject(subjects)) return false;

  const deletedSubjects =
    state.collections?.integrationState?.global?.conceptCompass?.deletedSubjects;
  const hasTombstone = isPlainObject(deletedSubjects) && Boolean(deletedSubjects[subjectId]);

  return hasTombstone || !Boolean(subjects[subjectId]);
}

export class ActiveSubjectStateWatcher {
  constructor({
    window,
    getSubjectId,
    onUnavailable,
    stateKey = STUDY_STACK_STATE_STORAGE_KEY,
  }) {
    if (!window?.localStorage) {
      throw new TypeError("Window e localStorage são obrigatórios para observar o Subject ativo.");
    }
    if (typeof getSubjectId !== "function") {
      throw new TypeError("getSubjectId deve ser uma função.");
    }
    if (typeof onUnavailable !== "function") {
      throw new TypeError("onUnavailable deve ser uma função.");
    }

    this.window = window;
    this.getSubjectId = getSubjectId;
    this.onUnavailable = onUnavailable;
    this.stateKey = stateKey;
    this.installed = false;
    this.invalidatedSubjectIds = new Set();
    this.boundStorage = (event) => {
      if (event?.key === this.stateKey) this.check(event.newValue);
    };
    this.boundFocus = () => this.check();
    this.boundVisibility = () => {
      if (this.window.document?.visibilityState !== "hidden") this.check();
    };
  }

  install() {
    if (this.installed) return this;

    this.window.addEventListener("storage", this.boundStorage);
    this.window.addEventListener("focus", this.boundFocus);
    this.window.document?.addEventListener?.("visibilitychange", this.boundVisibility);
    this.installed = true;
    return this;
  }

  destroy() {
    if (!this.installed) return;

    this.window.removeEventListener("storage", this.boundStorage);
    this.window.removeEventListener("focus", this.boundFocus);
    this.window.document?.removeEventListener?.("visibilitychange", this.boundVisibility);
    this.installed = false;
  }

  check(rawState = null) {
    const subjectId = this.getSubjectId();
    if (typeof subjectId !== "string" || !subjectId.trim()) return false;
    if (this.invalidatedSubjectIds.has(subjectId)) return true;

    const serializedState =
      typeof rawState === "string" ? rawState : this.window.localStorage.getItem(this.stateKey);
    const state = parseState(serializedState);
    if (!state || !isSubjectUnavailableInState(state, subjectId)) return false;

    this.invalidatedSubjectIds.add(subjectId);
    this.onUnavailable({ subjectId, source: "shared_state" });
    return true;
  }
}
