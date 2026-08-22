import { clearElement, createElement } from "../../utils/dom.js";

const EVENT_ICONS = Object.freeze({
  created: "+",
  edited: "✎",
  status_changed: "↻",
  marked_important: "★",
  unmarked_important: "☆",
  archived: "□",
  restored: "↩",
  imported: "⇩",
  reimported: "⇄",
  analysis_completed: "✓",
  review_completed: "◉",
  review_reopened: "↺",
  recurrence: "!",
  evidence_added: "+",
  error_overcome: "◆",
  progress_changed: "↗",
});

const CATEGORY_META = Object.freeze({
  all: { label: "Todos os tipos" },
  records: { label: "Registros" },
  exercises: { label: "Exercícios" },
  errors: { label: "Erros" },
  progress: { label: "Progresso" },
});

const PERIOD_OPTIONS = Object.freeze([
  { value: "all", label: "Todo o histórico" },
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
]);

const SAME_ENTITY_GROUPABLE_EVENT_TYPES = new Set(["edited", "progress_changed"]);
const SAME_ENTITY_GROUP_WINDOW_MS = 30 * 60 * 1000;
const BULK_ERROR_GROUP_WINDOW_MS = 2 * 60 * 1000;

function categoryForEvent(event) {
  if (event.entityType === "imported_session") return "exercises";
  if (event.entityType === "error_record") return "errors";
  if (event.entityType === "progress_snapshot") return "progress";
  return "records";
}

function formatEventSummary(event) {
  const category = categoryForEvent(event);
  const metadata = event.metadata ?? {};

  switch (event.eventType) {
    case "created":
      return category === "errors" ? "Erro registrado." : "Registro criado.";
    case "edited":
      if (category === "exercises") return "Observação da lista atualizada.";
      if (category === "errors") return "Análise do erro atualizada.";
      return "Registro atualizado.";
    case "status_changed": {
      const labels = {
        draft: "Rascunho",
        in_progress: "Em andamento",
        completed: "Concluído",
      };
      return metadata.nextStatus
        ? `Status alterado para ${labels[metadata.nextStatus] ?? metadata.nextStatus}.`
        : "Status do registro alterado.";
    }
    case "marked_important":
      return "Marcado como importante.";
    case "unmarked_important":
      return "Removido dos importantes.";
    case "archived":
      return "Registro arquivado.";
    case "restored":
      return "Registro restaurado.";
    case "imported": {
      const stats = metadata.stats;
      return stats
        ? `Lista importada: ${stats.total} questões, ${stats.percentage}% de aproveitamento.`
        : "Lista do Test Quest importada.";
    }
    case "reimported":
      return "Lista do Test Quest atualizada.";
    case "analysis_completed":
      return "Análise do erro concluída.";
    case "review_completed":
      return "Erro marcado como revisado.";
    case "review_reopened":
      return "Revisão do erro reaberta.";
    case "recurrence":
      return "Reincidência registrada.";
    case "evidence_added":
      return "Evidência correta registrada.";
    case "error_overcome":
      return "Erro superado.";
    case "progress_changed":
      return metadata.currentTotal !== undefined
        ? `Progresso atualizado: ${metadata.currentTotal} pontos (${metadata.percentage ?? 0}%).`
        : "Progresso atualizado.";
    default:
      return event.summary || "Evento registrado.";
  }
}

function isBulkErrorCreation(event) {
  return (
    event?.eventType === "created" &&
    event?.entityType === "error_record" &&
    Boolean(event?.metadata?.sessionId)
  );
}

function eventsAreWithin(previous, current, windowMs) {
  const previousTime = Date.parse(previous.occurredAt);
  const currentTime = Date.parse(current.occurredAt);
  if (Number.isNaN(previousTime) || Number.isNaN(currentTime)) return false;
  return Math.abs(previousTime - currentTime) <= windowMs;
}

function canGroupBulkErrors(previous, current) {
  if (!isBulkErrorCreation(previous) || !isBulkErrorCreation(current)) return false;
  if (previous.subjectId !== current.subjectId) return false;
  if (previous.origin !== current.origin) return false;
  if (previous.metadata.sessionId !== current.metadata.sessionId) return false;
  return eventsAreWithin(previous, current, BULK_ERROR_GROUP_WINDOW_MS);
}

function canGroupSameEntity(previous, current) {
  if (!SAME_ENTITY_GROUPABLE_EVENT_TYPES.has(current.eventType)) return false;
  if (previous.eventType !== current.eventType) return false;
  if (previous.entityType !== current.entityType) return false;
  if (previous.entityId !== current.entityId) return false;
  return eventsAreWithin(previous, current, SAME_ENTITY_GROUP_WINDOW_MS);
}

function canGroup(previous, current) {
  if (!previous || !current) return false;
  return canGroupBulkErrors(previous, current) || canGroupSameEntity(previous, current);
}

function groupEvents(events) {
  const groups = [];

  for (const event of events) {
    const lastGroup = groups.at(-1);
    const anchor = lastGroup?.events.at(-1);

    if (lastGroup && canGroup(anchor, event)) {
      lastGroup.events.push(event);
      continue;
    }

    groups.push({ events: [event] });
  }

  return groups;
}

function formatGroupSummary(group) {
  const event = group.events[0];
  if (group.events.length > 1 && isBulkErrorCreation(event)) {
    return `${group.events.length} erros registrados.`;
  }
  return formatEventSummary(event);
}

