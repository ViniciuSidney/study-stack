import { clearElement, createElement } from "../../utils/dom.js";

const TYPE_CONFIG = Object.freeze({
  summary: {
    eyebrow: "Conteúdo teórico",
    title: "Resumos",
    singular: "Resumo",
    icon: "▤",
    description: "Crie e organize a base teórica deste assunto.",
    empty:
      "Nenhum Resumo foi criado para este assunto. Crie o primeiro para começar a construir a base teórica.",
  },
  note: {
    eyebrow: "Registro livre",
    title: "Anotações",
    singular: "Anotação",
    icon: "✎",
    description: "Registre ideias, dúvidas, relações e lembretes deste assunto.",
    empty:
      "Nenhuma Anotação foi criada para este assunto. Crie uma ou capture rapidamente Apenas um detalhe.",
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
    return { status: "in_progress", label: "Iniciar anotação" };
  }

  if (record.status === "in_progress") {
    return { status: "completed", label: "Concluir anotação" };
  }

  return { status: "in_progress", label: "Reabrir anotação" };
}

function createBadge(document, text, className = "") {
  return createElement(document, "span", {
    className: `record-badge${className ? ` ${className}` : ""}`,
    text,
  });
}

function createMoreActions({
  document,
  record,
  type,
  detail,
  onChangeStatus,
  onToggleImportant,
  onToggleStudied,
  onArchive,
}) {
  const menu = createElement(document, "details", {
    className: "record-more-actions",
  });
  const trigger = createElement(document, "summary", {
    text: "⋯",
    attributes: { "aria-label": "Mais ações" },
  });
  const panel = createElement(document, "div", {
    className: "record-more-actions-menu",
  });

  if (type === "summary" && detail?.summary?.isStudied) {
    const unstudyButton = createElement(document, "button", {
      text: "Desmarcar estudo",
      attributes: { type: "button" },
    });
    unstudyButton.addEventListener("click", () => onToggleStudied(record));
    panel.append(unstudyButton);
  }

  if (type === "note" && record.status === "completed") {
    const reopenButton = createElement(document, "button", {
      text: "Reabrir anotação",
      attributes: { type: "button" },
    });
    reopenButton.addEventListener("click", () => onChangeStatus(record, "in_progress"));
    panel.append(reopenButton);
  }

  const importantButton = createElement(document, "button", {
    text: record.isImportant ? "Desmarcar importante" : "Marcar importante",
    attributes: { type: "button" },
  });
  importantButton.addEventListener("click", () => onToggleImportant(record));

  const archiveButton = createElement(document, "button", {
    className: "record-more-danger",
    text: "Arquivar",
    attributes: { type: "button" },
  });
  archiveButton.addEventListener("click", () => onArchive(record));

  panel.append(importantButton, archiveButton);
  menu.append(trigger, panel);
  return menu;
}

function createRecordCard({
  document,
  type,
  record,
  detail = null,
  onOpen,
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
  const header = createElement(document, "header", { className: "record-card-header" });
  const titleGroup = createElement(document, "div", { className: "record-title-group" });
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
  const badges = createElement(document, "div", { className: "record-badges" });
  if (record.isImportant) badges.append(createBadge(document, "★ Importante", "important-badge"));
  if (type === "summary" && detail?.summary?.isStudied) {
    badges.append(createBadge(document, "✓ Estudado", "studied-badge"));
  }
  if (type === "note" && detail?.note?.createdFromQuickDetail) {
    badges.append(createBadge(document, "Detalhe rápido", "quick-detail-badge"));
  }
  badges.append(createBadge(document, STATUS_LABELS[record.status], `status-${record.status}`));
  header.append(titleGroup, badges);
  card.append(header);

  const preview = type === "summary"
    ? detail?.summary?.mainContent?.plainText?.trim()
    : detail?.note?.content?.plainText?.trim();
  card.append(createElement(document, "p", {
    className: `record-preview${preview ? "" : " record-preview-empty"}`,
    text: preview || (type === "summary"
      ? "Adicione o conteúdo principal para desenvolver este Resumo."
      : "Adicione conteúdo para desenvolver esta Anotação."),
  }));

  if (!detail?.completionReady && preview) {
    card.append(createElement(document, "p", {
      className: "record-guidance",
      text: type === "summary"
        ? "Complete o título e o conteúdo principal para concluir."
        : "Complete o título e o conteúdo para concluir.",
    }));
  }

  if (type === "note") {
    const checklist = detail?.checklist ?? { total: 0, completed: 0 };
    const linkedCount = detail?.note?.linkedRecordIds?.length ?? 0;

    if (checklist.total > 0 || linkedCount > 0) {
      const facts = createElement(document, "div", { className: "note-card-facts" });

      if (checklist.total > 0) {
        facts.append(createElement(document, "span", {
          text: `☑ ${checklist.completed}/${checklist.total} itens`,
        }));
      }

      if (linkedCount > 0) {
        facts.append(createElement(document, "span", {
          text: `🔗 ${linkedCount} ${linkedCount === 1 ? "vínculo" : "vínculos"}`,
        }));
      }

      card.append(facts);
    }
  }

  if (record.tags.length) card.append(createTagList(document, record.tags));

  const actions = createElement(document, "div", { className: "record-actions" });
  const primaryActions = createElement(document, "div", {
    className: "record-primary-actions",
  });
  const openButton = createElement(document, "button", {
    className: "button button-primary button-small",
    text: type === "summary" ? "Abrir Resumo" : "Abrir Anotação",
    attributes: { type: "button" },
  });
  openButton.addEventListener("click", () => onOpen(record));
  primaryActions.append(openButton);

  if (type === "summary") {
    if (detail?.completionReady && !detail?.summary?.isStudied) {
      const studiedButton = createElement(document, "button", {
        className: "button button-secondary button-small",
        text: "Marcar estudado",
        attributes: { type: "button" },
      });
      studiedButton.addEventListener("click", () => onToggleStudied(record));
      primaryActions.append(studiedButton);
    }
  } else if (record.status !== "completed") {
    const statusAction = nextStatusAction(record);
    const completionUnavailable =
      statusAction.status === "completed" && !detail?.completionReady;
    const statusButton = createElement(document, "button", {
      className: "button button-secondary button-small",
      text: statusAction.label,
      attributes: {
        type: "button",
        ...(completionUnavailable
          ? {
              disabled: "",
              "aria-disabled": "true",
              title: "Adicione título e conteúdo para concluir a anotação.",
            }
          : {}),
      },
    });
    if (!completionUnavailable) {
      statusButton.addEventListener("click", () =>
        onChangeStatus(record, statusAction.status),
      );
    }
    primaryActions.append(statusButton);
  }

  actions.append(
    primaryActions,
    createMoreActions({
      document,
      record,
      type,
      detail,
      onChangeStatus,
      onToggleImportant,
      onToggleStudied,
      onArchive,
    }),
  );
  card.append(actions);
  return card;
}

function groupByDate(records) {
  const groups = new Map();
  for (const record of records) {
    if (!groups.has(record.studyDate)) groups.set(record.studyDate, []);
    groups.get(record.studyDate).push(record);
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
}

function setupFilters({ searchInput, statusSelect, scope }) {
  function apply() {
    const search = searchInput.value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "")
      .toLocaleLowerCase("pt-BR").trim();
    const status = statusSelect.value;
    scope.querySelectorAll(".record-card").forEach((card) => {
      const matchesSearch = !search || card.dataset.recordSearch.includes(search);
      const matchesStatus = status === "all" || card.dataset.recordStatus === status;
      card.hidden = !(matchesSearch && matchesStatus);
    });
    scope.querySelectorAll(".date-group, .important-block").forEach((group) => {
      group.hidden = ![...group.querySelectorAll(".record-card")].some((card) => !card.hidden);
    });
    scope.querySelector(".filter-empty").hidden = [...scope.querySelectorAll(".record-card")]
      .some((card) => !card.hidden);
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
  onQuickDetail = () => {},
  onOpen = () => {},
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
    createElement(document, "p", { className: "section-description", text: config.description }),
  );
  const headerActions = createElement(document, "div", { className: "section-header-actions" });
  if (type === "note") {
    const quickButton = createElement(document, "button", {
      className: "button button-secondary",
      text: "Apenas um detalhe",
      attributes: { type: "button" },
    });
    quickButton.addEventListener("click", onQuickDetail);
    headerActions.append(quickButton);
  }
  const createButton = createElement(document, "button", {
    className: "button button-primary",
    text: `+ Novo ${config.singular.toLocaleLowerCase("pt-BR")}`,
    attributes: { type: "button" },
  });
  createButton.addEventListener("click", onCreate);
  headerActions.append(createButton);
  header.append(copy, headerActions);
  inner.append(header);

  if (!records.length) {
    const empty = createElement(document, "section", { className: "panel empty-state" });
    empty.append(
      createElement(document, "div", { className: "placeholder-icon", text: config.icon }),
      createElement(document, "h3", { text: `Nenhum ${config.singular.toLocaleLowerCase("pt-BR")} ainda` }),
      createElement(document, "p", { text: config.empty }),
    );
    const actions = createElement(document, "div", { className: "action-row" });
    if (type === "note") {
      const quickButton = createElement(document, "button", {
        className: "button button-secondary", text: "Apenas um detalhe", attributes: { type: "button" },
      });
      quickButton.addEventListener("click", onQuickDetail);
      actions.append(quickButton);
    }
    const button = createElement(document, "button", {
      className: "button button-primary", text: `Criar ${config.singular.toLocaleLowerCase("pt-BR")}`,
      attributes: { type: "button" },
    });
    button.addEventListener("click", onCreate);
    actions.append(button);
    empty.append(actions);
    inner.append(empty);
    container.append(inner);
    return;
  }

  const toolbar = createElement(document, "section", { className: "records-toolbar panel" });
  const searchInput = createElement(document, "input", {
    attributes: { type: "search", placeholder: `Buscar em ${config.title.toLocaleLowerCase("pt-BR")}...`,
      "aria-label": `Buscar em ${config.title}` },
  });
  const statusSelect = createElement(document, "select", { attributes: { "aria-label": "Filtrar por status" } });
  [["all", "Todos os status"], ["draft", "Rascunhos"], ["in_progress", "Em andamento"], ["completed", "Concluídos"]]
    .forEach(([value, label]) => statusSelect.append(createElement(document, "option", { text: label, attributes: { value } })));
  toolbar.append(searchInput, statusSelect);
  inner.append(toolbar);

  const scope = createElement(document, "div", { className: "records-scope" });
  const cardOptions = (record) => ({ document, type, record, detail: detailsById.get(record.id) ?? null,
    onOpen, onChangeStatus, onToggleImportant, onToggleStudied, onArchive });
  const important = records.filter((record) => record.isImportant);
  if (important.length) {
    const block = createElement(document, "section", { className: "important-block" });
    const heading = createElement(document, "div", { className: "subsection-heading" });
    const headingCopy = createElement(document, "div");
    headingCopy.append(createElement(document, "p", { className: "eyebrow", text: "Atalho" }),
      createElement(document, "h3", { text: "Importantes" }));
    heading.append(headingCopy);
    const grid = createElement(document, "div", { className: "record-grid" });
    important.forEach((record) => grid.append(createRecordCard(cardOptions(record))));
    block.append(heading, grid);
    scope.append(block);
  }

  groupByDate(records).forEach(([date, dateRecords], index) => {
    const group = createElement(document, "details", { className: "date-group panel" });
    group.open = index === 0;
    const summary = createElement(document, "summary", { className: "date-group-summary" });
    summary.append(createElement(document, "strong", { text: formatDate(date) }),
      createElement(document, "span", { text: `${dateRecords.length} registro${dateRecords.length === 1 ? "" : "s"}` }));
    const grid = createElement(document, "div", { className: "record-grid date-record-grid" });
    dateRecords.forEach((record) => grid.append(createRecordCard(cardOptions(record))));
    group.append(summary, grid);
    scope.append(group);
  });
  const filterEmpty = createElement(document, "div", { className: "panel filter-empty",
    text: "Nenhum registro corresponde aos filtros atuais." });
  filterEmpty.hidden = true;
  scope.append(filterEmpty);
  inner.append(scope);
  container.append(inner);
  setupFilters({ searchInput, statusSelect, scope });
}
