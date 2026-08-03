import { clearElement, createElement } from "../../utils/dom.js";

const TYPE_CONFIG = Object.freeze({
  summary: {
    eyebrow: "Conteúdo teórico",
    title: "Resumos",
    singular: "Resumo",
    icon: "▤",
    description:
      "Construa a base teórica com conteúdo formatado, campos opcionais, fontes e referências. A marca Estudado permanece separada da conclusão.",
    empty:
      "Nenhum Resumo foi criado para este assunto. Crie o primeiro e desenvolva a teoria conforme o estudo avançar.",
  },
  note: {
    eyebrow: "Registro livre",
    title: "Anotações",
    singular: "Anotação",
    icon: "✎",
    description:
      "Os registros de Anotação já são persistentes. O editor específico será implementado na Fundação 05.",
    empty:
      "Nenhuma Anotação foi criada para este assunto. Registre uma ideia, observação ou detalhe de estudo.",
  },
});

const STATUS_LABELS = Object.freeze({
  draft: "Rascunho",
  in_progress: "Em andamento",
  completed: "Concluído",
});

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function createTagList(document, tags) {
  const list = createElement(document, "div", { className: "tag-list" });

  for (const tag of tags) {
    list.append(createElement(document, "span", { className: "tag", text: tag }));
  }

  return list;
}

function nextStatusAction(record) {
  if (record.status === "draft") {
    return { status: "in_progress", label: "Iniciar" };
  }

  if (record.status === "completed") {
    return { status: "in_progress", label: "Reabrir" };
  }

  return { status: "draft", label: "Voltar a rascunho" };
}

function createBadge(document, text, className = "") {
  return createElement(document, "span", {
    className: `record-badge${className ? ` ${className}` : ""}`,
    text,
  });
}

function createRecordCard({
  document,
  type,
  record,
  detail = null,
  onOpen,
  onEdit,
  onChangeStatus,
  onToggleImportant,
  onToggleStudied,
  onArchive,
}) {
  const card = createElement(document, "article", {
    className: `record-card panel${record.isImportant ? " important" : ""}`,
    attributes: {
      "data-record-search": record.searchPlainText,
      "data-record-status": record.status,
    },
  });

  const header = createElement(document, "header", {
    className: "record-card-header",
  });
  const titleGroup = createElement(document, "div", {
    className: "record-title-group",
  });
  titleGroup.append(
    createElement(document, "div", {
      className: "record-title-line",
      text: record.title || "Registro sem título",
    }),
    createElement(document, "p", {
      className: "record-meta",
      text: `Atualizado em ${new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(record.updatedAt))}`,
    }),
  );

  const badges = createElement(document, "div", {
    className: "record-badges",
  });
  if (record.isImportant) {
    badges.append(createBadge(document, "★ Importante", "important-badge"));
  }
  if (type === "summary" && detail?.summary?.isStudied) {
    badges.append(createBadge(document, "✓ Estudado", "studied-badge"));
  }
  badges.append(
    createBadge(document, STATUS_LABELS[record.status], `status-${record.status}`),
  );
  header.append(titleGroup, badges);
  card.append(header);

  const preview =
    type === "summary"
      ? detail?.summary?.mainContent?.plainText?.trim()
      : record.personalNotes?.plainText?.trim();
  card.append(
    createElement(document, "p", {
      className: `record-preview${preview ? "" : " record-preview-empty"}`,
      text:
        preview ||
        (type === "summary"
          ? "Conteúdo principal ainda não iniciado."
          : "Nenhuma observação registrada."),
    }),
  );

  if (type === "summary") {
    card.append(
      createElement(document, "p", {
        className: `summary-readiness ${detail?.completionReady ? "ready" : "pending"}`,
        text: detail?.completionReady
          ? "Título e conteúdo válidos para conclusão."
          : "Preencha título e conteúdo principal para concluir.",
      }),
    );
  }

  if (record.tags.length) {
    card.append(createTagList(document, record.tags));
  }

  const actions = createElement(document, "div", {
    className: "record-actions",
  });

  if (type === "summary") {
    const openButton = createElement(document, "button", {
      className: "button button-primary button-small",
      text: "Abrir Resumo",
      attributes: { type: "button" },
    });
    const studiedButton = createElement(document, "button", {
      className: "button button-secondary button-small",
      text: detail?.summary?.isStudied ? "Desmarcar estudo" : "Marcar estudado",
      attributes: { type: "button" },
    });
    openButton.addEventListener("click", () => onOpen(record));
    studiedButton.addEventListener("click", () => onToggleStudied(record));
    actions.append(openButton, studiedButton);
  } else {
    const editButton = createElement(document, "button", {
      className: "button button-secondary button-small",
      text: "Editar",
      attributes: { type: "button" },
    });
    const statusAction = nextStatusAction(record);
    const statusButton = createElement(document, "button", {
      className: "button button-secondary button-small",
      text: statusAction.label,
      attributes: { type: "button" },
    });
    editButton.addEventListener("click", () => onEdit(record));
    statusButton.addEventListener("click", () =>
      onChangeStatus(record, statusAction.status),
    );
    actions.append(editButton, statusButton);
  }

  const importantButton = createElement(document, "button", {
    className: "button button-secondary button-small",
    text: record.isImportant ? "Desmarcar importante" : "Marcar importante",
    attributes: { type: "button" },
  });
  const archiveButton = createElement(document, "button", {
    className: "button button-quiet-danger button-small",
    text: "Arquivar",
    attributes: { type: "button" },
  });

  importantButton.addEventListener("click", () => onToggleImportant(record));
  archiveButton.addEventListener("click", () => onArchive(record));
  actions.append(importantButton, archiveButton);
  card.append(actions);
  return card;
}

