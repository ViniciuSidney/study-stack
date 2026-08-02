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
  constructor({ repository, legacyStorage, defaults, clock }) {
    this.repository = repository;
    this.legacyStorage = legacyStorage;
    this.defaults = Object.freeze({ ...defaults });
    this.clock = clock;
  }

  load() {
    const settings = this.repository.getEntity("settings", "global");
    const current = this.#normalize(settings?.ui ?? this.defaults);
    const legacy = this.legacyStorage?.get("preferences", null);

    if (legacy && !settings.legacyPreferencesMigratedAt) {
      const migrated = this.#normalize({ ...current, ...legacy });
      this.#save(migrated, {
        legacyPreferencesMigratedAt: this.clock(),
      });
      this.legacyStorage.remove("preferences");
      return migrated;
    }

    return current;
  }

  update(current, partial) {
    const next = this.#normalize({ ...current, ...partial });
    this.#save(next);
    return next;
  }

  reset() {
    const next = this.#normalize(this.defaults);
    this.#save(next);
    return next;
  }

  #save(preferences, extra = {}) {
    const now = this.clock();

    this.repository.transaction((draft) => {
      const settings = draft.collections.settings.global;
      settings.ui = { ...preferences };
      settings.updatedAt = now;
      Object.assign(settings, extra);
    });
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
