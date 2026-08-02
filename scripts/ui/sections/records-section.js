import { clearElement, createElement } from "../../utils/dom.js";

const TYPE_CONFIG = Object.freeze({
  summary: {
    sectionId: "summaries",
    eyebrow: "Conteúdo teórico",
    title: "Resumos",
    singular: "Resumo",
    icon: "▤",
    empty:
      "Nenhum Resumo foi criado para este assunto. Comece pelo registro-base e desenvolva o conteúdo na próxima etapa.",
  },
  note: {
    sectionId: "notes",
    eyebrow: "Registro livre",
    title: "Anotações",
    singular: "Anotação",
    icon: "✎",
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

function createRecordCard({
  document,
  record,
  onEdit,
  onChangeStatus,
  onToggleImportant,
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
    badges.append(
      createElement(document, "span", {
        className: "record-badge important-badge",
        text: "★ Importante",
      }),
    );
  }
  badges.append(
    createElement(document, "span", {
      className: `record-badge status-${record.status}`,
      text: STATUS_LABELS[record.status],
    }),
  );
  header.append(titleGroup, badges);

  const notes = record.personalNotes?.plainText?.trim();
  if (notes) {
    card.append(
      header,
      createElement(document, "p", {
        className: "record-preview",
        text: notes,
      }),
    );
  } else {
    card.append(header);
  }

  if (record.tags.length) {
    card.append(createTagList(document, record.tags));
  }

  const actions = createElement(document, "div", {
    className: "record-actions",
  });
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

  editButton.addEventListener("click", () => onEdit(record));
  statusButton.addEventListener("click", () =>
    onChangeStatus(record, statusAction.status),
  );
  importantButton.addEventListener("click", () => onToggleImportant(record));
  archiveButton.addEventListener("click", () => onArchive(record));

  actions.append(editButton, statusButton, importantButton, archiveButton);
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
      const matchesSearch =
        !search || card.dataset.recordSearch.includes(search);
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
  onCreate,
  onEdit,
  onChangeStatus,
  onToggleImportant,
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
      text:
        "Os registros-base já são persistentes. O editor de conteúdo específico será conectado na próxima fundação.",
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
      createElement(document, "h3", { text: `Nenhum ${config.singular.toLocaleLowerCase("pt-BR")} ainda` }),
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
    important.forEach((record) => {
      grid.append(
        createRecordCard({
          document,
          record,
          onEdit,
          onChangeStatus,
          onToggleImportant,
          onArchive,
        }),
      );
    });
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
    dateRecords.forEach((record) => {
      grid.append(
        createRecordCard({
          document,
          record,
          onEdit,
          onChangeStatus,
          onToggleImportant,
          onArchive,
        }),
      );
    });
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
