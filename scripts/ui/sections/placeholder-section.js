import {
  clearElement,
  createElement,
} from "../../utils/dom.js";

const SECTION_COPY = Object.freeze({
  summaries: {
    eyebrow: "Base teórica",
    title: "Resumos",
    description:
      "A estrutura visual está reservada. A entidade Summary e o editor serão implementados na v0.1-A.",
    icon: "▤",
  },
  notes: {
    eyebrow: "Observações e metacognição",
    title: "Anotações",
    description:
      "A seção receberá registros livres, vínculos e o fluxo Apenas um detalhe.",
    icon: "✎",
  },
  exercises: {
    eyebrow: "Prática importada",
    title: "Exercícios",
    description:
      "As sessões reais chegarão pelo contrato do Test Quest na v0.1-B.",
    icon: "✓",
  },
  errors: {
    eyebrow: "Aprendizado pelos erros",
    title: "Erros",
    description:
      "Análise, revisão, reincidência e superação serão ativadas na v0.1-B.",
    icon: "!",
  },
  history: {
    eyebrow: "Evolução do assunto",
    title: "Histórico",
    description:
      "A linha do tempo será alimentada quando as entidades reais produzirem eventos.",
    icon: "◴",
  },
  archived: {
    eyebrow: "Recuperação",
    title: "Arquivados",
    description:
      "A área será conectada ao arquivamento reversível dos registros da v0.1-A.",
    icon: "□",
  },
});

export function renderPlaceholderSection({
  document,
  container,
  sectionId,
}) {
  clearElement(container);

  const copy = SECTION_COPY[sectionId] ?? {
    eyebrow: "Seção",
    title: "Em preparação",
    description: "Esta área ainda não foi conectada.",
    icon: "·",
  };

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
      text: copy.eyebrow,
    }),
    createElement(document, "h2", { text: copy.title }),
    createElement(document, "p", {
      className: "section-description",
      text: copy.description,
    }),
  );
  header.append(headerCopy);

  const panel = createElement(document, "section", {
    className: "panel foundation-panel",
  });
  panel.append(
    createElement(document, "div", {
      className: "placeholder-icon",
      text: copy.icon,
      attributes: { "aria-hidden": "true" },
    }),
    createElement(document, "h3", {
      text: "Estrutura preparada, domínio ainda inativo",
    }),
    createElement(document, "p", {
      text:
        "Esta tela confirma a rota e a hierarquia aprovadas sem fingir que " +
        "a funcionalidade definitiva já existe.",
    }),
  );

  inner.append(header, panel);
  container.append(inner);
}
