const VALID_THEMES = new Set(["system", "light", "dark"]);
const VALID_START_SECTIONS = new Set([
  "overview",
  "summaries",
  "notes",
  "exercises",
  "errors",
  "history",
  "archived",
  "settings",
]);

export class PreferencesService {
  constructor(storage, defaults) {
    this.storage = storage;
    this.defaults = Object.freeze({ ...defaults });
    this.storageKey = "preferences";
  }

  load() {
    const stored = this.storage.get(this.storageKey, {});
    return this.#normalize({ ...this.defaults, ...stored });
  }

  update(current, partial) {
    const next = this.#normalize({ ...current, ...partial });
    this.storage.set(this.storageKey, next);
    return next;
  }

  reset() {
    this.storage.remove(this.storageKey);
    return { ...this.defaults };
  }

  #normalize(candidate) {
    return Object.freeze({
      theme: VALID_THEMES.has(candidate.theme)
        ? candidate.theme
        : this.defaults.theme,
      sidebarOpen:
        typeof candidate.sidebarOpen === "boolean"
          ? candidate.sidebarOpen
          : this.defaults.sidebarOpen,
      showCounters:
        typeof candidate.showCounters === "boolean"
          ? candidate.showCounters
          : this.defaults.showCounters,
      reducedMotion:
        typeof candidate.reducedMotion === "boolean"
          ? candidate.reducedMotion
          : this.defaults.reducedMotion,
      startSection: VALID_START_SECTIONS.has(candidate.startSection)
        ? candidate.startSection
        : this.defaults.startSection,
    });
  }
}
