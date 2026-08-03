import { clearElement, createElement } from "../../utils/dom.js";

const CATEGORY_LABELS = Object.freeze({
  pending: "Pendente",
  recurrent: "Reincidente",
  reviewed: "Revisado",
  overcome: "Superado",
});

const GROUP_COPY = Object.freeze({
  recurrent: {
    title: "Reincidentes",
    description: "Erros que voltaram a acontecer e exigem uma nova revisão da estratégia.",
  },
  pending: {
    title: "Pendentes",
    description: "Erros novos ou análises que ainda precisam ser concluídas e revisadas.",
  },
  reviewed: {
    title: "Revisados",
    description: "Análises concluídas e já revisitadas, aguardando evidências de superação.",
  },
  overcome: {
    title: "Superados",
    description: "Erros com duas respostas corretas consecutivas após a ocorrência mais recente.",
  },
});

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function createMetric(document, label, value, detail) {
  const card = createElement(document, "article", {
    className: "panel error-metric-card",
  });
  card.append(
    createElement(document, "span", { text: label }),
    createElement(document, "strong", { text: value }),
  );
  if (detail) {
    card.append(createElement(document, "small", { text: detail }));
  }
  return card;
}

function createBadge(document, text, className = "") {
  return createElement(document, "span", {
    className: `record-badge ${className}`.trim(),
    text,
  });
}

function createErrorCard({
  document,
  view,
  onOpen,
  onToggleReviewed,
  onRecurrence,
  onEvidence,
  onArchive,
}) {
  const { record, errorRecord, primaryQuestion, linkedRecords, category } = view;
  const card = createElement(document, "article", {
    className: `panel error-card error-card-${category}`,
    attributes: {
      "data-error-category": category,
      "data-error-search": record.searchPlainText,
    },
  });

  const header = createElement(document, "header", {
    className: "record-card-header",
  });
  const titleGroup = createElement(document, "div", {
    className: "record-title-group",
  });
  titleGroup.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: `Questão ${primaryQuestion.order} · Test Quest`,
    }),
    createElement(document, "h3", {
      className: "record-title-line",
      text: record.title,
    }),
    createElement(document, "p", {
      className: "record-meta",
      text: `Ocorrência mais recente em ${formatDate(errorRecord.lastOccurrenceAt)}`,
    }),
  );
  const badges = createElement(document, "div", { className: "record-badges" });
  badges.append(
    createBadge(document, CATEGORY_LABELS[category], `error-badge-${category}`),
    createBadge(
      document,
      errorRecord.analysis.isComplete ? "Análise completa" : "Análise pendente",
      errorRecord.analysis.isComplete
        ? "error-analysis-complete"
        : "error-analysis-pending",
    ),
  );
  if (record.isImportant) {
    badges.append(createBadge(document, "Importante", "important-badge"));
  }
  header.append(titleGroup, badges);

  const question = createElement(document, "p", {
    className: "error-question-preview",
    text: primaryQuestion.statement.plainText,
  });

  const facts = createElement(document, "div", { className: "error-facts" });
  facts.append(
    createElement(document, "span", {
      text: `${errorRecord.recurrenceCount} reincidência(s)`,
    }),
    createElement(document, "span", {
      text: `${errorRecord.reviewCount} revisão(ões)`,
    }),
    createElement(document, "span", {
      text: `${errorRecord.currentCorrectStreak}/2 acertos consecutivos`,
    }),
  );

  const progress = createElement(document, "div", {
    className: "error-streak",
    attributes: {
      role: "progressbar",
      "aria-label": "Sequência correta para superar o erro",
      "aria-valuemin": "0",
      "aria-valuemax": "2",
      "aria-valuenow": String(errorRecord.currentCorrectStreak),
    },
  });
  progress.append(
    createElement(document, "span", {
      attributes: {
        style: `width: ${(errorRecord.currentCorrectStreak / 2) * 100}%`,
      },
    }),
  );

  if (errorRecord.errorTags.length || linkedRecords.length) {
    const tags = createElement(document, "div", { className: "tag-list" });
    errorRecord.errorTags.forEach((tag) =>
      tags.append(createElement(document, "span", { className: "tag", text: tag })),
    );
    linkedRecords.forEach((linked) =>
      tags.append(
        createElement(document, "span", {
          className: "tag error-linked-tag",
          text: `↗ ${linked.title}`,
        }),
      ),
    );
    card.append(header, question, facts, progress, tags);
  } else {
    card.append(header, question, facts, progress);
  }

  const actions = createElement(document, "div", { className: "record-actions" });
  const openButton = createElement(document, "button", {
    className: "button button-primary button-small",
    text: errorRecord.analysis.isComplete ? "Abrir análise" : "Analisar erro",
    attributes: { type: "button" },
  });
  openButton.addEventListener("click", () => onOpen(view));

  const reviewButton = createElement(document, "button", {
    className: "button button-secondary button-small",
    text: errorRecord.reviewStatus === "reviewed" ? "Reabrir revisão" : "Marcar revisado",
    attributes: {
      type: "button",
      title:
        !errorRecord.analysis.isComplete && errorRecord.reviewStatus !== "reviewed"
          ? "Conclua a análise antes de marcar como revisado."
          : "",
    },
  });
  reviewButton.disabled =
    !errorRecord.analysis.isComplete && errorRecord.reviewStatus !== "reviewed";
  reviewButton.addEventListener("click", () => onToggleReviewed(view));

  const recurrenceButton = createElement(document, "button", {
    className: "button button-secondary button-small",
    text: "Errei de novo",
    attributes: { type: "button" },
  });
  recurrenceButton.addEventListener("click", () => onRecurrence(view));

  const evidenceButton = createElement(document, "button", {
    className: "button button-secondary button-small",
    text:
      errorRecord.masteryStatus === "overcome"
        ? "Erro superado"
        : `Registrar acerto (${errorRecord.currentCorrectStreak}/2)`,
    attributes: {
      type: "button",
      title:
        errorRecord.masteryStatus === "overcome"
          ? "Uma nova sequência começa somente após uma reincidência."
          : "",
    },
  });
  evidenceButton.disabled = errorRecord.masteryStatus === "overcome";
  evidenceButton.addEventListener("click", () => onEvidence(view));

  const archiveButton = createElement(document, "button", {
    className: "button button-quiet-danger button-small",
    text: "Arquivar",
    attributes: { type: "button" },
  });
  archiveButton.addEventListener("click", () => onArchive(record));

  actions.append(
    openButton,
    reviewButton,
    recurrenceButton,
    evidenceButton,
    archiveButton,
  );
  card.append(actions);
  return card;
}

