import {
  clearElement,
  createElement,
} from "../../utils/dom.js";

export function renderOverviewSection({
  document,
  container,
  context,
  navigate,
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
      text: "Fundação técnica",
    }),
    createElement(document, "h2", { text: "Visão Geral" }),
    createElement(document, "p", {
      className: "section-description",
      text:
        "O AppShell, as rotas e o vínculo do assunto já estão funcionando. " +
        "Os dados de estudo serão conectados nas próximas etapas da v0.1-A.",
    }),
  );
  header.append(headerCopy);

  const grid = createElement(document, "section", {
    className: "foundation-grid",
  });

  const mainPanel = createElement(document, "article", {
    className: "panel foundation-panel",
  });
  mainPanel.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Contexto recebido",
    }),
    createElement(document, "h3", { text: context.subjectName }),
    createElement(document, "p", {
      text: `${context.subjectArea} › ${context.themeName}`,
    }),
  );

  const list = createElement(document, "ul", {
    className: "foundation-list",
  });

  [
    "Contexto normalizado por subjectId.",
    "Navegação por hash sem trocar o assunto atual.",
    "Sidebar recolhível no desktop e drawer sobreposto no mobile.",
    "Tema e preferências armazenados separadamente do domínio.",
    "Estado de vínculo ausente disponível para teste.",
  ].forEach((text) => {
    list.append(createElement(document, "li", { text }));
  });

  mainPanel.append(list);

  const statusPanel = createElement(document, "aside", {
    className: "panel foundation-panel",
  });
  statusPanel.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Próximo marco",
    }),
    createElement(document, "h3", {
      text: "Domínio e armazenamento inicial",
    }),
    createElement(document, "p", {
      text:
        "A próxima evolução criará o schema v1, os repositórios e a entidade " +
        "Subject antes dos formulários reais.",
    }),
  );

  const actionRow = createElement(document, "div", {
    className: "action-row",
  });
  const settingsButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Abrir Configurações",
    attributes: { type: "button" },
  });
  settingsButton.addEventListener("click", () => navigate("settings"));
  actionRow.append(settingsButton);
  statusPanel.append(actionRow);

  grid.append(mainPanel, statusPanel);
  inner.append(header, grid);
  container.append(inner);
}
