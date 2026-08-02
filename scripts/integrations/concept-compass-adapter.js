import {
  createMissingSubjectContext,
  normalizeSubjectContext,
} from "../domain/subject-context.js";

function isLocalDevelopment(location) {
  return ["localhost", "127.0.0.1"].includes(location.hostname);
}

function validateReturnUrl(rawUrl, location, allowedOrigins) {
  if (!rawUrl) {
    return "";
  }

  try {
    const url = new URL(rawUrl, location.href);
    const allowed = new Set([...allowedOrigins, location.origin]);

    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }

    return allowed.has(url.origin) ? url.href : "";
  } catch {
    return "";
  }
}

function readQueryContext(location, config) {
  const params = new URLSearchParams(location.search);

  return normalizeSubjectContext({
    subjectId: params.get("subjectId"),
    subjectName: params.get("subjectName"),
    themeName: params.get("themeName"),
    subjectArea: params.get("subjectArea"),
    returnUrl: validateReturnUrl(
      params.get("returnUrl"),
      location,
      config.integration.allowedReturnOrigins,
    ),
    source: "concept-compass-query",
  });
}

export class ConceptCompassAdapter {
  static resolveSubjectContext(location, config) {
    const params = new URLSearchParams(location.search);

    if (params.has("noContext")) {
      return createMissingSubjectContext(
        "A simulação de vínculo ausente foi solicitada.",
      );
    }

    const queryContext = readQueryContext(location, config);

    if (queryContext.valid) {
      return queryContext;
    }

    const useDevelopmentContext =
      params.has("dev") ||
      (config.developmentSubject.enabledOnLocalhost &&
        isLocalDevelopment(location));

    if (useDevelopmentContext) {
      return normalizeSubjectContext({
        ...config.developmentSubject,
        source: "development-fixture",
      });
    }

    return createMissingSubjectContext(
      "Abra o Study Stack a partir de um assunto válido do Concept Compass.",
    );
  }

  static getReturnUrl(context, config) {
    return (
      context.returnUrl || config.integration.conceptCompassFallbackUrl || ""
    );
  }
}
