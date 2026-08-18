import { clearElement, createElement } from "../../utils/dom.js";

const PRACTICE_MIN_ANSWERED = 15;

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function createMetric(document, label, value, detail = "") {
  const card = createElement(document, "article", {
    className: "exercise-metric panel",
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

function createStat(document, label, value, className = "") {
  const stat = createElement(document, "span", {
    className: `session-stat ${className}`.trim(),
  });
  stat.append(
    createElement(document, "strong", { text: value }),
    createElement(document, "span", { text: label }),
  );
  return stat;
}

export function formatPracticeValidationStatus(
  answered,
  threshold = PRACTICE_MIN_ANSWERED,
) {
  const missing = Math.max(0, threshold - Number(answered ?? 0));
  return missing > 0
    ? `Faltam ${missing} ${missing === 1 ? "questão respondida" : "questões respondidas"}`
    : "Válida para prática";
}

function createPracticeCriteria(document) {
  const panel = createElement(document, "section", {
    className: "panel practice-criteria-panel",
  });
  panel.append(
    createElement(document, "p", {
      text:
        "Uma lista válida é uma sessão do Test Quest que atende aos critérios mínimos exigidos para contar como prática.",
    }),
  );

  const details = createElement(document, "details", {
    className: "practice-criteria-details",
  });
  details.append(
    createElement(document, "summary", { text: "Ver critérios" }),
    createElement(document, "p", {
      text: `No momento, a lista precisa ter pelo menos ${PRACTICE_MIN_ANSWERED} questões respondidas para contar como prática.`,
    }),
  );
  panel.append(details);
  return panel;
}

function createSessionMoreActions({ document, record, onArchive }) {
  const menu = createElement(document, "details", {
    className: "record-more-actions",
  });
  const trigger = createElement(document, "summary", {
    text: "⋯",
    attributes: { "aria-label": "Mais ações da lista" },
  });
  const panel = createElement(document, "div", {
    className: "record-more-actions-menu",
  });
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

function createSessionCard({
  document,
  view,
  onOpen,
  onArchive,
  highlightSessionId,
}) {
  const { record, session } = view;
  const highlighted = session.id === highlightSessionId;
  const card = createElement(document, "article", {
    className: `exercise-session-card panel${highlighted ? " is-newly-imported" : ""}`,
    attributes: {
      "data-session-search": record.searchPlainText,
      "data-session-id": session.id,
      "data-practice-valid": String(session.stats.validForPractice),
      "data-has-errors": String(session.stats.incorrect > 0),
      tabindex: "-1",
    },
  });
  const header = createElement(document, "header", {
    className: "exercise-session-header",
  });
  const titleGroup = createElement(document, "div", {
    className: "record-title-group",
  });
  titleGroup.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Test Quest",
    }),
    createElement(document, "h3", {
      className: "record-title-line",
      text: session.sessionTitle,
    }),
    createElement(document, "p", {
      className: "record-meta",
      text: `${formatDate(session.sessionDate)} · ${session.stats.total} questões`,
    }),
  );
  const badges = createElement(document, "div", {
    className: "record-badges",
  });
  badges.append(
    createElement(document, "span", {
      className: session.stats.validForPractice
        ? "record-badge practice-valid-badge"
        : "record-badge practice-pending-badge",
      text: session.stats.validForPractice
        ? "Válida para prática"
        : "Ainda não válida",
      attributes: session.stats.validForPractice
        ? { title: "Esta lista conta como prática." }
        : {
            title: `${formatPracticeValidationStatus(session.stats.answered)} para esta lista contar como prática.`,
          },
    }),
  );
  header.append(titleGroup, badges);

  const performance = createElement(document, "div", {
    className: "session-performance",
  });
  const percentage = createElement(document, "div", {
    className: "session-percentage",
  });
  percentage.append(
    createElement(document, "strong", {
      text: `${session.stats.percentage}%`,
    }),
    createElement(document, "span", { text: "aproveitamento" }),
  );
  const track = createElement(document, "div", {
    className: "session-progress-track",
    attributes: {
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": String(session.stats.percentage),
      "aria-label": "Aproveitamento da lista",
    },
  });
  const bar = createElement(document, "span", {
    attributes: { style: `width: ${session.stats.percentage}%` },
  });
  track.append(bar);
  performance.append(percentage, track);

  const stats = createElement(document, "div", {
    className: "session-stats-grid",
  });
  stats.append(createStat(document, "Acertos", session.stats.correct, "correct"));
  if ((session.stats.partial ?? 0) > 0) {
    stats.append(
      createStat(document, "Parciais", session.stats.partial, "partial"),
    );
  }
  if (session.stats.incorrect > 0) {
    stats.append(
      createStat(document, "Erros", session.stats.incorrect, "incorrect"),
    );
  }
  if (session.stats.unanswered > 0) {
    stats.append(
      createStat(document, "Em branco", session.stats.unanswered, "unanswered"),
    );
  }
  stats.append(createStat(document, "Respondidas", session.stats.answered));

  const practiceHint = session.stats.validForPractice
    ? null
    : createElement(document, "p", {
        className: "record-guidance",
        text: `${formatPracticeValidationStatus(session.stats.answered)} para esta lista contar como prática.`,
      });

  let noteText = session.sessionNotes?.plainText || "";
  if (!noteText) {
    if (view.errorCandidateCount > 0) {
      noteText = view.errorCandidateCount === 1
        ? "1 erro disponível para análise."
        : `${view.errorCandidateCount} erros disponíveis para análise.`;
    } else if (view.existingErrorCount > 0) {
      noteText = view.existingErrorCount === 1
        ? "1 erro desta lista já possui Registro de Erro."
        : `${view.existingErrorCount} erros desta lista já possuem Registros de Erro.`;
    } else {
      noteText = "Nenhum erro identificado nesta lista.";
    }
  }

  const note = createElement(document, "p", {
    className: "exercise-session-note",
    text: noteText,
  });

  const actions = createElement(document, "div", {
    className: "record-actions",
  });
  const primaryActions = createElement(document, "div", {
    className: "record-primary-actions",
  });
  const openButton = createElement(document, "button", {
    className: "button button-primary button-small",
    text: view.errorCandidateCount > 0
      ? `Analisar ${view.errorCandidateCount} ${view.errorCandidateCount === 1 ? "erro" : "erros"}`
      : "Abrir lista",
    attributes: { type: "button" },
  });
  openButton.addEventListener("click", () => onOpen(view));
  primaryActions.append(openButton);
  actions.append(
    primaryActions,
    createSessionMoreActions({ document, record, onArchive }),
  );

  card.append(header, performance, stats);
  if (practiceHint) card.append(practiceHint);
  card.append(note, actions);
  return card;
}

function setupFilters({ root, searchInput, filterSelect, empty }) {
  function apply() {
    const search = searchInput.value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
    const filter = filterSelect.value;
    let visible = 0;

    root.querySelectorAll(".exercise-session-card").forEach((card) => {
      const matchesSearch =
        !search || card.dataset.sessionSearch.includes(search);
      const matchesFilter =
        filter === "all" ||
        (filter === "valid" && card.dataset.practiceValid === "true") ||
        (filter === "pending" && card.dataset.practiceValid === "false") ||
        (filter === "errors" && card.dataset.hasErrors === "true");
      card.hidden = !(matchesSearch && matchesFilter);
      visible += Number(!card.hidden);
    });

    empty.hidden = visible > 0;
  }

  searchInput.addEventListener("input", apply);
  filterSelect.addEventListener("change", apply);
}

export function renderExercisesSection({
  document,
  container,
  views,
  aggregate,
  pendingImports = [],
  onCreateList,
  onImport,
  onOpenPending,
  onOpen,
  onArchive,
  highlightSessionId = null,
}) {
  clearElement(container);
  const inner = createElement(document, "div", { className: "content-inner" });
  const header = createElement(document, "header", {
    className: "section-header",
  });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Prática",
    }),
    createElement(document, "h2", { text: "Exercícios" }),
    createElement(document, "p", {
      className: "section-description",
      text:
        "Acompanhe as listas concluídas no Test Quest, seu desempenho e os erros que ainda precisam de análise.",
    }),
  );
  const headerActions = createElement(document, "div", {
    className: "section-header-actions",
  });
  const createListButton = createElement(document, "button", {
    className: "button button-primary",
    text: "Criar lista no Test Quest",
    attributes: { type: "button" },
  });
  createListButton.addEventListener("click", onCreateList);
  const importButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Importar resultado",
    attributes: { type: "button" },
  });
  importButton.addEventListener("click", onImport);
  if (views.length) {
    headerActions.append(createListButton);
  }
  headerActions.append(importButton);
  header.append(copy, headerActions);
  inner.append(header);

  if (pendingImports.length) {
    const warning = createElement(document, "section", {
      className: "import-warning-panel panel",
    });
    const warningCopy = createElement(document, "div", {
      className: "import-warning-copy",
    });
    warningCopy.append(
      createElement(document, "strong", {
        text: `${pendingImports.length} importação(ões) pendente(s)`,
      }),
      createElement(document, "p", {
        text:
          "O resultado foi preservado sem alterar suas listas atuais. Abra as pendências para conferir o motivo.",
      }),
    );
    const reviewButton = createElement(document, "button", {
      className: "button button-secondary button-small",
      text: "Ver pendências",
      attributes: { type: "button" },
    });
    reviewButton.addEventListener("click", onOpenPending);
    warning.append(warningCopy, reviewButton);
    inner.append(warning);
  }

  if (!views.length) {
    const empty = createElement(document, "section", {
      className: "panel empty-state exercise-empty-state",
    });
    empty.append(
      createElement(document, "div", {
        className: "placeholder-icon",
        text: "✓",
      }),
      createElement(document, "h3", {
        text: "Nenhuma lista importada ainda",
      }),
      createElement(document, "p", {
        text:
          "Conclua uma lista no Test Quest e salve o resultado no Study Stack para acompanhar sua prática.",
      }),
    );
    const action = createElement(document, "button", {
      className: "button button-primary",
      text: "Criar lista no Test Quest",
      attributes: { type: "button" },
    });
    action.addEventListener("click", onCreateList);
    empty.append(action);
    inner.append(empty);
    container.append(inner);
    return;
  }

  const metrics = createElement(document, "section", {
    className: "exercise-metrics-grid",
  });
  metrics.append(
    createMetric(
      document,
      "Listas",
      aggregate.sessions,
      `${aggregate.validSessions} ${aggregate.validSessions === 1 ? "válida" : "válidas"} para prática`,
    ),
    createMetric(document, "Questões", aggregate.questions),
    createMetric(
      document,
      "Aproveitamento",
      `${aggregate.percentage}%`,
      `${aggregate.correct} ${aggregate.correct === 1 ? "acerto" : "acertos"}`,
    ),
  );
  if (aggregate.incorrect > 0) {
    metrics.append(
      createMetric(
        document,
        "Erros",
        aggregate.incorrect,
        "Disponíveis para análise",
      ),
    );
  }
  if (aggregate.partial > 0) {
    metrics.append(
      createMetric(
        document,
        "Parciais",
        aggregate.partial,
        "Valem 50% no aproveitamento",
      ),
    );
  }
  inner.append(metrics, createPracticeCriteria(document));

  const toolbar = createElement(document, "section", {
    className: "records-toolbar panel exercise-toolbar",
  });
  const searchInput = createElement(document, "input", {
    attributes: {
      type: "search",
      placeholder: "Buscar em títulos, questões e respostas...",
      "aria-label": "Buscar em listas importadas",
    },
  });
  const filterSelect = createElement(document, "select", {
    attributes: { "aria-label": "Filtrar listas importadas" },
  });
  [
    ["all", "Todas as listas"],
    ["valid", "Válidas para prática"],
    ["pending", "Ainda não válidas"],
    ["errors", "Com erros"],
  ].forEach(([value, label]) =>
    filterSelect.append(
      createElement(document, "option", {
        text: label,
        attributes: { value },
      }),
    ),
  );
  toolbar.append(searchInput, filterSelect);
  inner.append(toolbar);

  const grid = createElement(document, "section", {
    className: "exercise-session-grid",
  });
  views.forEach((view) =>
    grid.append(createSessionCard({
      document,
      view,
      onOpen,
      onArchive,
      highlightSessionId,
    })),
  );
  const filterEmpty = createElement(document, "p", {
    className: "filter-empty panel",
    text: "Nenhuma lista corresponde aos filtros atuais.",
  });
  filterEmpty.hidden = true;
  inner.append(grid, filterEmpty);
  setupFilters({
    root: grid,
    searchInput,
    filterSelect,
    empty: filterEmpty,
  });

  container.append(inner);
}
