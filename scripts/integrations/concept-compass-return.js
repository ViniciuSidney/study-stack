import { ConceptCompassAdapter } from "./concept-compass-adapter.js";

export function createConceptCompassReturnHandler({
  window,
  shell,
  getContext,
  config,
}) {
  return () => {
    const context = getContext?.() ?? null;
    const returnUrl = ConceptCompassAdapter.getReturnUrl(context, config);

    if (!returnUrl) {
      shell.showToast(
        "Nenhum endereço seguro de retorno foi encontrado.",
        "warning",
      );
      return false;
    }

    if (context?.source === "development-fixture") {
      shell.showToast("Retorno simulado no contexto de desenvolvimento.");
      return false;
    }

    window.location.assign(returnUrl);
    return true;
  };
}
