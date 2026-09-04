import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "../../scripts/utils/dom.js";

function createFakeDocument() {
  const elementsById = new Map();

  return {
    createElement(tagName) {
      const attributes = new Map();
      return {
        tagName: String(tagName).toUpperCase(),
        className: "",
        textContent: "",
        setAttribute(name, value) {
          const normalized = String(value);
          attributes.set(name, normalized);
          if (name === "id") {
            elementsById.set(normalized, this);
          }
        },
        getAttribute(name) {
          return attributes.get(name) ?? null;
        },
        append() {},
      };
    },
    getElementById(id) {
      return elementsById.get(id) ?? null;
    },
  };
}

test("campos dinâmicos sem id ou name recebem id único", () => {
  const document = createFakeDocument();

  const input = createElement(document, "input");
  const select = createElement(document, "select");
  const textarea = createElement(document, "textarea");

  assert.equal(input.getAttribute("id"), "study-stack-field-1");
  assert.equal(select.getAttribute("id"), "study-stack-field-2");
  assert.equal(textarea.getAttribute("id"), "study-stack-field-3");
});

test("campos que já possuem id ou name são preservados", () => {
  const document = createFakeDocument();

  const named = createElement(document, "input", {
    attributes: { name: "recordSearch" },
  });
  const identified = createElement(document, "textarea", {
    attributes: { id: "personalNotes" },
  });

  assert.equal(named.getAttribute("name"), "recordSearch");
  assert.equal(named.getAttribute("id"), null);
  assert.equal(identified.getAttribute("id"), "personalNotes");
});

test("elementos que não são campos de formulário não recebem id automático", () => {
  const document = createFakeDocument();
  const button = createElement(document, "button", { text: "Salvar" });

  assert.equal(button.getAttribute("id"), null);
});
