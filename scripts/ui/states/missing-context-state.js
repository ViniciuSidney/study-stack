import {
  clearElement,
  createElement,
} from "../../utils/dom.js";

export function renderMissingContextState({
  document,
  container,
  conceptCompassUrl,
}) {
  clearElement(container);

  const inner = createElement(document, "div", {
    className: "content-inner missing-context-layout",
  });

  const panel = createElement(document, "section", {
    className: "panel missing-context-panel",
    attributes: {
      "aria-labelledby": "missingContextTitle",
    },
  });

  const icon = createElement(document, "img", {
    className: "missing-context-icon",
    attributes: {
      src: "assets/icons/app-icon.svg",
      alt: "",
      width: "112",
      height: "112",
      "aria-hidden": "true",
    },
  });

  const copy = createElement(document, "div", {
    className: "missing-context-copy",
  });
  copy.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Study Stack",
    }),
    createElement(document, "h2", {
      text: "Comece pelo Concept Compass",
      attributes: { id: "missingContextTitle" },
    }),
    createElement(document, "p", {
      className: "missing-context-lead",
      text:
        "O Study Stack organiza seus resumos, exercícios, erros e progresso " +
        "dentro de um assunto específico.",
    }),
    createElement(document, "p", {
      text:
        "Abra o Concept Compass, escolha o assunto que deseja estudar e use " +
        "a opção Abrir no Study Stack.",
    }),
  );

  const action = createElement(document, "a", {
    className: "button button-primary missing-context-action",
    text: "Abrir Concept Compass",
    attributes: {
      href: conceptCompassUrl,
      "aria-label": "Abrir o Concept Compass para escolher um assunto",
    },
  });

  const note = createElement(document, "p", {
    className: "missing-context-note",
    text:
      "O acesso direto ao Study Stack não seleciona automaticamente um assunto.",
    attributes: { role: "note" },
  });

  panel.append(icon, copy, action, note);
  inner.append(panel);
  container.append(inner);
}
