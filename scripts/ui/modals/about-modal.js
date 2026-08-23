import { createElement } from "../../utils/dom.js";

function createFact(document, label, value) {
  const item = createElement(document, "div", { className: "about-fact" });
  item.append(
    createElement(document, "span", { text: label }),
    createElement(document, "strong", { text: value }),
  );
  return item;
}

function createIntegrationRow(document, { name, description, status, planned = false }) {
  const row = createElement(document, "div", {
    className: `about-integration${planned ? " about-integration-planned" : ""}`,
  });
  const copy = createElement(document, "div", { className: "about-integration-copy" });
  copy.append(
    createElement(document, "strong", { text: name }),
    createElement(document, "span", { text: description }),
  );
  row.append(
    copy,
    createElement(document, "span", {
      className: `about-integration-status${planned ? " planned" : ""}`,
      text: status,
    }),
  );
  return row;
}

export function openAboutModal({ document, config, onClose = () => {} }) {
  const dialog = createElement(document, "dialog", {
    className: "modal about-modal",
  });
  const card = createElement(document, "div", {
    className: "modal-card about-card",
  });
  const header = createElement(document, "header", { className: "modal-header" });
  const headerCopy = createElement(document, "div");
  headerCopy.append(
    createElement(document, "p", { className: "eyebrow", text: "Aplicação" }),
    createElement(document, "h2", { text: "Sobre o Study Stack" }),
  );
  header.append(headerCopy);

  const body = createElement(document, "div", {
    className: "modal-body about-body",
  });
  body.append(
    createElement(document, "p", {
      className: "about-lead",
      text: "Um caderno conectado para organizar estudo, prática, erros e progresso por Assunto.",
    }),
  );

  const facts = createElement(document, "div", { className: "about-facts" });
  facts.append(
    createFact(document, "Versão", `v${config.appVersion}`),
    createFact(document, "Versão dos dados", config.storage.schemaVersion),
    createFact(document, "Armazenamento", "Local neste navegador"),
  );
  body.append(facts);

  const integrationSection = createElement(document, "section", {
    className: "about-section",
  });
  integrationSection.append(
    createElement(document, "h3", { text: "Integrações" }),
    createElement(document, "p", {
      text: "Aplicações conectadas ao fluxo de estudos do Study Stack.",
    }),
  );
  const integrationList = createElement(document, "div", {
    className: "about-integration-list",
  });
  integrationList.append(
    createIntegrationRow(document, {
      name: "Concept Compass",
      description: "Contexto de matérias, temas e assuntos.",
      status: "Integrado",
    }),
    createIntegrationRow(document, {
      name: "Test Quest",
      description: "Listas, questões e resultados de exercícios.",
      status: "Integrado",
    }),
    createIntegrationRow(document, {
      name: "FlashCore",
      description: "Flashcards e revisões, integração prevista para versões futuras.",
      status: "Planejado",
      planned: true,
    }),
  );
  integrationSection.append(integrationList);
  body.append(integrationSection);

  const details = createElement(document, "details", {
    className: "about-technical",
  });
  details.append(
    createElement(document, "summary", { text: "Detalhes técnicos" }),
  );
  const technicalContent = createElement(document, "div", {
    className: "about-technical-content",
  });
  const conceptContracts = config.integration.conceptCompassContractVersions.join(", ");
  const testQuestContracts = config.integration.testQuestContractVersions.join(", ");
  technicalContent.append(
    createFact(
      document,
      "Chave local",
      `${config.storageNamespace}:${config.storage.stateKey}`,
    ),
    createFact(document, "Concept Compass", `contrato ${conceptContracts}`),
    createFact(
      document,
      "Test Quest",
      `resultados ${testQuestContracts} · contexto ${config.integration.testQuestContextContractVersion}`,
    ),
  );
  details.append(technicalContent);
  body.append(details);

  const footer = createElement(document, "footer", { className: "modal-footer" });
  const closeButton = createElement(document, "button", {
    className: "button button-primary",
    text: "Fechar",
    attributes: { type: "button" },
  });
  footer.append(closeButton);
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
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    dialog.remove();
    onClose();
  });

  dialog.showModal();
  closeButton.focus();
  return dialog;
}
