export const APP_CONFIG = Object.freeze({
  appName: "Study Stack",
  storageNamespace: "study-stack",
  defaultSection: "overview",
  mobileBreakpoint: 900,

  integration: Object.freeze({
    conceptCompassFallbackUrl:
      "https://viniciusidney.github.io/concept-compass/#/",
    allowedReturnOrigins: Object.freeze([
      "https://viniciusidney.github.io",
      "http://127.0.0.1:4173",
      "http://localhost:4173",
    ]),
  }),

  developmentSubject: Object.freeze({
    enabledOnLocalhost: true,
    subjectId: "subject-ecology-food-webs",
    subjectName: "Cadeias e Teias Alimentares",
    themeName: "Ecologia",
    subjectArea: "Biologia",
    returnUrl: "https://viniciusidney.github.io/concept-compass/#/",
  }),

  preferenceDefaults: Object.freeze({
    theme: "system",
    sidebarOpen: true,
    showCounters: true,
    reducedMotion: false,
    startSection: "overview",
  }),
});
