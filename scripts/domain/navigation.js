export const NAVIGATION_ITEMS = Object.freeze([
  { id: "overview", label: "Visão Geral", scope: "subject" },
  { id: "summaries", label: "Resumos", scope: "subject" },
  { id: "notes", label: "Anotações", scope: "subject" },
  { id: "exercises", label: "Exercícios", scope: "subject" },
  { id: "errors", label: "Erros", scope: "subject" },
  { id: "history", label: "Histórico", scope: "subject" },
  { id: "archived", label: "Arquivados", scope: "subject" },
  { id: "settings", label: "Configurações", scope: "application" },
]);

export const NAVIGATION_IDS = Object.freeze(
  NAVIGATION_ITEMS.map((item) => item.id),
);

export function isKnownSection(sectionId) {
  return NAVIGATION_IDS.includes(sectionId);
}

export function getNavigationItem(sectionId) {
  return NAVIGATION_ITEMS.find((item) => item.id === sectionId) ?? null;
}