function isWithinPeriod(event, period, now = new Date()) {
  if (period === "all") return true;

  const occurredAt = new Date(event.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) return true;

  if (period === "today") {
    return occurredAt.toDateString() === now.toDateString();
  }

  const days = period === "7d" ? 7 : 30;
  const threshold = new Date(now);
  threshold.setHours(0, 0, 0, 0);
  threshold.setDate(threshold.getDate() - (days - 1));
  return occurredAt >= threshold;
}

function createSelectField(document, labelText, options) {
  const field = createElement(document, "label", { className: "field" });
  field.append(createElement(document, "span", { text: labelText }));
  const select = createElement(document, "select");
  options.forEach((option) => {
    select.append(
      createElement(document, "option", {
        text: option.label,
        attributes: { value: option.value },
      }),
    );
  });
  field.append(select);
  return { field, select };
}

function appendGroupDetails(document, content, group, formatter) {
  if (group.events.length <= 1) return;

  const latest = group.events[0];
  const oldest = group.events.at(-1);
  const bulkErrors = isBulkErrorCreation(latest);
  const intervalText =
    latest.occurredAt === oldest.occurredAt
      ? ""
      : ` entre ${formatter.format(new Date(oldest.occurredAt))} e ${formatter.format(new Date(latest.occurredAt))}`;

  content.append(
    createElement(document, "p", {
      className: "history-group-note",
      text: bulkErrors
        ? `${group.events.length} erros da mesma lista foram agrupados${intervalText}.`
        : `${group.events.length} atualizações semelhantes agrupadas${intervalText}.`,
    }),
  );

  const details = createElement(document, "details", {
    className: "history-group-details",
  });
  details.append(
    createElement(document, "summary", {
      text: `Ver ${group.events.length} eventos`,
    }),
  );
  const list = createElement(document, "ul", {
    className: "history-group-event-list",
  });
  group.events.forEach((event) => {
    const item = createElement(document, "li");
    item.append(
      createElement(document, "span", {
        text: event.summary || formatEventSummary(event),
      }),
      createElement(document, "time", {
        text: formatter.format(new Date(event.occurredAt)),
        attributes: { datetime: event.occurredAt },
      }),
    );
    list.append(item);
  });
  details.append(list);
  content.append(details);
}

export function renderHistorySection({ document, container, events }) {
  clearElement(container);
  const inner = createElement(document, "div", { className: "content-inner" });
  const header = createElement(document, "header", { className: "section-header" });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", { className: "eyebrow", text: "Linha do tempo" }),
    createElement(document, "h2", { text: "Histórico" }),
    createElement(document, "p", {
      className: "section-description",
      text: "Acompanhe as principais mudanças deste assunto sem repetir detalhes desnecessários.",
    }),
  );
  header.append(copy);
  inner.append(header);

  const toolbar = createElement(document, "div", {
    className: "panel history-toolbar",
  });
  const categoryField = createSelectField(
    document,
    "Tipo de evento",
    Object.entries(CATEGORY_META).map(([value, meta]) => ({
      value,
      label: meta.label,
    })),
  );
  const periodField = createSelectField(document, "Período", PERIOD_OPTIONS);
  toolbar.append(categoryField.field, periodField.field);

  const resultArea = createElement(document, "div");
  inner.append(toolbar, resultArea);

  function render() {
    clearElement(resultArea);
    const category = categoryField.select.value;
    const period = periodField.select.value;
    const filtered = events
      .filter((event) => category === "all" || categoryForEvent(event) === category)
      .filter((event) => isWithinPeriod(event, period));

    if (!filtered.length) {
      const empty = createElement(document, "div", {
        className: "panel history-empty",
      });
      empty.append(
        createElement(document, "strong", {
          text: events.length ? "Nenhum evento neste filtro" : "Nenhum evento registrado",
        }),
        createElement(document, "p", {
          text: events.length
            ? "Tente outro tipo de evento ou um período maior."
            : "As próximas ações relevantes deste assunto aparecerão aqui.",
        }),
      );
      resultArea.append(empty);
      return;
    }

    const timeline = createElement(document, "ol", { className: "history-timeline" });
    groupEvents(filtered).forEach((group) => {
      const event = group.events[0];
      const categoryKey = categoryForEvent(event);
      const item = createElement(document, "li", {
        className: "history-item",
        attributes: { "data-category": categoryKey },
      });
      item.append(
        createElement(document, "span", {
          className: "history-icon",
          text: EVENT_ICONS[event.eventType] ?? "•",
          attributes: { "aria-hidden": "true" },
        }),
      );

      const content = createElement(document, "div", {
        className: "history-content panel",
      });
      const contentHeader = createElement(document, "div", {
        className: "history-content-header",
      });
      const contentCopy = createElement(document, "div", {
        className: "history-content-copy",
      });
      const latest = group.events[0];
      const formatter = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
      contentCopy.append(
        createElement(document, "strong", { text: formatGroupSummary(group) }),
        createElement(document, "time", {
          text: formatter.format(new Date(latest.occurredAt)),
          attributes: { datetime: latest.occurredAt },
        }),
      );
      contentHeader.append(
        contentCopy,
        createElement(document, "span", {
          className: "history-category-badge",
          text: CATEGORY_META[categoryKey].label,
        }),
      );
      content.append(contentHeader);
      appendGroupDetails(document, content, group, formatter);

      item.append(content);
      timeline.append(item);
    });
    resultArea.append(timeline);
  }

  categoryField.select.addEventListener("change", render);
  periodField.select.addEventListener("change", render);
  render();

  container.append(inner);
}
