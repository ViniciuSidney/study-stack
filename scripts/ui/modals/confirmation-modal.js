import { createElement } from "../../utils/dom.js";

export function openConfirmationModal({
  document,
  title,
  message,
  confirmLabel = "Confirmar",
  danger = false,
  onConfirm,
  onClose = () => {},
}) {
  const dialog = createElement(document, "dialog", {
    className: "modal confirmation-modal",
  });
  const card = createElement(document, "div", {
    className: "modal-card confirmation-card",
  });
  const header = createElement(document, "header", {
    className: "modal-header",
  });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", { className: "eyebrow", text: "Confirmação" }),
    createElement(document, "h2", { text: title }),
  );
  header.append(copy);

  const body = createElement(document, "div", { className: "modal-body" });
  body.append(createElement(document, "p", { text: message }));

  const footer = createElement(document, "footer", {
    className: "modal-footer",
  });
  const cancelButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Cancelar",
    attributes: { type: "button" },
  });
  const confirmButton = createElement(document, "button", {
    className: danger ? "button button-danger" : "button button-primary",
    text: confirmLabel,
    attributes: { type: "button" },
  });
  footer.append(cancelButton, confirmButton);
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

  cancelButton.addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    dialog.remove();
    onClose();
  });
  confirmButton.addEventListener("click", () => {
    onConfirm();
    close();
  });

  dialog.showModal();
  cancelButton.focus();
  return dialog;
}
