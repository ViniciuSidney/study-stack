function getEventConstructor(document) {
  return document.defaultView?.Event ?? Event;
}

function resetControls(scope, { focusSearch = true } = {}) {
  const document = scope.ownerDocument ?? scope;
  const EventCtor = getEventConstructor(document);
  const searchInputs = [...scope.querySelectorAll('input[type="search"]')];
  const filterSelects = [...scope.querySelectorAll("select")].filter((select) =>
    [...select.options].some((option) => option.value === "all"),
  );

  searchInputs.forEach((input) => {
    input.value = "";
  });
  filterSelects.forEach((select) => {
    select.value = "all";
  });

  searchInputs.forEach((input) => {
    input.dispatchEvent(new EventCtor("input", { bubbles: true }));
  });
  filterSelects.forEach((select) => {
    select.dispatchEvent(new EventCtor("change", { bubbles: true }));
  });

  if (focusSearch) {
    searchInputs[0]?.focus();
  }
}

function createResetButton(document, label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button button-secondary button-small filter-reset-action";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function centerEnhancedEmpty(empty) {
  empty.style.display = "flex";
  empty.style.flexDirection = "column";
  empty.style.alignItems = "center";
  empty.style.textAlign = "center";

  empty.querySelectorAll("p").forEach((paragraph) => {
    paragraph.style.width = "fit-content";
    paragraph.style.maxWidth = "min(100%, 42rem)";
    paragraph.style.marginInline = "auto";
    paragraph.style.textAlign = "center";
  });
}

function enhanceFilteredEmpty(empty, document) {
  if (empty.dataset.filterResetEnhanced === "true") return;
  const scope = empty.closest(".content-inner");
  if (!scope) return;

  empty.dataset.filterResetEnhanced = "true";
  empty.classList.add("empty-state", "filtered-empty-state");
  empty.replaceChildren(
    Object.assign(document.createElement("strong"), {
      textContent: "Nenhum resultado encontrado",
    }),
    Object.assign(document.createElement("p"), {
      textContent:
        "Sua pesquisa ou os filtros atuais não correspondem a nenhum item.",
    }),
    createResetButton(document, "Limpar pesquisa e filtros", () =>
      resetControls(scope),
    ),
  );
  centerEnhancedEmpty(empty);
}

function enhanceNoteLinkEmpty(empty, document) {
  if (empty.dataset.filterResetEnhanced === "true") return;
  const picker = empty.closest(".note-link-picker");
  if (!picker || picker.querySelectorAll(".note-link-option").length === 0) return;

  empty.dataset.filterResetEnhanced = "true";
  empty.append(
    createResetButton(document, "Limpar pesquisa", () =>
      resetControls(picker),
    ),
  );
}

function enhanceHistoryEmpty(empty, document) {
  if (empty.dataset.filterResetEnhanced === "true") return;
  const scope = empty.closest(".content-inner");
  if (!scope) return;
  const hasActiveFilter = [...scope.querySelectorAll("select")].some(
    (select) => select.value !== "all",
  );
  if (!hasActiveFilter) return;

  empty.dataset.filterResetEnhanced = "true";
  empty.replaceChildren(
    Object.assign(document.createElement("strong"), {
      textContent: "Nenhum resultado encontrado",
    }),
    Object.assign(document.createElement("p"), {
      textContent: "Os filtros atuais não correspondem a nenhum evento.",
    }),
    createResetButton(document, "Limpar filtros", () =>
      resetControls(scope, { focusSearch: false }),
    ),
  );
  centerEnhancedEmpty(empty);
}

function enhanceArchivedEmpty(empty, document) {
  if (empty.dataset.filterResetEnhanced === "true") return;
  const results = empty.closest(".archived-results");
  const scope = empty.closest(".content-inner");
  if (!results || !scope) return;
  const hasActiveFilter = [...scope.querySelectorAll("select")].some(
    (select) => select.value !== "all",
  );
  if (!hasActiveFilter) return;

  empty.dataset.filterResetEnhanced = "true";
  empty.replaceChildren(
    Object.assign(document.createElement("div"), {
      className: "placeholder-icon",
      textContent: "□",
    }),
    Object.assign(document.createElement("h3"), {
      textContent: "Nenhum resultado encontrado",
    }),
    Object.assign(document.createElement("p"), {
      textContent: "O filtro atual não corresponde a nenhum registro arquivado.",
    }),
    createResetButton(document, "Limpar filtros", () =>
      resetControls(scope, { focusSearch: false }),
    ),
  );
  centerEnhancedEmpty(empty);
}

function enhance(document) {
  document.querySelectorAll(".filter-empty").forEach((empty) =>
    enhanceFilteredEmpty(empty, document),
  );
  document.querySelectorAll(".note-link-empty").forEach((empty) =>
    enhanceNoteLinkEmpty(empty, document),
  );
  document.querySelectorAll(".history-empty").forEach((empty) =>
    enhanceHistoryEmpty(empty, document),
  );
  document.querySelectorAll(".archived-empty-state").forEach((empty) =>
    enhanceArchivedEmpty(empty, document),
  );
}

export function installFilterResetEnhancer({ document }) {
  if (!document?.documentElement) return null;
  if (document.documentElement.dataset.filterResetEnhancerInstalled === "true") {
    return null;
  }

  document.documentElement.dataset.filterResetEnhancerInstalled = "true";
  enhance(document);

  const Observer = document.defaultView?.MutationObserver ?? MutationObserver;
  const observer = new Observer(() => enhance(document));
  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}
