import { sanitizeRichHtml } from "../../domain/rich-content.js";
import { createElement } from "../../utils/dom.js";

const TOOLBAR_ACTIONS = Object.freeze([
  { label: "Texto", title: "Parágrafo", command: "formatBlock", value: "p" },
  { label: "H2", title: "Título de seção", command: "formatBlock", value: "h2" },
  { label: "H3", title: "Subtítulo", command: "formatBlock", value: "h3" },
  { label: "B", title: "Negrito", command: "bold" },
  { label: "I", title: "Itálico", command: "italic" },
  { label: "U", title: "Sublinhado", command: "underline" },
  { label: "• Lista", title: "Lista com marcadores", command: "insertUnorderedList" },
  { label: "1. Lista", title: "Lista numerada", command: "insertOrderedList" },
  { label: "❝", title: "Citação", command: "formatBlock", value: "blockquote" },
]);

function executeCommand(document, editor, command, value = null) {
  editor.focus();

  if (typeof document.execCommand === "function") {
    document.execCommand(command, false, value);
  }
}


function applyHighlight(document, editor) {
  const selection = document.getSelection?.();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return false;
  }

  const range = selection.getRangeAt(0);
  const commonAncestor =
    range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;

  if (!commonAncestor || !editor.contains(commonAncestor)) {
    return false;
  }

  const mark = document.createElement("mark");

  try {
    range.surroundContents(mark);
  } catch {
    const fragment = range.extractContents();
    mark.append(fragment);
    range.insertNode(mark);
  }

  selection.removeAllRanges();
  const nextRange = document.createRange();
  nextRange.selectNodeContents(mark);
  selection.addRange(nextRange);
  return true;
}

function insertTable(document, editor) {
  const table =
    "<table><tbody><tr><th>Cabeçalho 1</th><th>Cabeçalho 2</th></tr>" +
    "<tr><td>Conteúdo</td><td>Conteúdo</td></tr></tbody></table><p><br></p>";
  executeCommand(document, editor, "insertHTML", table);
}

export function createRichTextEditor({
  document,
  label,
  value = null,
  placeholder = "Escreva aqui...",
  compact = false,
  required = false,
  onInput = () => {},
}) {
  const root = createElement(document, "section", {
    className: `rich-editor-field${compact ? " compact" : ""}`,
  });
  const heading = createElement(document, "div", {
    className: "rich-editor-heading",
  });
  heading.append(
    createElement(document, "strong", {
      text: required ? `${label} *` : label,
    }),
    createElement(document, "span", {
      text: required ? "Obrigatório para concluir" : "Opcional",
    }),
  );

  const toolbar = createElement(document, "div", {
    className: "rich-editor-toolbar",
    attributes: { role: "toolbar", "aria-label": `Formatação de ${label}` },
  });
  const editor = createElement(document, "div", {
    className: "rich-editor-surface",
    attributes: {
      contenteditable: "true",
      role: "textbox",
      "aria-multiline": "true",
      "aria-label": label,
      "data-placeholder": placeholder,
      spellcheck: "true",
    },
  });

  for (const action of TOOLBAR_ACTIONS) {
    const button = createElement(document, "button", {
      className: "rich-editor-button",
      text: action.label,
      attributes: {
        type: "button",
        title: action.title,
        "aria-label": action.title,
      },
    });
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      executeCommand(document, editor, action.command, action.value ?? null);
      onInput();
    });
    toolbar.append(button);
  }

  const tableButton = createElement(document, "button", {
    className: "rich-editor-button",
    text: "▦",
    attributes: {
      type: "button",
      title: "Inserir tabela simples",
      "aria-label": "Inserir tabela simples",
    },
  });
  tableButton.addEventListener("mousedown", (event) => event.preventDefault());
  tableButton.addEventListener("click", () => {
    insertTable(document, editor);
    onInput();
  });

  const clearButton = createElement(document, "button", {
    className: "rich-editor-button",
    text: "Limpar formato",
    attributes: {
      type: "button",
      title: "Remover formatação da seleção",
    },
  });
  clearButton.addEventListener("mousedown", (event) => event.preventDefault());
  clearButton.addEventListener("click", () => {
    executeCommand(document, editor, "removeFormat");
    onInput();
  });
  const highlightButton = createElement(document, "button", {
    className: "rich-editor-button",
    text: "Marca-texto",
    attributes: {
      type: "button",
      title: "Destacar o texto selecionado",
      "aria-label": "Destacar o texto selecionado",
    },
  });
  highlightButton.addEventListener("mousedown", (event) => event.preventDefault());
  highlightButton.addEventListener("click", () => {
    editor.focus();
    if (applyHighlight(document, editor)) {
      onInput();
    }
  });

  toolbar.append(tableButton, highlightButton, clearButton);

  editor.innerHTML = sanitizeRichHtml(value?.content ?? "");
  editor.addEventListener("input", onInput);
  editor.addEventListener("paste", (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") ?? "";
    executeCommand(document, editor, "insertText", text);
    onInput();
  });

  root.append(heading, toolbar, editor);

  return Object.freeze({
    root,
    editor,
    getValue() {
      return {
        content: sanitizeRichHtml(editor.innerHTML),
        plainText: editor.innerText.trim(),
      };
    },
    setValue(nextValue) {
      editor.innerHTML = sanitizeRichHtml(nextValue?.content ?? "");
    },
    focus() {
      editor.focus();
    },
  });
}