function setupFilters({ root, searchInput, filterSelect, filterEmpty }) {
  function apply() {
    const search = searchInput.value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
    const filter = filterSelect.value;
    let visibleTotal = 0;

    root.querySelectorAll(".error-group").forEach((group) => {
      let visibleInGroup = 0;
      group.querySelectorAll(".error-card").forEach((card) => {
        const matchesSearch = !search || card.dataset.errorSearch.includes(search);
        const matchesFilter =
          filter === "all" || card.dataset.errorCategory === filter;
        card.hidden = !(matchesSearch && matchesFilter);
        visibleInGroup += Number(!card.hidden);
      });
      group.hidden = visibleInGroup === 0;
      visibleTotal += visibleInGroup;
    });

    filterEmpty.hidden = visibleTotal > 0;
  }

  searchInput.addEventListener("input", apply);
  filterSelect.addEventListener("change", apply);
}

export function renderErrorsSection({
  document,
  container,
  views,
  aggregate,
  onOpen,
  onToggleReviewed,
  onRecurrence,
  onEvidence,
  onArchive,
  onOpenExercises,
}) {
  clearElement(container);
  const inner = createElement(document, "div", {
    className: "content-inner errors-content",
  });
  const header = createElement(document, "header", { className: "section-header" });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", { className: "eyebrow", text: "Aprender com falhas" }),
    createElement(document, "h2", { text: "Registros de Erro" }),
    createElement(document, "p", {
      className: "section-description",
      text:
        "Analise a causa, registre a regra correta, revise e acompanhe duas respostas corretas consecutivas até superar cada erro.",
    }),
  );
  const exerciseButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Abrir Exercícios",
    attributes: { type: "button" },
  });
  exerciseButton.addEventListener("click", onOpenExercises);
  header.append(copy, exerciseButton);
  inner.append(header);

  if (!views.length) {
    const empty = createElement(document, "section", {
      className: "panel empty-state error-empty-state",
    });
    empty.append(
      createElement(document, "div", { className: "placeholder-icon", text: "!" }),
      createElement(document, "h3", { text: "Nenhum Registro de Erro ainda" }),
      createElement(document, "p", {
        text:
          "Abra uma lista importada, selecione as questões incorretas e transforme cada uma em uma análise recuperável.",
      }),
    );
    const action = createElement(document, "button", {
      className: "button button-primary",
      text: "Selecionar erros nos Exercícios",
      attributes: { type: "button" },
    });
    action.addEventListener("click", onOpenExercises);
    empty.append(action);
    inner.append(empty);
    container.append(inner);
    return;
  }

  const metrics = createElement(document, "section", {
    className: "error-metrics-grid",
  });
  metrics.append(
    createMetric(document, "Pendentes", aggregate.pending, `${aggregate.analyzed} análise(s) completa(s)`),
    createMetric(document, "Reincidentes", aggregate.recurrent, "Prioridade de revisão"),
    createMetric(document, "Revisados", aggregate.reviewed, "Aguardando evidências"),
    createMetric(document, "Superados", aggregate.overcome, "Duas respostas corretas"),
  );
  inner.append(metrics);

  const toolbar = createElement(document, "section", {
    className: "records-toolbar panel error-toolbar",
  });
  const searchInput = createElement(document, "input", {
    attributes: {
      type: "search",
      placeholder: "Buscar no erro, regra, estratégia ou questão...",
      "aria-label": "Buscar Registros de Erro",
    },
  });
  const filterSelect = createElement(document, "select", {
    attributes: { "aria-label": "Filtrar Registros de Erro" },
  });
  [
    ["all", "Todos os estados"],
    ["pending", "Pendentes"],
    ["recurrent", "Reincidentes"],
    ["reviewed", "Revisados"],
    ["overcome", "Superados"],
  ].forEach(([value, label]) =>
    filterSelect.append(
      createElement(document, "option", { text: label, attributes: { value } }),
    ),
  );
  toolbar.append(searchInput, filterSelect);
  inner.append(toolbar);

  const groupsRoot = createElement(document, "div", { className: "error-groups" });
  for (const category of ["recurrent", "pending", "reviewed", "overcome"]) {
    const groupViews = views.filter((view) => view.category === category);
    if (!groupViews.length) {
      continue;
    }
    const group = createElement(document, "section", {
      className: `error-group error-group-${category}`,
      attributes: { "data-error-group": category },
    });
    const heading = createElement(document, "header", {
      className: "error-group-heading",
    });
    heading.append(
      createElement(document, "div", {
        className: `error-group-marker error-group-marker-${category}`,
        text: category === "recurrent" ? "↻" : category === "overcome" ? "✓" : "!",
      }),
      createElement(document, "div"),
    );
    heading.lastElementChild.append(
      createElement(document, "h3", {
        text: `${GROUP_COPY[category].title} · ${groupViews.length}`,
      }),
      createElement(document, "p", { text: GROUP_COPY[category].description }),
    );
    const grid = createElement(document, "div", { className: "error-card-grid" });
    groupViews.forEach((view) =>
      grid.append(
        createErrorCard({
          document,
          view,
          onOpen,
          onToggleReviewed,
          onRecurrence,
          onEvidence,
          onArchive,
        }),
      ),
    );
    group.append(heading, grid);
    groupsRoot.append(group);
  }
  const filterEmpty = createElement(document, "p", {
    className: "filter-empty panel",
    text: "Nenhum Registro de Erro corresponde aos filtros atuais.",
  });
  filterEmpty.hidden = true;
  inner.append(groupsRoot, filterEmpty);
  setupFilters({ root: groupsRoot, searchInput, filterSelect, filterEmpty });

  container.append(inner);
}
