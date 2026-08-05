import { createElement } from "../../utils/dom.js";

function createList(document, items, emptyText) {
  if (!items.length) {
    return createElement(document, "p", {
      className: "flow-help-empty",
      text: emptyText,
    });
  }
  const list = createElement(document, "ul", { className: "flow-help-list" });
  items.forEach((item) => {
    list.append(createElement(document, "li", { text: item }));
  });
  return list;
}

export function openFlowStageHelpModal({
  document,
  stage,
  onAction,
  onClose = () => {},
}) {
  const dialog = createElement(document, "dialog", {
    className: "modal flow-help-modal",
  });
  const card = createElement(document, "div", {
    className: "modal-card flow-help-card",
  });
  const header = createElement(document, "header", { className: "modal-header" });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", { className: "eyebrow", text: "Roteiro para consolidar" }),
    createElement(document, "h2", { text: stage.label }),
    createElement(document, "p", {
      className: "modal-description",
      text: stage.description,
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: { type: "button", "aria-label": "Fechar explicação" },
  });
  header.append(copy, closeButton);

  const body = createElement(document, "div", {
    className: "modal-body flow-help-body",
  });
  const score = createElement(document, "section", {
    className: `flow-help-score ${stage.complete ? "complete" : ""}`,
  });
  score.append(
    createElement(document, "strong", {
      text: `${stage.activePoints}/${stage.cap} pontos`,
    }),
    createElement(document, "span", {
      text: stage.complete ? "Etapa concluída" : "Etapa em construção",
    }),
  );

  const evidence = createElement(document, "section", {
    className: "flow-help-section",
  });
  evidence.append(
    createElement(document, "h3", { text: "Evidências já conquistadas" }),
    createList(document, stage.evidence, "Nenhuma evidência foi conquistada ainda."),
  );

  const missing = createElement(document, "section", {
    className: "flow-help-section",
  });
  missing.append(
    createElement(document, "h3", { text: "O que ainda falta" }),
    createList(document, stage.missing, "Nada falta nesta etapa."),
  );

  if (!stage.canBecomeCurrent && stage.blockedReason) {
    body.append(
      createElement(document, "p", {
        className: "flow-help-warning",
        text: stage.blockedReason,
      }),
    );
  }
  body.prepend(score);
  body.append(evidence, missing);

  const footer = createElement(document, "footer", { className: "modal-footer" });
  const closeFooterButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Fechar",
    attributes: { type: "button" },
  });
  footer.append(closeFooterButton);

  if (stage.action && onAction && stage.action.type !== "open_stage_help") {
    const actionButton = createElement(document, "button", {
      className: "button button-primary",
      text: stage.action.label,
      attributes: { type: "button" },
    });
    actionButton.addEventListener("click", () => {
      onAction(stage.action);
      close();
    });
    footer.append(actionButton);
  }

  card.append(header, body, footer);
  dialog.append(card);
  document.body.append(dialog);

  function close() {
    if (dialog.open) {
      dialog.close();
    } else {
      dialog.remove();
      onClose();
    }
  }

  closeButton.addEventListener("click", close);
  closeFooterButton.addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    dialog.remove();
    onClose();
  });

  dialog.showModal();
  closeFooterButton.focus();
  return dialog;
}