function groupByDate(records) {
  const groups = new Map();

  for (const record of records) {
    if (!groups.has(record.studyDate)) {
      groups.set(record.studyDate, []);
    }
    groups.get(record.studyDate).push(record);
  }

  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
}

function setupFilters({ searchInput, statusSelect, scope }) {
  function apply() {
    const search = searchInput.value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
    const status = statusSelect.value;

    scope.querySelectorAll(".record-card").forEach((card) => {
      const matchesSearch = !search || card.dataset.recordSearch.includes(search);
      const matchesStatus =
        status === "all" || card.dataset.recordStatus === status;
      card.hidden = !(matchesSearch && matchesStatus);
    });

    scope.querySelectorAll(".date-group, .important-block").forEach((group) => {
      const visibleCards = [...group.querySelectorAll(".record-card")].some(
        (card) => !card.hidden,
      );
      group.hidden = !visibleCards;
    });

    const hasVisible = [...scope.querySelectorAll(".record-card")].some(
      (card) => !card.hidden,
    );
    scope.querySelector(".filter-empty").hidden = hasVisible;
  }

  searchInput.addEventListener("input", apply);
  statusSelect.addEventListener("change", apply);
}

export function renderRecordsSection({
  document,
  container,
  type,
  records,
  detailsById = new Map(),
  onCreate,
  onOpen = () => {},
  onEdit,
  onChangeStatus,
  onToggleImportant,
  onToggleStudied = () => {},
  onArchive,
}) {
  clearElement(container);
  const config = TYPE_CONFIG[type];
  const inner = createElement(document, "div", { className: "content-inner" });
  const header = createElement(document, "header", { className: "section-header" });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", { className: "eyebrow", text: config.eyebrow }),
    createElement(document, "h2", { text: config.title }),
    createElement(document, "p", {
      className: "section-description",
      text: config.description,
    }),
  );
  const createButton = createElement(document, "button", {
    className: "button button-primary",
    text: `+ Novo ${config.singular.toLocaleLowerCase("pt-BR")}`,
    attributes: { type: "button" },
  });
  createButton.addEventListener("click", onCreate);
  header.append(copy, createButton);
  inner.append(header);

  if (!records.length) {
    const empty = createElement(document, "section", {
      className: "panel empty-state",
    });
    empty.append(
      createElement(document, "div", {
        className: "placeholder-icon",
        text: config.icon,
      }),
      createElement(document, "h3", {
        text: `Nenhum ${config.singular.toLocaleLowerCase("pt-BR")} ainda`,
      }),
      createElement(document, "p", { text: config.empty }),
    );
    const actions = createElement(document, "div", { className: "action-row" });
    const button = createElement(document, "button", {
      className: "button button-primary",
      text: `Criar ${config.singular.toLocaleLowerCase("pt-BR")}`,
      attributes: { type: "button" },
    });
    button.addEventListener("click", onCreate);
    actions.append(button);
    empty.append(actions);
    inner.append(empty);
    container.append(inner);
    return;
  }

  const toolbar = createElement(document, "section", {
    className: "records-toolbar panel",
  });
  const searchInput = createElement(document, "input", {
    attributes: {
      type: "search",
      placeholder: `Buscar em ${config.title.toLocaleLowerCase("pt-BR")}...`,
      "aria-label": `Buscar em ${config.title}`,
    },
  });
  const statusSelect = createElement(document, "select", {
    attributes: { "aria-label": "Filtrar por status" },
  });
  [
    ["all", "Todos os status"],
    ["draft", "Rascunhos"],
    ["in_progress", "Em andamento"],
    ["completed", "Concluídos"],
  ].forEach(([value, label]) => {
    statusSelect.append(
      createElement(document, "option", {
        text: label,
        attributes: { value },
      }),
    );
  });
  toolbar.append(searchInput, statusSelect);
  inner.append(toolbar);

  const scope = createElement(document, "div", { className: "records-scope" });
  const important = records.filter((record) => record.isImportant);
  const cardOptions = (record) => ({
    document,
    type,
    record,
    detail: detailsById.get(record.id) ?? null,
    onOpen,
    onEdit,
    onChangeStatus,
    onToggleImportant,
    onToggleStudied,
    onArchive,
  });

  if (important.length) {
    const importantBlock = createElement(document, "section", {
      className: "important-block",
    });
    const importantHeading = createElement(document, "div", {
      className: "subsection-heading",
    });
    const importantCopy = createElement(document, "div");
    importantCopy.append(
      createElement(document, "p", { className: "eyebrow", text: "Atalho" }),
      createElement(document, "h3", { text: "Importantes" }),
    );
    importantHeading.append(importantCopy);
    importantBlock.append(importantHeading);
    const grid = createElement(document, "div", { className: "record-grid" });
    important.forEach((record) => grid.append(createRecordCard(cardOptions(record))));
    importantBlock.append(grid);
    scope.append(importantBlock);
  }

  groupByDate(records).forEach(([date, dateRecords], index) => {
    const group = createElement(document, "details", {
      className: "date-group panel",
    });
    group.open = index === 0;
    const summary = createElement(document, "summary", {
      className: "date-group-summary",
    });
    summary.append(
      createElement(document, "strong", { text: formatDate(date) }),
      createElement(document, "span", {
        text: `${dateRecords.length} registro${dateRecords.length === 1 ? "" : "s"}`,
      }),
    );
    const grid = createElement(document, "div", {
      className: "record-grid date-record-grid",
    });
    dateRecords.forEach((record) => grid.append(createRecordCard(cardOptions(record))));
    group.append(summary, grid);
    scope.append(group);
  });

  scope.append(
    createElement(document, "div", {
      className: "panel filter-empty",
      text: "Nenhum registro corresponde aos filtros atuais.",
    }),
  );
  scope.querySelector(".filter-empty").hidden = true;
  inner.append(scope);
  container.append(inner);
  setupFilters({ searchInput, statusSelect, scope });
}
