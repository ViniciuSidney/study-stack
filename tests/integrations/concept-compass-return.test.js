import test from "node:test";
import assert from "node:assert/strict";
import { createConceptCompassReturnHandler } from "../../scripts/integrations/concept-compass-return.js";

function createShell() {
  const toasts = [];
  return {
    toasts,
    showToast(message, type = "success") {
      toasts.push({ message, type });
    },
  };
}

const config = Object.freeze({
  integration: {
    conceptCompassFallbackUrl: "https://example.test/concept-compass/",
  },
});

test("retorno ao Concept Compass navega na aba atual", () => {
  const assigned = [];
  const shell = createShell();
  const context = {
    source: "concept-compass-query",
    returnUrl: "https://example.test/concept-compass/#/materias/m1?tema=t1&assunto=a1",
  };
  const handler = createConceptCompassReturnHandler({
    window: {
      location: {
        assign(url) {
          assigned.push(url);
        },
      },
    },
    shell,
    getContext: () => context,
    config,
  });

  assert.equal(handler(), true);
  assert.deepEqual(assigned, [context.returnUrl]);
  assert.deepEqual(shell.toasts, []);
});

test("retorno de fixture de desenvolvimento continua apenas simulado", () => {
  const assigned = [];
  const shell = createShell();
  const handler = createConceptCompassReturnHandler({
    window: {
      location: {
        assign(url) {
          assigned.push(url);
        },
      },
    },
    shell,
    getContext: () => ({
      source: "development-fixture",
      returnUrl: "https://example.test/concept-compass/",
    }),
    config,
  });

  assert.equal(handler(), false);
  assert.deepEqual(assigned, []);
  assert.deepEqual(shell.toasts, [
    {
      message: "Retorno simulado no contexto de desenvolvimento.",
      type: "success",
    },
  ]);
});

test("retorno sem endereço seguro informa o usuário", () => {
  const shell = createShell();
  const handler = createConceptCompassReturnHandler({
    window: { location: { assign() {} } },
    shell,
    getContext: () => ({ source: "concept-compass-query", returnUrl: "" }),
    config: { integration: { conceptCompassFallbackUrl: "" } },
  });

  assert.equal(handler(), false);
  assert.deepEqual(shell.toasts, [
    {
      message: "Nenhum endereço seguro de retorno foi encontrado.",
      type: "warning",
    },
  ]);
});
