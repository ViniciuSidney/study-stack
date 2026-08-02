import {
  clearElement,
  createElement,
} from "../../utils/dom.js";

function formatDateTime(value) {
  if (!value) {
    return "Ainda não registrado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function appendStatusRow(document, list, label, value) {
  const row = createElement(document, "li");
  row.append(
    createElement(document, "span", { text: label }),
    createElement(document, "strong", { text: String(value) }),
  );
  list.append(row);
}

export function renderOverviewSection({
  document,
  container,
  context,
  subject,
  storageInfo,
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
      text: "Fundação 02",
    }),
    createElement(document, "h2", { text: "Visão Geral" }),
    createElement(document, "p", {
      className: "section-description",
      text:
        "O contexto do Concept Compass agora é validado, convertido em " +
        "Subject e persistido em um estado central versionado.",
    }),
  );
  header.append(headerCopy);

  const grid = createElement(document, "section", {
    className: "foundation-grid",
  });

  const subjectPanel = createElement(document, "article", {
    className: "panel foundation-panel",
  });
  subjectPanel.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Subject persistido",
    }),
    createElement(document, "h3", { text: subject.subjectName }),
    createElement(document, "p", {
      text: `${subject.matterName} › ${subject.themeName}`,
    }),
  );

  const subjectStatus = createElement(document, "ul", {
    className: "status-list",
  });
  appendStatusRow(document, subjectStatus, "ID do assunto", subject.id);
  appendStatusRow(document, subjectStatus, "ID do tema", subject.themeId);
  appendStatusRow(document, subjectStatus, "Contrato", subject.sourceContractVersion);
  appendStatusRow(document, subjectStatus, "Origem", subject.sourceApp);
  appendStatusRow(
    document,
    subjectStatus,
    "Primeira abertura",
    formatDateTime(subject.createdAt),
  );
  subjectPanel.append(subjectStatus);

  const storagePanel = createElement(document, "aside", {
    className: "panel foundation-panel",
  });
  storagePanel.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Armazenamento",
    }),
    createElement(document, "h3", { text: "Estado v1 inicializado" }),
    createElement(document, "p", {
      text:
        "As coleções estão vazias e prontas para receber registros reais " +
        "sem misturar domínio, interface e localStorage.",
    }),
  );

  const storageStatus = createElement(document, "ul", {
    className: "status-list",
  });
  appendStatusRow(document, storageStatus, "Schema", storageInfo.schemaVersion);
  appendStatusRow(document, storageStatus, "Integridade", storageInfo.integrityStatus);
  appendStatusRow(document, storageStatus, "Assuntos", storageInfo.subjectCount);
  appendStatusRow(document, storageStatus, "Eventos", storageInfo.historyCount);
  appendStatusRow(
    document,
    storageStatus,
    "Última gravação",
    formatDateTime(storageInfo.updatedAt),
  );
  storagePanel.append(storageStatus);

  const key = createElement(document, "div", {
    className: "code-block",
    text: storageInfo.storageKey,
  });
  storagePanel.append(key);

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
  storagePanel.append(actionRow);

  const checklistPanel = createElement(document, "article", {
    className: "panel foundation-panel foundation-wide",
  });
  checklistPanel.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Marco concluído",
    }),
    createElement(document, "h3", {
      text: "Schema, repositório e contexto real",
    }),
  );
  const list = createElement(document, "ul", {
    className: "foundation-list",
  });
  [
    "Estado raiz versionado e validado antes de cada gravação.",
    "Coleções normalizadas e indexadas por identificadores permanentes.",
    "Subject criado uma única vez e sincronizado sem apagar dados internos.",
    "Preferências incorporadas à coleção global de configurações.",
    "Contrato Concept Compass 1.0.0 validado antes da persistência.",
    "Estrutura de migração preparada para versões futuras.",
  ].forEach((text) => {
    list.append(createElement(document, "li", { text }));
  });
  checklistPanel.append(list);

  const sourcePanel = createElement(document, "article", {
    className: "panel foundation-panel foundation-wide",
  });
  sourcePanel.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Contexto desta abertura",
    }),
    createElement(document, "h3", { text: context.source }),
    createElement(document, "p", {
      text: `Recebido em ${formatDateTime(context.sentAt)} e vinculado pelo ID ${context.subjectId}.`,
    }),
  );

  grid.append(subjectPanel, storagePanel, checklistPanel, sourcePanel);
  inner.append(header, grid);
  container.append(inner);
}
