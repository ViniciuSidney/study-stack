import { STORAGE_CONFIG } from "./storage-config.js";

export const APP_CONFIG = Object.freeze({
  appName: "Study Stack",
  appVersion: "0.1.0-dev.7",
  storageNamespace: "study-stack",
  storage: STORAGE_CONFIG,
  defaultSection: "overview",
  mobileBreakpoint: 900,

  integration: Object.freeze({
    conceptCompassFallbackUrl:
      "https://viniciusidney.github.io/concept-compass/#/",
    conceptCompassContractVersions: Object.freeze(["1.0.0"]),
    testQuestContractVersions: Object.freeze(["1.0.0"]),
    testQuestHandoffKey: "study-stack:handoff:test-quest:v1",
    allowedReturnOrigins: Object.freeze([
      "https://viniciusidney.github.io",
      "http://127.0.0.1:4173",
      "http://localhost:4173",
    ]),
  }),

  developmentSubject: Object.freeze({
    contractVersion: "1.0.0",
    sentAt: "2026-08-02T18:00:00.000-03:00",
    sourceApp: "concept_compass",
    subject: Object.freeze({
      matterId: "matter-biology",
      matterName: "Biologia",
      themeId: "theme-ecology",
      themeName: "Ecologia",
      subjectId: "subject-ecology-food-webs",
      subjectName: "Cadeias e Teias Alimentares",
    }),
    sourceArchived: false,
    returnUrl: "https://viniciusidney.github.io/concept-compass/#/",
    navigationContext: Object.freeze({
      section: "subjects",
      source: "development-fixture",
    }),
  }),

  preferenceDefaults: Object.freeze({
    theme: "system",
    sidebarOpen: true,
    showCounters: true,
    reducedMotion: false,
    startSection: "overview",
  }),
});
