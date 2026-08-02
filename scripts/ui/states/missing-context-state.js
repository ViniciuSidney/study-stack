import {
  clearElement,
  createElement,
} from "../../utils/dom.js";

export function renderMissingContextState({
  document,
  container,
  context,
  onOpenDevelopmentContext,
  onOpenSettings,
}) {
  clearElement(container);

  const inner = createElement(document, "div", {
    className: "content-inner",
  });

  const header = createElement(document, "header", {
    className: "section-header",
  });
  const headerCopy = createElement(document, "div");
  headerCopy.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Vínculo ausente",
    }),
    createElement(document, "h2", {
      text: "Nenhum assunto válido foi recebido",
    }),
    createElement(document, "p", {
      className: "section-description",
      text:
        "O Study Stack não cria assuntos isolados. Abra um assunto no " +
        "Concept Compass e use a ação Abrir no Study Stack.",
    }),
  );
  header.append(headerCopy);

  const panel = createElement(document, "section", {
    className: "panel missing-context-panel",
  });
  panel.append(
    createElement(document, "div", {
      className: "placeholder-icon",
      text: "!",
      attributes: { "aria-hidden": "true" },
    }),
    createElement(document, "h3", { text: "Contexto obrigatório" }),
    createElement(document, "p", {
      text: context.errors.join(" "),
    }),
  );

  const code = createElement(document, "div", {
    className: "code-block",
    text:
      "?subjectId=...&subjectName=...&themeName=...&subjectArea=..." +
      "#/overview",
  });

  const actions = createElement(document, "div", {
    className: "action-row",
  });
  const devButton = createElement(document, "button", {
    className: "button button-primary",
    text: "Usar contexto de desenvolvimento",
    attributes: { type: "button" },
  });
  const settingsButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Abrir Configurações",
    attributes: { type: "button" },
  });

  devButton.addEventListener("click", onOpenDevelopmentContext);
  settingsButton.addEventListener("click", onOpenSettings);

  actions.append(devButton, settingsButton);
  panel.append(code, actions);
  inner.append(header, panel);
  container.append(inner);
}
