import { clearElement, createElement } from "../../utils/dom.js";

const TYPE_LABELS = Object.freeze({
  summary: "Resumo",
  note: "Anotação",
  imported_session: "Lista importada",
  error_record: "Registro de erro",
});

const TYPE_OPTIONS = Object.freeze([
  { value: "all", label: "Todos os tipos" },
  { value: "summary", label: "Resumos" },
  { value: "note", label: "Anotações" },
  { value: "imported_session", label: "Listas importadas" },
  { value: "error_record", label: "Registros de erro" },
]);

function formatStudyDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function createEmptyState(document, { filtered = false } = {}) {
  const empty = createElement(document, "section", {
    className: "panel empty-state archived-empty-state",
  });
  empty.append(
    createElement(document, "div", { className: "placeholder-icon", text: "□" }),
    createElement(document, "h3", {
      text: filtered ? "Nenhum arquivado deste tipo" : "Nenhum registro arquivado",
    }),
    createElement(document, "p", {
      text: filtered
        ? "Escolha outro tipo de registro para continuar procurando."
        : "Quando você arquivar um registro, ele aparecerá aqui e poderá ser restaurado a qualquer momento.",
    }),
  );
  return empty;
}

function createArchivedCard(document, record, onRestore) {
  const card = createElement(document, "article", {
    className: "record-card archived-card panel",
  });
  card.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: TYPE_LABELS[record.type] ?? "Registro",
    }),
    createElement(document, "h3", { text: record.title || "Registro sem título" }),
    createElement(document, "p", {
      className: "record-meta",
      text: `Estudado em ${formatStudyDate(record.studyDate)}`,
    }),
    createElement(document, "p", {
      className: "record-preview archived-reason",
      text: record.archiveReason
        ? `Motivo do arquivamento: ${record.archiveReason}`
        : "Sem motivo de arquivamento informado.",
    }),
  );

  const actions = createElement(document, "div", {
    className: "record-actions archived-actions",
  });
  const restoreButton = createElement(document, "button", {
    className: "button button-primary archived-restore-button",
    text: "Restaurar registro",
    attributes: {
      type: "button",
      title: "Devolver este registro às telas principais.",
    },
  });
  restoreButton.addEventListener("click", () => onRestore(record));
  actions.append(restoreButton);
  card.append(actions);
  return card;
}

export function renderArchivedSection({
  document,
  container,
  records,
  onRestore,
}) {
  clearElement(container);
  const inner = createElement(document, "div", { className: "content-inner" });
  const header = createElement(document, "header", { className: "section-header" });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", { className: "eyebrow", text: "Recuperação" }),
    createElement(document, "h2", { text: "Arquivados" }),
    createElement(document, "p", {
      className: "section-description",
      text: "Registros arquivados ficam fora das telas principais e podem ser restaurados a qualquer momento.",
    }),
  );
  header.append(copy);
  inner.append(header);

  if (!records.length) {
    inner.append(createEmptyState(document));
    container.append(inner);
    return;
  }

  const toolbar = createElement(document, "div", {
    className: "panel archived-toolbar",
  });
  const filterField = createElement(document, "label", { className: "field" });
  filterField.append(createElement(document, "span", { text: "Tipo de registro" }));
  const typeFilter = createElement(document, "select", {
    attributes: { "aria-label": "Filtrar registros arquivados por tipo" },
  });
  TYPE_OPTIONS.forEach((option) => {
    typeFilter.append(
      createElement(document, "option", {
        text: option.label,
        attributes: { value: option.value },
      }),
    );
  });
  filterField.append(typeFilter);

  const count = createElement(document, "p", {
    className: "archived-count",
    attributes: { "aria-live": "polite" },
  });
  toolbar.append(filterField, count);

  const results = createElement(document, "div", { className: "archived-results" });
  inner.append(toolbar, results);

  function renderResults() {
    clearElement(results);
    const selectedType = typeFilter.value;
    const filtered = records.filter(
      (record) => selectedType === "all" || record.type === selectedType,
    );

    count.textContent = `${filtered.length} ${filtered.length === 1 ? "registro arquivado" : "registros arquivados"}`;

    if (!filtered.length) {
      results.append(createEmptyState(document, { filtered: true }));
      return;
    }

    const grid = createElement(document, "section", { className: "record-grid" });
    filtered.forEach((record) => {
      grid.append(createArchivedCard(document, record, onRestore));
    });
    results.append(grid);
  }

  typeFilter.addEventListener("change", renderResults);
  renderResults();

  container.append(inner);
}
