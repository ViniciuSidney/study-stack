export const CONCEPT_COMPASS_DATA_STORAGE_KEY = "organizador-conteudos:data";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseData(rawData) {
  if (typeof rawData !== "string" || !rawData.trim()) {
    return null;
  }

  try {
    const data = JSON.parse(rawData);
    return isPlainObject(data) ? data : null;
  } catch {
    return null;
  }
}

function findById(collection, id) {
  return Array.isArray(collection)
    ? collection.find((item) => item?.id === id) ?? null
    : null;
}

export function readConceptCompassSubjectSnapshot(rawData, subjectId) {
  if (typeof subjectId !== "string" || !subjectId.trim()) {
    return null;
  }

  const data = parseData(rawData);
  if (!data) {
    return null;
  }

  const assunto = findById(data.assuntos, subjectId);
  if (!assunto) {
    return Object.freeze({
      status: "missing",
      subjectId,
    });
  }

  const tema = findById(data.temas, assunto.temaId);
  const materia = tema ? findById(data.materias, tema.materiaId) : null;

  if (!tema || !materia) {
    return Object.freeze({
      status: "missing",
      subjectId,
    });
  }

  const archiveSource = assunto.arquivado
    ? "assunto"
    : tema.arquivado
      ? "tema"
      : materia.arquivado
        ? "materia"
        : null;

  return Object.freeze({
    status: archiveSource ? "archived" : "active",
    subjectId: assunto.id,
    subjectName: assunto.nome,
    themeId: tema.id,
    themeName: tema.nome,
    matterId: materia.id,
    matterName: materia.nome,
    sourceArchived: Boolean(archiveSource),
    archiveSource,
  });
}

function fingerprint(snapshot) {
  return JSON.stringify(snapshot);
}

export class ConceptCompassSubjectWatcher {
  constructor({
    window,
    getSubjectId,
    onSnapshot,
    onMissing,
    dataKey = CONCEPT_COMPASS_DATA_STORAGE_KEY,
  }) {
    if (!window?.localStorage) {
      throw new TypeError(
        "Window e localStorage são obrigatórios para observar o Concept Compass.",
      );
    }
    if (typeof getSubjectId !== "function") {
      throw new TypeError("getSubjectId deve ser uma função.");
    }
    if (typeof onSnapshot !== "function") {
      throw new TypeError("onSnapshot deve ser uma função.");
    }

    this.window = window;
    this.getSubjectId = getSubjectId;
    this.onSnapshot = onSnapshot;
    this.onMissing = onMissing;
    this.dataKey = dataKey;
    this.installed = false;
    this.lastFingerprint = null;

    this.boundStorage = (event) => {
      if (event?.key === this.dataKey) {
        this.check(event.newValue, { source: "storage" });
      }
    };
    this.boundFocus = () => this.check(undefined, { source: "focus" });
    this.boundVisibility = () => {
      if (this.window.document?.visibilityState !== "hidden") {
        this.check(undefined, { source: "visibilitychange" });
      }
    };
  }

  install() {
    if (this.installed) {
      return this;
    }

    this.window.addEventListener("storage", this.boundStorage);
    this.window.addEventListener("focus", this.boundFocus);
    this.window.document?.addEventListener?.(
      "visibilitychange",
      this.boundVisibility,
    );
    this.installed = true;
    return this;
  }

  destroy() {
    if (!this.installed) {
      return;
    }

    this.window.removeEventListener("storage", this.boundStorage);
    this.window.removeEventListener("focus", this.boundFocus);
    this.window.document?.removeEventListener?.(
      "visibilitychange",
      this.boundVisibility,
    );
    this.installed = false;
  }

  check(rawData = undefined, { source = "manual" } = {}) {
    const subjectId = this.getSubjectId();
    if (typeof subjectId !== "string" || !subjectId.trim()) {
      return null;
    }

    const serialized =
      rawData === undefined
        ? this.window.localStorage.getItem(this.dataKey)
        : rawData;
    const snapshot = readConceptCompassSubjectSnapshot(serialized, subjectId);

    if (!snapshot) {
      return null;
    }

    const nextFingerprint = fingerprint(snapshot);
    if (nextFingerprint === this.lastFingerprint) {
      return snapshot;
    }

    this.lastFingerprint = nextFingerprint;

    if (snapshot.status === "missing") {
      this.onMissing?.({ ...snapshot, source });
      return snapshot;
    }

    this.onSnapshot({ ...snapshot, source });
    return snapshot;
  }
}
