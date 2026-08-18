import { clearElement, createElement } from "../../utils/dom.js";

const ERROR_LIFECYCLE_EVENT = "study-stack:error-lifecycle";
const lifecycleHandlers = new WeakMap();

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

function getErrorCardTitle(record, primaryQuestion) {
  const title = String(record?.title ?? "").trim();
  const statement = String(primaryQuestion?.statement?.plainText ?? "").trim();
  const automaticPrefix = "Erro:";

  if (title.startsWith(automaticPrefix)) {
    const generatedText = title.slice(automaticPrefix.length).trim();
    const conciseStatement = statement.length > 82
      ? `${statement.slice(0, 79).trim()}…`
      : statement;

    if (!generatedText || generatedText === conciseStatement || generatedText === statement) {
      return `Registro de Erro da questão ${primaryQuestion.order}`;
    }
  }

  return title || `Registro de Erro da questão ${primaryQuestion.order}`;
}

function getPrimaryState(errorRecord) {
  if (errorRecord.masteryStatus === "overcome") {
    return {
      key: "overcome",
      label: "Superado",
      badgeClass: "error-badge-overcome",
      action: "open",
      actionLabel: "Consultar análise",
    };
  }

  if (!errorRecord.analysis.isComplete) {
    return {
      key: "analysis_pending",
      label: "Análise pendente",
      badgeClass: "error-analysis-pending",
      action: "open",
      actionLabel: "Analisar erro",
    };
  }

  if (errorRecord.reviewStatus !== "reviewed") {
    return {
      key: "review_pending",
      label: "Revisão pendente",
      badgeClass: "error-badge-pending",
      action: "review",
      actionLabel: "Marcar revisado",
    };
  }

  return {
    key: "tracking",
    label: "Em acompanhamento",
    badgeClass: "error-badge-reviewed",
    action: "evidence",
    actionLabel: `Registrar acerto (${errorRecord.currentCorrectStreak}/2)`,
  };
}

function setupLifecycleBridge({
  document,
  views,
  onToggleReviewed,
  onRecurrence,
  onEvidence,
}) {
  const previous = lifecycleHandlers.get(document);
  if (previous) {
    document.removeEventListener(ERROR_LIFECYCLE_EVENT, previous);
  }

  const viewsByRecordId = new Map(
    views.map((view) => [view.record.id, view]),
  );
  const handler = (event) => {
    const recordId = event.detail?.recordId;
    const action = event.detail?.action;
    const view = viewsByRecordId.get(recordId);
    if (!view) return;

    if (action === "review") {
      onToggleReviewed(view);
    } else if (action === "recurrence") {
      onRecurrence(view);
    } else if (action === "evidence") {
      onEvidence(view);
    }
  };

  document.addEventListener(ERROR_LIFECYCLE_EVENT, handler);
  lifecycleHandlers.set(document, handler);
}

function createMoreActions({
  document,
  view,
  state,
  onOpen,
  onToggleReviewed,
  onRecurrence,
  onArchive,
}) {
  const { record, errorRecord } = view;
  const menu = createElement(document, "details", {
    className: "record-more-actions",
  });
  const trigger = createElement(document, "summary", {
    text: "⋯",
    attributes: { "aria-label": "Mais ações do Registro de Erro" },
  });
  const panel = createElement(document, "div", {
    className: "record-more-actions-menu",
  });

  if (state.action !== "open") {
    const openButton = createElement(document, "button", {
      text: "Abrir análise",
      attributes: { type: "button" },
    });
    openButton.addEventListener("click", () => onOpen(view));
    panel.append(openButton);
  }

  if (errorRecord.reviewStatus === "reviewed") {
    const reopenReviewButton = createElement(document, "button", {
      text: "Reabrir revisão",
      attributes: { type: "button" },
    });
    reopenReviewButton.addEventListener("click", () => onToggleReviewed(view));
    panel.append(reopenReviewButton);
  }

  const recurrenceButton = createElement(document, "button", {
    text: "Errei de novo",
    attributes: { type: "button" },
  });
  recurrenceButton.addEventListener("click", () => onRecurrence(view));
  panel.append(recurrenceButton);

  const archiveButton = createElement(document, "button", {
    className: "record-more-danger",
    text: "Arquivar",
    attributes: { type: "button" },
  });
  archiveButton.addEventListener("click", () => onArchive(record));
  panel.append(archiveButton);

  menu.append(trigger, panel);
  return menu;
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
  const state = getPrimaryState(errorRecord);
  const card = createElement(document, "article", {
    className: `panel error-card error-card-${category}`,
    attributes: {
      "data-error-category": category,
      "data-error-search": record.searchPlainText,
      "data-error-state": state.key,
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
      text: getErrorCardTitle(record, primaryQuestion),
    }),
    createElement(document, "p", {
      className: "record-meta",
      text: `Ocorrência mais recente em ${formatDate(errorRecord.lastOccurrenceAt)}`,
    }),
  );
  const badges = createElement(document, "div", { className: "record-badges" });
  badges.append(createBadge(document, state.label, state.badgeClass));
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
      text: `${errorRecord.currentCorrectStreak}/2 acertos para superar`,
    }),
  );
  if (errorRecord.recurrenceCount > 0) {
    facts.append(
      createElement(document, "span", {
        text: `${errorRecord.recurrenceCount} ${errorRecord.recurrenceCount === 1 ? "reincidência" : "reincidências"}`,
      }),
    );
  }
  if (errorRecord.reviewCount > 0) {
    facts.append(
      createElement(document, "span", {
        text: `${errorRecord.reviewCount} ${errorRecord.reviewCount === 1 ? "revisão" : "revisões"}`,
      }),
    );
  }

  const progress = createElement(document, "div", {
    className: "error-streak",
    attributes: {
      role: "progressbar",
      "aria-label": "Acertos necessários para superar o erro",
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

  card.append(header, question, facts, progress);

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
    card.append(tags);
  }

  const actions = createElement(document, "div", { className: "record-actions" });
  const primaryActions = createElement(document, "div", {
    className: "record-primary-actions",
  });
  const primaryButton = createElement(document, "button", {
    className: "button button-primary button-small",
    text: state.actionLabel,
    attributes: { type: "button" },
  });

  if (state.action === "review") {
    primaryButton.addEventListener("click", () => onToggleReviewed(view));
  } else if (state.action === "evidence") {
    primaryButton.addEventListener("click", () => onEvidence(view));
  } else {
    primaryButton.addEventListener("click", () => onOpen(view));
  }

  primaryActions.append(primaryButton);
  actions.append(
    primaryActions,
    createMoreActions({
      document,
      view,
      state,
      onOpen,
      onToggleReviewed,
      onRecurrence,
      onArchive,
    }),
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
  setupLifecycleBridge({
    document,
    views,
    onToggleReviewed,
    onRecurrence,
    onEvidence,
  });

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
        "Analise o erro, revise o que aprendeu e acompanhe sua superação com novas respostas corretas.",
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
