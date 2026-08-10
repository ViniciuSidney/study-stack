import { clearElement, createElement } from "../../utils/dom.js";

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

function createSessionCard({ document, view, onOpen, onArchive }) {
  const { record, session } = view;
  const card = createElement(document, "article", {
    className: "exercise-session-card panel",
    attributes: {
      "data-session-search": record.searchPlainText,
      "data-practice-valid": String(session.stats.validForPractice),
      "data-has-errors": String(session.stats.incorrect > 0),
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
      text: "Lista importada · Test Quest",
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
      className: "record-badge status-completed",
      text: "Importada",
    }),
    createElement(document, "span", {
      className: session.stats.validForPractice
        ? "record-badge practice-valid-badge"
        : "record-badge practice-pending-badge",
      text: session.stats.validForPractice
        ? "+1 ponto de prática"
        : `${Math.max(0, 15 - session.stats.answered)} respostas até validar`,
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
  stats.append(
    createStat(document, "Acertos", session.stats.correct, "correct"),
    createStat(document, "Parciais", session.stats.partial ?? 0, "partial"),
    createStat(document, "Erros", session.stats.incorrect, "incorrect"),
    createStat(document, "Em branco", session.stats.unanswered, "unanswered"),
    createStat(document, "Respondidas", session.stats.answered),
  );

  const note = createElement(document, "p", {
    className: "exercise-session-note",
    text: session.sessionNotes?.plainText
      ? session.sessionNotes.plainText
      : view.errorCandidateCount > 0
        ? `${view.errorCandidateCount} questão(ões) incorreta(s) disponível(is) para criar Registros de Erro.`
        : view.existingErrorCount > 0
          ? `${view.existingErrorCount} questão(ões) incorreta(s) já possui(em) Registro de Erro.`
          : "Nenhum erro registrado nesta sessão.",
  });

  const actions = createElement(document, "div", {
    className: "record-actions",
  });
  const openButton = createElement(document, "button", {
    className: "button button-primary button-small",
    text: "Abrir lista",
    attributes: { type: "button" },
  });
  openButton.addEventListener("click", () => onOpen(view));
  const archiveButton = createElement(document, "button", {
    className: "button button-quiet-danger button-small",
    text: "Arquivar",
    attributes: { type: "button" },
  });
  archiveButton.addEventListener("click", () => onArchive(record));
  actions.append(openButton, archiveButton);

  card.append(header, performance, stats, note, actions);
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
  onImport,
  onOpenPending,
  onOpen,
  onArchive,
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
      text: "Prática importada",
    }),
    createElement(document, "h2", { text: "Exercícios" }),
    createElement(document, "p", {
      className: "section-description",
      text:
        "Consulte listas concluídas no Test Quest, respostas, correções e desempenho. O snapshot original permanece separado das suas observações.",
    }),
  );
  const importButton = createElement(document, "button", {
    className: "button button-primary",
    text: "Importar resultado",
    attributes: { type: "button" },
  });
  importButton.addEventListener("click", onImport);
  header.append(copy, importButton);
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
        text: `${pendingImports.length} importação(ões) preservada(s) como pendência`,
      }),
      createElement(document, "p", {
        text:
          "O Study Stack manteve os dados atuais e guardou o novo resultado sem aplicá-lo. Abra as pendências para conferir o motivo e decidir se deseja descartá-lo.",
      }),
    );
    const reviewButton = createElement(document, "button", {
      className: "button button-secondary button-small",
      text: "Ver importações pendentes",
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
          "Conclua uma sessão no Test Quest e envie o resultado para este assunto. Para testar a fundação localmente, o importador oferece um payload demonstrativo.",
      }),
    );
    const action = createElement(document, "button", {
      className: "button button-primary",
      text: "Importar primeira lista",
      attributes: { type: "button" },
    });
    action.addEventListener("click", onImport);
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
      `${aggregate.validSessions} válida(s) para prática`,
    ),
    createMetric(document, "Questões", aggregate.questions),
    createMetric(
      document,
      "Aproveitamento",
      `${aggregate.percentage}%`,
      `${aggregate.correct} acerto(s)`,
    ),
    createMetric(
      document,
      "Respostas parciais",
      aggregate.partial,
      "Valem 50% no aproveitamento",
    ),
    createMetric(
      document,
      "Erros identificados",
      aggregate.incorrect,
      "Preparados para análise",
    ),
  );
  inner.append(metrics);

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
    ["pending", "Abaixo de 15 respostas"],
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
    grid.append(createSessionCard({ document, view, onOpen, onArchive })),
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
