import "server-only";

type QuranFoundationEnvironment = "production" | "prelive";

export function getQuranFoundationConfig(env = process.env.QF_ENV) {
  const qfEnv = (env ?? "prelive") as QuranFoundationEnvironment;

  if (qfEnv !== "production" && qfEnv !== "prelive") {
    throw new Error("QF_ENV must be either production or prelive.");
  }

  return qfEnv === "production"
    ? {
        authBaseUrl: "https://oauth2.quran.foundation",
        apiBaseUrl: "https://apis.quran.foundation/content/api/v4",
      }
    : {
        authBaseUrl: "https://prelive-oauth2.quran.foundation",
        apiBaseUrl: "https://apis-prelive.quran.foundation/content/api/v4",
      };
}

export function getQuranFoundationCredentials() {
  const clientId = process.env.QF_CLIENT_ID;
  const clientSecret = process.env.QF_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing server-only Quran Foundation credentials.");
  }

  return { clientId, clientSecret };
}
