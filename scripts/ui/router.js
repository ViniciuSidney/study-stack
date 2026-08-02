import { isKnownSection } from "../domain/navigation.js";

function readHashSection(location) {
  const rawHash = location.hash.replace(/^#\/?/, "");
  return rawHash.split(/[/?]/)[0] || "";
}

export class Router {
  constructor(window, fallbackSection) {
    this.window = window;
    this.fallbackSection = fallbackSection;
    this.listeners = new Set();
    this.handleHashChange = this.handleHashChange.bind(this);
  }

  start() {
    this.window.addEventListener("hashchange", this.handleHashChange);

    const currentSection = this.getCurrentSection();

    if (!readHashSection(this.window.location)) {
      this.navigate(currentSection, { replace: true });
      return;
    }

    this.#emit(currentSection);
  }

  stop() {
    this.window.removeEventListener("hashchange", this.handleHashChange);
  }

  getCurrentSection() {
    const hashSection = readHashSection(this.window.location);

    return isKnownSection(hashSection)
      ? hashSection
      : this.fallbackSection;
  }

  navigate(sectionId, options = {}) {
    const target = isKnownSection(sectionId)
      ? sectionId
      : this.fallbackSection;
    const nextHash = `#/${target}`;

    if (this.window.location.hash === nextHash) {
      this.#emit(target);
      return;
    }

    if (options.replace) {
      this.window.history.replaceState(null, "", nextHash);
      this.#emit(target);
      return;
    }

    this.window.location.hash = nextHash;
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  handleHashChange() {
    this.#emit(this.getCurrentSection());
  }

  #emit(sectionId) {
    for (const listener of this.listeners) {
      listener(sectionId);
    }
  }
}
