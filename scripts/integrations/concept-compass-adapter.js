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

function parseJson(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function readQueryEnvelope(location, config) {
  const params = new URLSearchParams(location.search);
  const embedded = parseJson(params.get("subjectContext"));
  const raw = embedded ?? {
    contractVersion: params.get("contractVersion"),
    sentAt: params.get("sentAt"),
    sourceApp: params.get("sourceApp"),
    subject: {
      matterId: params.get("matterId"),
      matterName: params.get("matterName") || params.get("subjectArea"),
      themeId: params.get("themeId"),
      themeName: params.get("themeName"),
      subjectId: params.get("subjectId"),
      subjectName: params.get("subjectName"),
    },
    sourceArchived: params.get("sourceArchived"),
    returnUrl: params.get("returnUrl"),
    navigationContext: parseJson(params.get("navigationContext")),
    nonce: params.get("nonce"),
  };

  return normalizeSubjectContext(
    {
      ...raw,
      returnUrl: validateReturnUrl(
        raw.returnUrl,
        location,
        config.integration.allowedReturnOrigins,
      ),
      source: embedded
        ? "concept-compass-envelope"
        : "concept-compass-query",
    },
    {
      supportedContractVersions:
        config.integration.conceptCompassContractVersions,
    },
  );
}

export class ConceptCompassAdapter {
  static resolveSubjectContext(location, config) {
    const params = new URLSearchParams(location.search);

    if (params.has("noContext")) {
      return createMissingSubjectContext(
        "A simulação de vínculo ausente foi solicitada.",
      );
    }

    const queryContext = readQueryEnvelope(location, config);

    if (queryContext.valid) {
      return queryContext;
    }

    const useDevelopmentContext =
      params.has("dev") ||
      (isLocalDevelopment(location) &&
        !params.has("strictContext"));

    if (useDevelopmentContext) {
      return normalizeSubjectContext(
        {
          ...config.developmentSubject,
          source: "development-fixture",
        },
        {
          supportedContractVersions:
            config.integration.conceptCompassContractVersions,
        },
      );
    }

    return Object.freeze({
      ...queryContext,
      source: "invalid-concept-compass-context",
      errors: Object.freeze(
        queryContext.errors.length
          ? queryContext.errors
          : [
              "Abra o Study Stack a partir de um assunto válido do Concept Compass.",
            ],
      ),
    });
  }

  static getReturnUrl(context, config) {
    return (
      context?.returnUrl || config.integration.conceptCompassFallbackUrl || ""
    );
  }
}
