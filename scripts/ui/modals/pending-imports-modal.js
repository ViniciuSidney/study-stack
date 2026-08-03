import { createElement } from "../../utils/dom.js";

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function openPendingImportsModal({
  document,
  entries,
  onDismiss,
  onClose = () => {},
}) {
  const dialog = createElement(document, "dialog", {
    className: "modal pending-imports-modal",
  });
  const card = createElement(document, "div", {
    className: "modal-card pending-imports-card",
  });
  const header = createElement(document, "header", { className: "modal-header" });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", { className: "eyebrow", text: "Test Quest" }),
    createElement(document, "h2", { text: "Importações pendentes" }),
    createElement(document, "p", {
      className: "modal-description",
      text: "Resultados incompatíveis são preservados sem alterar as listas já existentes.",
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: { type: "button", "aria-label": "Fechar pendências" },
  });
  header.append(copy, closeButton);

  const body = createElement(document, "div", {
    className: "modal-body pending-imports-body",
  });
  const list = createElement(document, "div", { className: "pending-import-list" });

  if (!entries.length) {
    list.append(
      createElement(document, "p", {
        className: "empty-inline",
        text: "Nenhuma importação aguarda revisão.",
      }),
    );
  } else {
    entries.forEach((entry) => {
      const item = createElement(document, "article", {
        className: `pending-import-item pending-${entry.status}`,
      });
      const heading = createElement(document, "div", { className: "pending-import-heading" });
      heading.append(
        createElement(document, "div"),
        createElement(document, "span", { text: entry.status.replaceAll("_", " ") }),
      );
      heading.firstElementChild.append(
        createElement(document, "strong", { text: entry.sourceId || "Origem desconhecida" }),
        createElement(document, "small", { text: formatDate(entry.receivedAt) }),
      );
      const issues = createElement(document, "ul");
      entry.validationIssues.forEach((issue) => {
        issues.append(createElement(document, "li", { text: issue }));
      });
      const actions = createElement(document, "div", { className: "action-row" });
      const dismissButton = createElement(document, "button", {
        className: "button button-quiet-danger",
        text: "Descartar pendência",
        attributes: { type: "button" },
      });
      dismissButton.addEventListener("click", () => {
        onDismiss(entry.id);
        item.remove();
        if (!list.children.length) {
          list.append(
            createElement(document, "p", {
              className: "empty-inline",
              text: "Nenhuma importação aguarda revisão.",
            }),
          );
        }
      });
      actions.append(dismissButton);
      item.append(heading, issues, actions);
      list.append(item);
    });
  }
  body.append(list);

  const footer = createElement(document, "footer", { className: "modal-footer" });
  const doneButton = createElement(document, "button", {
    className: "button button-primary",
    text: "Concluir",
    attributes: { type: "button" },
  });
  footer.append(doneButton);
  card.append(header, body, footer);
  dialog.append(card);
  document.body.append(dialog);

  function close() {
    if (dialog.open) dialog.close();
  }
  closeButton.addEventListener("click", close);
  doneButton.addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    dialog.remove();
    onClose();
  });
  dialog.showModal();
  doneButton.focus();
  return dialog;
}
