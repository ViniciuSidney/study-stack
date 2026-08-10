import {
  clearElement,
  createElement,
} from "../../utils/dom.js";

const ARCHIVE_SOURCE_PRESENTATIONS = Object.freeze({
  assunto: Object.freeze({ article: "O", label: "Assunto", archived: "arquivado" }),
  tema: Object.freeze({ article: "O", label: "Tema", archived: "arquivado" }),
  materia: Object.freeze({ article: "A", label: "Matéria", archived: "arquivada" }),
});

export function renderSourceSubjectState({
  document,
  container,
  status,
  subjectName,
  archiveSource = null,
  conceptCompassUrl,
}) {
  clearElement(container);

  const archived = status === "archived";
  const sourcePresentation = ARCHIVE_SOURCE_PRESENTATIONS[archiveSource] ?? {
    article: "O",
    label: "conteúdo",
    archived: "arquivado",
  };

  const inner = createElement(document, "div", {
    className: "content-inner missing-context-layout source-subject-state",
  });
  const panel = createElement(document, "section", {
    className:
      "panel missing-context-panel " +
      `source-subject-state--${archived ? "archived" : "deleted"}`,
    attributes: {
      "aria-labelledby": "sourceSubjectStateTitle",
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

  if (archived) {
    copy.append(
      createElement(document, "p", {
        className: "eyebrow",
        text: "Vínculo com o Concept Compass",
      }),
      createElement(document, "h2", {
        text: "Estudo arquivado",
        attributes: { id: "sourceSubjectStateTitle" },
      }),
      createElement(document, "p", {
        className: "missing-context-lead",
        text: subjectName
          ? `“${subjectName}” continua preservado no Study Stack.`
          : "Este estudo continua preservado no Study Stack.",
      }),
      createElement(document, "p", {
        text:
          `${sourcePresentation.article} ${sourcePresentation.label} responsável ` +
          `está ${sourcePresentation.archived} no Concept Compass. ` +
          "Criação, edição e mudança de etapa ficam bloqueadas até a restauração.",
      }),
    );
  } else {
    copy.append(
      createElement(document, "p", {
        className: "eyebrow",
        text: "Sem vínculo com o Concept Compass",
      }),
      createElement(document, "h2", {
        text: "Assunto não disponível",
        attributes: { id: "sourceSubjectStateTitle" },
      }),
      createElement(document, "p", {
        className: "missing-context-lead",
        text: subjectName
          ? `“${subjectName}” não está mais disponível no Concept Compass.`
          : "Este Assunto não está mais disponível no Concept Compass.",
      }),
      createElement(document, "p", {
        text:
          "Quando a exclusão é permanente, os dados vinculados são removidos do " +
          "Study Stack pelo protocolo de exclusão integrada.",
      }),
    );
  }

  const action = createElement(document, "a", {
    className: "button button-primary missing-context-action",
    text: archived
      ? "Voltar e restaurar no Concept Compass"
      : "Voltar ao Concept Compass",
    attributes: {
      href: conceptCompassUrl,
      target: "_blank",
      rel: "noopener noreferrer",
      title: archived
        ? "Abrir o local de origem no Concept Compass para restaurar o conteúdo"
        : "Abrir o Concept Compass para escolher outro Assunto",
      "data-return-state": archived ? "archived" : "deleted",
      "aria-label": archived
        ? "Voltar ao local de origem no Concept Compass para restaurar o conteúdo"
        : "Voltar ao Concept Compass para escolher outro Assunto",
    },
  });

  panel.append(icon, copy, action);
  if (!archived) {
    panel.append(
      createElement(document, "p", {
        className: "missing-context-note",
        text: "Escolha outro Assunto no Concept Compass para continuar estudando.",
        attributes: { role: "note" },
      }),
    );
  }
  inner.append(panel);
  container.append(inner);
}
