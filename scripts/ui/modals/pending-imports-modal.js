import { createElement } from "../../utils/dom.js";

const STATUS_PRESENTATION = Object.freeze({
  needs_review: {
    label: "Reimportação divergente",
    guidance:
      "Já existe uma lista com o mesmo ID e conteúdo diferente. A lista atual foi mantida. Para conservar as duas, gere a nova sessão no Test Quest com outro ID; caso contrário, descarte esta pendência.",
  },
  pending_link: {
    label: "Vínculo de assunto pendente",
    guidance:
      "O resultado pertence a outro assunto ou a um assunto ainda não disponível. Abra o assunto correto antes de importar novamente.",
  },
  invalid: {
    label: "Arquivo inválido",
    guidance:
      "O contrato ou o conteúdo não pôde ser validado. Corrija ou exporte novamente o resultado no Test Quest antes de tentar outra importação.",
  },
});

function getStatusPresentation(status) {
  return STATUS_PRESENTATION[status] ?? {
    label: String(status ?? "pendente").replaceAll("_", " "),
    guidance:
      "Confira o motivo registrado. Nenhuma pendência é aplicada automaticamente.",
  };
}

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
      text:
        "Revisar uma pendência significa conferir o motivo e decidir o que fazer. Nenhum resultado pendente é aplicado automaticamente.",
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
      const presentation = getStatusPresentation(entry.status);
      const item = createElement(document, "article", {
        className: `pending-import-item pending-${entry.status}`,
      });
      const heading = createElement(document, "div", { className: "pending-import-heading" });
      heading.append(
        createElement(document, "div"),
        createElement(document, "span", { text: presentation.label }),
      );
      heading.firstElementChild.append(
        createElement(document, "strong", { text: entry.sourceId || "Origem desconhecida" }),
        createElement(document, "small", { text: formatDate(entry.receivedAt) }),
      );
      const issues = createElement(document, "ul");
      entry.validationIssues.forEach((issue) => {
        issues.append(createElement(document, "li", { text: issue }));
      });
      const guidance = createElement(document, "p", {
        className: "pending-import-guidance",
        text: presentation.guidance,
      });
      const actions = createElement(document, "div", { className: "action-row" });
      const dismissButton = createElement(document, "button", {
        className: "button button-quiet-danger",
        text:
          entry.status === "needs_review"
            ? "Manter lista atual e descartar pendência"
            : "Descartar pendência",
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
      item.append(heading, issues, guidance, actions);
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
