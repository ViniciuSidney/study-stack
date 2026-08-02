import { clearElement, createElement } from "../../utils/dom.js";

const EVENT_ICONS = Object.freeze({
  created: "+",
  edited: "✎",
  status_changed: "↻",
  marked_important: "★",
  unmarked_important: "☆",
  archived: "□",
  restored: "↩",
});

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
      text:
        "Eventos funcionais são preservados sem copiar versões integrais do conteúdo textual.",
    }),
  );
  header.append(copy);
  inner.append(header);

  const timeline = createElement(document, "ol", { className: "history-timeline" });
  events.forEach((event) => {
    const item = createElement(document, "li", { className: "history-item" });
    item.append(
      createElement(document, "span", {
        className: "history-icon",
        text: EVENT_ICONS[event.eventType] ?? "•",
      }),
    );
    const content = createElement(document, "div", {
      className: "history-content panel",
    });
    content.append(
      createElement(document, "strong", { text: event.summary }),
      createElement(document, "p", {
        text: new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(event.occurredAt)),
      }),
    );
    item.append(content);
    timeline.append(item);
  });
  inner.append(timeline);
  container.append(inner);
}
